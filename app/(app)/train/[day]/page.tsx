"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Minus, Plus, Timer, Trash2, Trophy, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ExerciseFigure } from "@/components/exercise-figure";
import { ExerciseSheet } from "@/components/exercise-sheet";
import { exerciseInfo } from "@/lib/exercise-info";
import { fetchPreviousSets, fetchSetsForWorkouts, fetchWorkouts, normalizeSet } from "@/lib/data";
import { fmtDay, fmtDuration, fmtNum } from "@/lib/format";
import { dayByKey, type Exercise } from "@/lib/routine";
import { suggestProgression } from "@/lib/progression";
import { bestSet, estimate1RM, fmtSet, lastSessionByExercise, volume } from "@/lib/strength";
import type { Workout, WorkoutSet } from "@/lib/types";

type Row = {
  set_no: number;
  id?: string;
  weight: string;
  reps: string;
  seconds: string;
  done: boolean;
};

const REST_SECONDS = 90;

export default function SessionPage() {
  const params = useParams<{ day: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { supabase, userId, today, toast } = useApp();
  const day = dayByKey(params.day);
  const workoutIdParam = search.get("w");

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  const [previous, setPrevious] = useState<Map<string, WorkoutSet[]>>(new Map());
  const [bestEver, setBestEver] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [rest, setRest] = useState<number | null>(null);
  const [howTo, setHowTo] = useState<Exercise | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const creating = useRef<Promise<Workout> | null>(null);

  // Carga la sesión (la indicada, la de hoy para este día, o ninguna todavía) y las series previas.
  useEffect(() => {
    if (!day) return;
    let cancelled = false;
    (async () => {
      try {
        let w: Workout | null = null;
        if (workoutIdParam) {
          const { data } = await supabase.from("workouts").select("*").eq("id", workoutIdParam).maybeSingle();
          w = (data as Workout | null) ?? null;
        } else {
          const todays = await fetchWorkouts(supabase, today, today);
          w = todays.find((x) => x.day_key === day.key) ?? null;
        }
        const keys = day.exercises.map((e) => e.key);
        const [sets, prev] = await Promise.all([
          w ? fetchSetsForWorkouts(supabase, [w.id]) : Promise.resolve([] as WorkoutSet[]),
          fetchPreviousSets(supabase, keys, w?.id ?? null),
        ]);
        if (cancelled) return;
        const prevMap = lastSessionByExercise(prev);
        const best = new Map<string, number>();
        for (const s of prev) {
          if (s.weight_kg != null && s.reps) {
            const v = estimate1RM(s.weight_kg, s.reps);
            if (v > (best.get(s.exercise_key) ?? 0)) best.set(s.exercise_key, v);
          }
        }
        setPrevious(prevMap);
        setBestEver(best);
        setWorkout(w);
        setNotes(w?.notes ?? "");
        setRows(buildRows(day.exercises, sets));
      } catch (e) {
        toast(`No se pudo cargar la sesión: ${(e as Error).message}`, "bad");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [day, workoutIdParam, supabase, today, toast]);

  // Reloj de la sesión y del descanso.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setRest((r) => {
        if (r == null) return r;
        if (r <= 1) {
          // Aviso al terminar el descanso (Android; iOS no vibra desde el navegador).
          if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
          return null;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const ensureWorkout = useCallback(async (): Promise<Workout> => {
    if (workout) return workout;
    if (!creating.current) {
      creating.current = (async () => {
        const { data, error } = await supabase
          .from("workouts")
          .insert({ user_id: userId, date: today, day_key: day!.key, title: day!.title })
          .select("*")
          .single();
        if (error || !data) throw error ?? new Error("Sin respuesta");
        const w = data as Workout;
        setWorkout(w);
        return w;
      })();
      creating.current.catch(() => (creating.current = null));
    }
    return creating.current;
  }, [workout, supabase, userId, today, day]);

  const saveRow = useCallback(
    async (exercise: Exercise, row: Row) => {
      try {
        const w = await ensureWorkout();
        const payload = {
          workout_id: w.id,
          user_id: userId,
          exercise_key: exercise.key,
          exercise_name: exercise.name,
          set_no: row.set_no,
          weight_kg: row.weight === "" ? null : Number(row.weight.replace(",", ".")),
          reps: exercise.unit === "reps" && row.reps !== "" ? Number(row.reps) : null,
          seconds: exercise.unit === "seconds" && row.seconds !== "" ? Number(row.seconds) : null,
          done: row.done,
        };
        const { data, error } = await supabase
          .from("workout_sets")
          .upsert(payload, { onConflict: "workout_id,exercise_key,set_no" })
          .select("*")
          .single();
        if (error || !data) throw error ?? new Error("Sin respuesta");
        const saved = normalizeSet(data);
        setRows((r) => ({
          ...r,
          [exercise.key]: r[exercise.key].map((x) => (x.set_no === row.set_no ? { ...x, id: saved.id } : x)),
        }));
      } catch (e) {
        toast(`No se pudo guardar la serie: ${(e as Error).message}`, "bad");
      }
    },
    [ensureWorkout, supabase, userId, toast],
  );

  function update(exercise: Exercise, setNo: number, patch: Partial<Row>) {
    setRows((r) => ({
      ...r,
      [exercise.key]: r[exercise.key].map((x) => (x.set_no === setNo ? { ...x, ...patch } : x)),
    }));
  }

  /** Marca la serie como hecha; si está vacía, copia lo de la última vez. */
  function toggleDone(exercise: Exercise, row: Row) {
    const prevSet = previous.get(exercise.key)?.[row.set_no - 1] ?? previous.get(exercise.key)?.at(-1);
    const next: Row = { ...row, done: !row.done };
    if (next.done) {
      if (next.weight === "" && prevSet?.weight_kg != null) next.weight = String(prevSet.weight_kg);
      if (exercise.unit === "reps" && next.reps === "" && prevSet?.reps != null) next.reps = String(prevSet.reps);
      if (exercise.unit === "seconds" && next.seconds === "" && prevSet?.seconds != null) next.seconds = String(prevSet.seconds);
      const hasValue = exercise.unit === "reps" ? next.reps !== "" : next.seconds !== "";
      if (!hasValue) {
        toast(exercise.unit === "reps" ? "Escribe las repeticiones" : "Escribe los segundos", "bad");
        return;
      }
      setRest(REST_SECONDS);
    }
    update(exercise, row.set_no, next);
    saveRow(exercise, next);
  }

  function addRow(exercise: Exercise) {
    setRows((r) => {
      const list = r[exercise.key];
      const last = list[list.length - 1];
      return { ...r, [exercise.key]: [...list, { set_no: (last?.set_no ?? 0) + 1, weight: last?.weight ?? "", reps: "", seconds: "", done: false }] };
    });
  }

  async function removeRow(exercise: Exercise, row: Row) {
    setRows((r) => ({ ...r, [exercise.key]: r[exercise.key].filter((x) => x.set_no !== row.set_no) }));
    if (row.id) {
      const { error } = await supabase.from("workout_sets").delete().eq("id", row.id);
      if (error) toast(`No se pudo borrar: ${error.message}`, "bad");
    }
  }

  async function finish() {
    if (!workout) {
      toast("Marca al menos una serie para guardar la sesión", "bad");
      return;
    }
    const finished_at = workout.finished_at ? null : new Date().toISOString();
    const { error } = await supabase.from("workouts").update({ finished_at, notes: notes.trim() || null }).eq("id", workout.id);
    if (error) return toast(`No se pudo guardar: ${error.message}`, "bad");
    setWorkout({ ...workout, finished_at, notes });
    if (finished_at) {
      toast("¡Sesión terminada! 💪");
      router.push("/train");
    }
  }

  async function changeDate(date: string) {
    if (!workout || !date || date === workout.date) return;
    const { error } = await supabase.from("workouts").update({ date }).eq("id", workout.id);
    if (error) return toast(`No se pudo cambiar la fecha: ${error.message}`, "bad");
    setWorkout({ ...workout, date });
    toast(`Sesión movida al ${fmtDay(date)}`);
  }

  async function saveNotes() {
    if (!workout || (workout.notes ?? "") === notes.trim()) return;
    await supabase.from("workouts").update({ notes: notes.trim() || null }).eq("id", workout.id);
  }

  async function deleteWorkout() {
    if (!workout || !confirm("¿Borrar esta sesión completa con todas sus series?")) return;
    const { error } = await supabase.from("workouts").delete().eq("id", workout.id);
    if (error) return toast(`No se pudo borrar: ${error.message}`, "bad");
    toast("Sesión borrada");
    router.push("/train");
  }

  const allDone = useMemo(
    () => Object.values(rows).flatMap((list) => list.filter((r) => r.done)),
    [rows],
  );
  const totalVolume = volume(
    allDone.map((r) => ({ weight_kg: r.weight === "" ? 0 : Number(r.weight.replace(",", ".")), reps: r.reps === "" ? 0 : Number(r.reps) })),
  );
  const elapsed = workout && !workout.finished_at ? Math.floor((now - new Date(workout.started_at).getTime()) / 1000) : null;
  const duration =
    workout?.finished_at ? Math.floor((new Date(workout.finished_at).getTime() - new Date(workout.started_at).getTime()) / 1000) : null;

  if (!day) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted">Ese día no existe en la rutina.</p>
        <Link href="/train" className="mt-3 inline-block text-accent">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-2 pt-1">
        <Link href="/train" className="-ml-2 rounded-full p-2 text-muted hover:bg-card" aria-label="Volver">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-sm text-muted">
            {day.label} ·{" "}
            {workout ? (
              <label className="relative inline-flex cursor-pointer items-center gap-1 underline decoration-dotted underline-offset-4">
                {fmtDay(workout.date)}
                <input
                  type="date"
                  aria-label="Cambiar la fecha de la sesión"
                  className="absolute inset-0 w-full cursor-pointer opacity-0"
                  value={workout.date}
                  max={today}
                  onChange={(e) => changeDate(e.target.value)}
                />
              </label>
            ) : (
              "hoy"
            )}
          </p>
          <h1 className="text-xl font-bold leading-tight">{day.title}</h1>
        </div>
        <div className="text-right text-xs text-muted">
          {elapsed != null && (
            <p className="flex items-center justify-end gap-1 tabular-nums">
              <Timer className="size-3.5" /> {fmtDuration(elapsed)}
            </p>
          )}
          {duration != null && <p className="text-ok">Terminado · {fmtDuration(duration)}</p>}
          <p className="tabular-nums">
            {allDone.length} series · {fmtNum(totalVolume)} kg
          </p>
        </div>
      </header>

      {day.warning && <p className="rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">{day.warning}</p>}

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Cargando…</p>
      ) : (
        <div className="space-y-3">
          {day.exercises.map((exercise, i) => {
            const list = rows[exercise.key] ?? [];
            const prev = previous.get(exercise.key) ?? [];
            const prevBest = prev.length ? bestSet(prev) : null;
            const best1rm = bestEver.get(exercise.key) ?? 0;
            const currentBest = Math.max(
              0,
              ...list
                .filter((r) => r.done && r.weight !== "" && r.reps !== "")
                .map((r) => estimate1RM(Number(r.weight.replace(",", ".")), Number(r.reps))),
            );
            const isPR = best1rm > 0 && currentBest > best1rm;
            const suggestion = suggestProgression(exercise, prev);
            return (
              <section key={`${exercise.key}-${i}`} className="card p-3.5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  {(() => {
                    const info = exerciseInfo(exercise.key);
                    return info ? (
                      <button
                        type="button"
                        aria-label="Cómo se hace"
                        onClick={() => setHowTo(exercise)}
                        className="-ml-1 flex size-14 shrink-0 items-center justify-center rounded-xl bg-bg transition active:scale-95"
                      >
                        <ExerciseFigure info={info} className="size-12" period={3200} />
                      </button>
                    ) : null;
                  })()}
                  <div className="min-w-0 flex-1">
                    <button type="button" className="text-left" onClick={() => setHowTo(exercise)}>
                      <h2 className="font-semibold leading-tight">{exercise.name}</h2>
                    </button>
                    <p className="text-xs text-muted">
                      {exercise.note ? exercise.note : `${exercise.sets} series`} × {exercise.target}
                      {exercise.perSide ? (exercise.unit === "seconds" ? " por lado" : exercise.key.includes("pierna") || exercise.key.includes("zancada") || exercise.key.includes("bulgara") || exercise.key.includes("rdl") || exercise.key.includes("hip") ? " por pierna" : " por brazo") : ""}
                    </p>
                  </div>
                  {isPR && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok/15 px-2 py-0.5 text-[11px] font-bold text-ok">
                      <Trophy className="size-3" /> Récord
                    </span>
                  )}
                </div>
                <p className="mb-2 text-xs text-muted">
                  {prev.length ? (
                    <>
                      Última vez: {prev.map((s) => fmtSet(s)).join(" · ")}
                      {prevBest && exercise.unit === "reps" && prevBest.weight_kg != null && prevBest.reps ? (
                        <> · 1RM est. {fmtNum(estimate1RM(prevBest.weight_kg, prevBest.reps), 1)} kg</>
                      ) : null}
                    </>
                  ) : (
                    "Primera vez: anota el peso que uses"
                  )}
                </p>
                {suggestion && (
                  <p className={`mb-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${suggestion.kind === "up" ? "bg-ok/10 text-ok" : suggestion.kind === "down" ? "bg-warn/10 text-warn" : "bg-accent-soft text-accent"}`}>
                    {suggestion.kind === "up" ? "↑ " : suggestion.kind === "down" ? "↓ " : "= "}
                    {suggestion.text}
                  </p>
                )}

                <div className="space-y-1.5">
                  <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem_2rem] items-center gap-1.5 px-0.5 text-[11px] text-muted">
                    <span>#</span>
                    <span className="text-center">kg</span>
                    <span className="text-center">{exercise.unit === "reps" ? "reps" : "seg"}</span>
                    <span />
                    <span />
                  </div>
                  {list.map((row) => {
                    const ph = prev[row.set_no - 1] ?? prev[prev.length - 1];
                    return (
                      <div key={row.set_no} className="grid grid-cols-[2rem_1fr_1fr_2.75rem_2rem] items-center gap-1.5">
                        <span className="text-center text-sm text-muted tabular-nums">{row.set_no}</span>
                        <input
                          className={`input-sm ${row.done ? "border-ok/40 bg-ok/5" : ""}`}
                          inputMode="decimal"
                          placeholder={ph?.weight_kg != null ? String(ph.weight_kg) : exercise.bodyweight ? "—" : "kg"}
                          value={row.weight}
                          onChange={(e) => update(exercise, row.set_no, { weight: e.target.value })}
                          onBlur={() => row.done && saveRow(exercise, { ...row })}
                        />
                        {exercise.unit === "reps" ? (
                          <input
                            className={`input-sm ${row.done ? "border-ok/40 bg-ok/5" : ""}`}
                            inputMode="numeric"
                            placeholder={ph?.reps != null ? String(ph.reps) : exercise.target}
                            value={row.reps}
                            onChange={(e) => update(exercise, row.set_no, { reps: e.target.value })}
                            onBlur={() => row.done && saveRow(exercise, { ...row })}
                          />
                        ) : (
                          <input
                            className={`input-sm ${row.done ? "border-ok/40 bg-ok/5" : ""}`}
                            inputMode="numeric"
                            placeholder={ph?.seconds != null ? String(ph.seconds) : "s"}
                            value={row.seconds}
                            onChange={(e) => update(exercise, row.set_no, { seconds: e.target.value })}
                            onBlur={() => row.done && saveRow(exercise, { ...row })}
                          />
                        )}
                        <button
                          type="button"
                          aria-label={row.done ? "Desmarcar serie" : "Serie hecha"}
                          onClick={() => toggleDone(exercise, row)}
                          className={`flex h-10 items-center justify-center rounded-lg border transition active:scale-95 ${
                            row.done ? "border-ok bg-ok text-white" : "border-line bg-card text-muted"
                          }`}
                        >
                          <Check className="size-5" strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          aria-label="Quitar serie"
                          onClick={() => removeRow(exercise, row)}
                          className="flex h-10 items-center justify-center rounded-lg text-muted/60 hover:text-bad"
                          disabled={list.length <= 1}
                        >
                          <Minus className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button type="button" className="btn-ghost mt-1.5 -ml-1 text-accent" onClick={() => addRow(exercise)}>
                  <Plus className="size-4" /> Agregar serie
                </button>
              </section>
            );
          })}

          <section className="card p-3.5">
            <label className="block">
              <span className="label">Notas de la sesión</span>
              <textarea
                className="input min-h-20"
                placeholder="Cómo te sentiste, dolores, qué subir la próxima vez…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
              />
            </label>
          </section>

          <button className="btn-primary w-full" onClick={finish} disabled={!workout}>
            {workout?.finished_at ? "Reabrir sesión" : "Terminar entrenamiento"}
          </button>
          {workout && (
            <button className="btn-ghost mx-auto flex text-bad" onClick={deleteWorkout}>
              <Trash2 className="size-4" /> Borrar sesión
            </button>
          )}
        </div>
      )}

      {howTo && <ExerciseSheet exercise={howTo} onClose={() => setHowTo(null)} />}

      {rest != null && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex w-[calc(100%-2rem)] max-w-lg items-center gap-3 rounded-2xl bg-fg px-4 py-3 text-bg shadow-xl">
          <Timer className="size-5" />
          <div className="flex-1">
            <p className="text-xs opacity-70">Descanso</p>
            <p className="text-lg font-bold tabular-nums leading-tight">{fmtDuration(rest)}</p>
          </div>
          <button className="rounded-lg px-2 py-1 text-sm font-medium opacity-80" onClick={() => setRest((r) => (r ?? 0) + 30)}>
            +30 s
          </button>
          <button className="rounded-full p-1.5 opacity-80" aria-label="Saltar descanso" onClick={() => setRest(null)}>
            <X className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function buildRows(exercises: Exercise[], sets: WorkoutSet[]) {
  const rows: Record<string, Row[]> = {};
  for (const e of exercises) {
    const mine = sets.filter((s) => s.exercise_key === e.key).sort((a, b) => a.set_no - b.set_no);
    const count = Math.max(e.sets, mine.length ? mine[mine.length - 1].set_no : 0);
    rows[e.key] = Array.from({ length: count }, (_, i) => {
      const s = mine.find((x) => x.set_no === i + 1);
      return {
        set_no: i + 1,
        id: s?.id,
        weight: s?.weight_kg != null ? String(s.weight_kg) : "",
        reps: s?.reps != null ? String(s.reps) : "",
        seconds: s?.seconds != null ? String(s.seconds) : "",
        done: s?.done ?? false,
      };
    });
  }
  return rows;
}
