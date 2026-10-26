"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Footprints, Scale } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { LineChart } from "@/components/charts";
import { CoachCard } from "@/components/coach-card";
import { Sheet } from "@/components/sheet";
import { WeightSheet } from "@/components/weight-sheet";
import { caloriesByDay, fetchExerciseHistory, fetchMeals, fetchRuns, fetchSetsForWorkouts, fetchWorkouts } from "@/lib/data";
import { fmtDay, fmtDuration, fmtKg, fmtMonth, fmtNum, fmtPace, parseIso, todayIso } from "@/lib/format";
import { bmi, bmiLabel } from "@/lib/nutrition";
import { allExercises, dayByKey } from "@/lib/routine";
import { estimate1RM, fmtSet, volume } from "@/lib/strength";
import type { Meal, Run, Workout, WorkoutSet } from "@/lib/types";

type MonthData = { workouts: Workout[]; runs: Run[]; meals: Meal[] };

export default function ProgressPage() {
  const { supabase, profile, weights, weightKg, targets, today, toast } = useApp();
  const [month, setMonth] = useState(() => {
    const d = parseIso(today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [data, setData] = useState<MonthData | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [weightSheet, setWeightSheet] = useState(false);
  const exercises = useMemo(() => allExercises(), []);
  const [exerciseKey, setExerciseKey] = useState(exercises[0].key);
  const [history, setHistory] = useState<(WorkoutSet & { date: string })[] | null>(null);

  const from = `${month.y}-${String(month.m + 1).padStart(2, "0")}-01`;
  const to = todayIso(new Date(month.y, month.m + 1, 0));

  const load = useCallback(async () => {
    try {
      const [workouts, runs, meals] = await Promise.all([
        fetchWorkouts(supabase, from, to),
        fetchRuns(supabase, from, to),
        fetchMeals(supabase, from, to),
      ]);
      setData({ workouts, runs, meals });
    } catch (e) {
      toast(`No se pudo cargar el mes: ${(e as Error).message}`, "bad");
    }
  }, [supabase, from, to, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setHistory(null);
    fetchExerciseHistory(supabase, exerciseKey).then(setHistory, (e) => toast((e as Error).message, "bad"));
  }, [supabase, exerciseKey, toast]);

  const weightPoints = useMemo(
    () =>
      [...weights]
        .reverse()
        .slice(-90)
        .map((w) => ({ x: fmtDay(w.date), y: w.weight_kg })),
    [weights],
  );
  const imc = bmi(weightKg, profile.height_cm);

  // Mejor 1RM estimado por sesión del ejercicio elegido.
  const exercisePoints = useMemo(() => {
    if (!history) return [];
    const bySession = new Map<string, { date: string; best: number; sets: (WorkoutSet & { date: string })[] }>();
    for (const s of history) {
      const entry = bySession.get(s.workout_id) ?? { date: s.date, best: 0, sets: [] };
      entry.sets.push(s);
      const score = s.weight_kg != null && s.reps ? estimate1RM(s.weight_kg, s.reps) : (s.seconds ?? 0);
      entry.best = Math.max(entry.best, score);
      bySession.set(s.workout_id, entry);
    }
    return [...bySession.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [history]);
  const selectedExercise = exercises.find((e) => e.key === exerciseKey)!;

  const calByDay = useMemo(() => caloriesByDay(data?.meals ?? []), [data]);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const firstWeekday = (new Date(month.y, month.m, 1).getDay() + 6) % 7; // lunes = 0
  const monthKm = data?.runs.reduce((s, r) => s + r.distance_km, 0) ?? 0;
  const canGoNext = month.y < parseIso(today).getFullYear() || (month.y === parseIso(today).getFullYear() && month.m < parseIso(today).getMonth());

  return (
    <div className="space-y-4">
      <h1 className="pt-1 text-2xl font-bold">Progreso</h1>

      <CoachCard />

      {/* Peso */}
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted">
            <Scale className="size-4" /> Peso corporal
          </div>
          <button className="btn-ghost text-accent" onClick={() => setWeightSheet(true)}>
            Anotar
          </button>
        </div>
        <div className="mb-2 flex items-baseline gap-3">
          <span className="text-2xl font-bold">{fmtKg(weightKg)}</span>
          {imc != null && (
            <span className="text-sm text-muted">
              IMC {fmtNum(imc, 1)} · {bmiLabel(imc)}
            </span>
          )}
          {weights.length > 1 && (
            <span className={`text-sm ${weights[0].weight_kg - weights[weights.length - 1].weight_kg <= 0 ? "text-ok" : "text-warn"}`}>
              {weights[0].weight_kg - weights[weights.length - 1].weight_kg > 0 ? "+" : ""}
              {fmtNum(weights[0].weight_kg - weights[weights.length - 1].weight_kg, 1)} kg desde {fmtDay(weights[weights.length - 1].date)}
            </span>
          )}
        </div>
        <LineChart points={weightPoints} unit=" kg" />
        {targets.tdee && (
          <p className="mt-1 text-xs text-muted">
            Gasto diario estimado {fmtNum(targets.tdee)} kcal · meta {fmtNum(targets.calories ?? 0)} kcal
          </p>
        )}
      </section>

      {/* Calendario */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button className="rounded-full p-1.5 hover:bg-bg" aria-label="Mes anterior" onClick={() => setMonth(prevMonth(month))}>
            <ChevronLeft className="size-5" />
          </button>
          <p className="font-semibold">{fmtMonth(month.y, month.m)}</p>
          <button className="rounded-full p-1.5 hover:bg-bg disabled:opacity-30" aria-label="Mes siguiente" disabled={!canGoNext} onClick={() => setMonth(nextMonth(month))}>
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
          {["L", "M", "M", "J", "V", "S", "D"].map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <span key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const iso = `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
            const w = data?.workouts.filter((x) => x.date === iso) ?? [];
            const r = data?.runs.some((x) => x.date === iso);
            const kcal = calByDay.get(iso) ?? 0;
            const future = iso > today;
            const over = targets.calories != null && kcal > targets.calories;
            return (
              <button
                key={iso}
                disabled={future}
                onClick={() => setSelectedDay(iso)}
                className={`flex aspect-square flex-col items-center justify-start gap-0.5 rounded-lg pt-1 text-xs transition ${
                  iso === today ? "bg-accent-soft font-bold text-accent" : future ? "text-muted/40" : "hover:bg-bg"
                }`}
              >
                <span className="tabular-nums">{i + 1}</span>
                <span className="flex items-center gap-0.5">
                  {w.map((x) => (
                    <span key={x.id} className="rounded-full bg-accent px-1 text-[8px] font-bold leading-3 text-accent-fg">
                      {dayByKey(x.day_key)?.label.replace("Día ", "") ?? "·"}
                    </span>
                  ))}
                  {r && <Footprints className="size-2.5 text-ok" />}
                </span>
                {kcal > 0 && <span className={`size-1.5 rounded-full ${over ? "bg-bad" : "bg-ok"}`} />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
          <span>
            <b className="text-fg">{data?.workouts.length ?? 0}</b> sesiones de pesas
          </span>
          <span>
            <b className="text-fg">{data?.runs.length ?? 0}</b> trotes · {fmtNum(monthKm, 1)} km
          </span>
          <span>
            <b className="text-fg">{calByDay.size}</b> días con comidas
          </span>
        </div>
      </section>

      {/* Ejercicio */}
      <section className="card p-4">
        <p className="mb-2 text-sm font-medium text-muted">Progreso por ejercicio</p>
        <select className="input mb-3" value={exerciseKey} onChange={(e) => setExerciseKey(e.target.value)}>
          {exercises.map((e) => (
            <option key={e.key} value={e.key}>
              {e.name}
            </option>
          ))}
        </select>
        {history == null ? (
          <p className="py-4 text-center text-sm text-muted">Cargando…</p>
        ) : (
          <>
            <p className="mb-1 text-xs text-muted">
              {selectedExercise.unit === "reps" ? "Mejor 1RM estimado por sesión (Epley)" : "Mejor tiempo por sesión"}
            </p>
            <LineChart
              points={exercisePoints.map((p) => ({ x: fmtDay(p.date), y: p.best }))}
              unit={selectedExercise.unit === "reps" ? " kg" : " s"}
            />
            {exercisePoints.length > 0 && (
              <ul className="mt-2 divide-y divide-line text-sm">
                {[...exercisePoints]
                  .reverse()
                  .slice(0, 8)
                  .map((p) => (
                    <li key={p.date + p.best} className="flex items-start justify-between gap-3 py-2">
                      <span className="shrink-0 text-muted">{fmtDay(p.date)}</span>
                      <span className="flex-1 text-right text-xs tabular-nums">
                        {p.sets
                          .sort((a, b) => a.set_no - b.set_no)
                          .map((s) => fmtSet(s))
                          .join(" · ")}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </>
        )}
      </section>

      {selectedDay && data && (
        <DaySheet
          date={selectedDay}
          workouts={data.workouts.filter((w) => w.date === selectedDay)}
          runs={data.runs.filter((r) => r.date === selectedDay)}
          meals={data.meals.filter((m) => m.date === selectedDay)}
          onClose={() => setSelectedDay(null)}
        />
      )}
      {weightSheet && <WeightSheet onClose={() => setWeightSheet(false)} />}
    </div>
  );
}

const prevMonth = (m: { y: number; m: number }) => (m.m === 0 ? { y: m.y - 1, m: 11 } : { y: m.y, m: m.m - 1 });
const nextMonth = (m: { y: number; m: number }) => (m.m === 11 ? { y: m.y + 1, m: 0 } : { y: m.y, m: m.m + 1 });

/** Detalle de un día del calendario. */
function DaySheet({
  date,
  workouts,
  runs,
  meals,
  onClose,
}: {
  date: string;
  workouts: Workout[];
  runs: Run[];
  meals: Meal[];
  onClose: () => void;
}) {
  const { supabase } = useApp();
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  useEffect(() => {
    fetchSetsForWorkouts(
      supabase,
      workouts.map((w) => w.id),
    ).then(setSets, () => setSets([]));
  }, [supabase, workouts]);
  const kcal = meals.reduce((s, m) => s + m.calories, 0);

  return (
    <Sheet title={fmtDay(date)} onClose={onClose}>
      <div className="space-y-4 text-sm">
        {workouts.length === 0 && runs.length === 0 && meals.length === 0 && <p className="text-center text-muted">Nada anotado este día</p>}
        {workouts.map((w) => {
          const mine = sets.filter((s) => s.workout_id === w.id && s.done);
          const byExercise = new Map<string, WorkoutSet[]>();
          for (const s of mine) byExercise.set(s.exercise_name, [...(byExercise.get(s.exercise_name) ?? []), s]);
          return (
            <div key={w.id}>
              <Link href={`/train/${w.day_key}?w=${w.id}`} className="flex items-center justify-between font-semibold">
                <span>
                  {dayByKey(w.day_key)?.label} · {w.title}
                </span>
                <span className="text-xs font-normal text-muted">
                  {mine.length} series · {fmtNum(volume(mine))} kg
                </span>
              </Link>
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {[...byExercise.entries()].map(([name, list]) => (
                  <li key={name} className="flex justify-between gap-2">
                    <span className="truncate">{name}</span>
                    <span className="shrink-0 tabular-nums">{list.sort((a, b) => a.set_no - b.set_no).map(fmtSet).join(" · ")}</span>
                  </li>
                ))}
              </ul>
              {w.notes && <p className="mt-1 text-xs italic text-muted">“{w.notes}”</p>}
            </div>
          );
        })}
        {runs.map((r) => (
          <p key={r.id} className="flex items-center gap-2">
            <Footprints className="size-4 text-ok" />
            <b>{fmtNum(r.distance_km, 1)} km</b> en {fmtDuration(r.duration_sec)} · {fmtPace(r.distance_km, r.duration_sec)}
            {r.notes && <span className="text-muted"> · {r.notes}</span>}
          </p>
        ))}
        {meals.length > 0 && (
          <div>
            <p className="font-semibold">
              Comidas · {fmtNum(kcal)} kcal
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted">
              {meals.map((m) => (
                <li key={m.id} className="flex justify-between">
                  <span>
                    {m.time} {m.name}
                  </span>
                  <span className="tabular-nums">{fmtNum(m.calories)} kcal</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Sheet>
  );
}
