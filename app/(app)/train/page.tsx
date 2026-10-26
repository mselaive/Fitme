"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, ChevronRight, Plus } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Bars } from "@/components/charts";
import { RunSheet } from "@/components/run-sheet";
import { fetchRecentRuns, fetchRecentWorkouts } from "@/lib/data";
import { addDays, fmtDay, fmtDuration, fmtNum, fmtPace, fmtRelative, parseIso } from "@/lib/format";
import { runCalories } from "@/lib/nutrition";
import { nextDayKey, ROUTINE } from "@/lib/routine";
import type { Run, Workout } from "@/lib/types";

export default function TrainPage() {
  const { supabase, today, weightKg, toast } = useApp();
  const [tab, setTab] = useState<"rutina" | "trote">("rutina");
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [runSheet, setRunSheet] = useState<{ run: Run | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, r] = await Promise.all([fetchRecentWorkouts(supabase, 60), fetchRecentRuns(supabase, 60)]);
      setWorkouts(w);
      setRuns(r);
    } catch (e) {
      toast(`No se pudo cargar: ${(e as Error).message}`, "bad");
    }
  }, [supabase, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const lastByDay = useMemo(() => {
    const map = new Map<string, Workout>();
    for (const w of workouts ?? []) if (!map.has(w.day_key)) map.set(w.day_key, w);
    return map;
  }, [workouts]);
  const inProgress = workouts?.find((w) => w.date === today && !w.finished_at) ?? null;
  const suggested = nextDayKey(workouts?.[0]?.day_key ?? null);

  return (
    <div className="space-y-4">
      <h1 className="pt-1 text-2xl font-bold">Entrenar</h1>

      <div className="seg grid-cols-2">
        {(["rutina", "trote"] as const).map((t) => (
          <button key={t} className={`seg-item ${tab === t ? "seg-on" : ""}`} onClick={() => setTab(t)}>
            {t === "rutina" ? "Rutina" : "Trote"}
          </button>
        ))}
      </div>

      {tab === "rutina" && (
        <>
          {inProgress && (
            <Link href={`/train/${inProgress.day_key}?w=${inProgress.id}`} className="card flex items-center gap-3 border-accent bg-accent-soft p-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-accent">Sesión en curso</p>
                <p className="font-semibold">{inProgress.title}</p>
              </div>
              <span className="btn-primary px-3 py-2 text-sm">Seguir</span>
            </Link>
          )}
          <ul className="space-y-3">
            {ROUTINE.map((day) => {
              const last = lastByDay.get(day.key);
              const isNext = day.key === suggested && !inProgress;
              return (
                <li key={day.key}>
                  <Link href={`/train/${day.key}`} className={`card flex items-center gap-3 p-4 ${isNext ? "border-accent" : ""}`}>
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg font-bold text-accent">
                      {day.label.replace("Día ", "")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {day.title}
                        {isNext && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">TE TOCA</span>}
                      </p>
                      <p className="truncate text-sm text-muted">{day.subtitle}</p>
                      <p className="text-xs text-muted">
                        {day.exercises.length} ejercicios · {last ? `última vez ${fmtRelative(last.date, today)}` : "nunca hecho"}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted" />
                  </Link>
                  {day.warning && (
                    <p className="mt-1.5 flex items-start gap-1.5 px-1 text-xs text-warn">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {day.warning}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <Link href="/exercises" className="card flex items-center gap-3 p-4">
            <BookOpen className="size-5 text-accent" />
            <div className="flex-1">
              <p className="font-semibold">Cómo se hace cada ejercicio</p>
              <p className="text-sm text-muted">Figura animada, músculos que trabaja y consejos de técnica</p>
            </div>
            <ChevronRight className="size-5 text-muted" />
          </Link>

          {workouts && workouts.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-muted">Sesiones recientes</h2>
              <ul className="card divide-y divide-line">
                {workouts.slice(0, 10).map((w) => (
                  <li key={w.id}>
                    <Link href={`/train/${w.day_key}?w=${w.id}`} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-20 shrink-0 text-sm text-muted">{fmtDay(w.date)}</span>
                      <span className="flex-1 truncate text-sm font-medium">{w.title}</span>
                      {!w.finished_at && <span className="text-xs text-warn">sin terminar</span>}
                      <ChevronRight className="size-4 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {tab === "trote" && (
        <>
          <button className="btn-primary w-full" onClick={() => setRunSheet({ run: null })}>
            <Plus className="size-5" /> Anotar trote
          </button>
          {runs && <WeeklyKm runs={runs} today={today} />}
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted">Últimos trotes</h2>
            {runs?.length ? (
              <ul className="card divide-y divide-line">
                {runs.map((r) => (
                  <li key={r.id}>
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setRunSheet({ run: r })}>
                      <span className="w-20 shrink-0 text-sm text-muted">{fmtDay(r.date)}</span>
                      <span className="w-16 font-semibold tabular-nums">{fmtNum(r.distance_km, r.distance_km % 1 ? 1 : 0)} km</span>
                      <span className="flex-1 text-sm text-muted tabular-nums">
                        {fmtDuration(r.duration_sec)} · {fmtPace(r.distance_km, r.duration_sec)}
                      </span>
                      <span className="text-xs text-muted">{runCalories(r.distance_km, weightKg)} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card p-4 text-center text-sm text-muted">{runs ? "Todavía no anotas trotes" : "Cargando…"}</p>
            )}
          </section>
        </>
      )}

      {runSheet && (
        <RunSheet
          run={runSheet.run}
          defaultDate={today}
          onClose={() => setRunSheet(null)}
          onSaved={() => {
            setRunSheet(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/** Km por semana (últimas 8 semanas, lunes a domingo). */
function WeeklyKm({ runs, today }: { runs: Run[]; today: string }) {
  const monday = (iso: string) => {
    const d = parseIso(iso);
    const diff = (d.getDay() + 6) % 7;
    return addDays(iso, -diff);
  };
  const thisMonday = monday(today);
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(thisMonday, -7 * (7 - i)));
  const data = weeks.map((start) => {
    const end = addDays(start, 6);
    const km = runs.filter((r) => r.date >= start && r.date <= end).reduce((s, r) => s + r.distance_km, 0);
    const d = parseIso(start);
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: Math.round(km * 10) / 10 };
  });
  const thisWeek = data[data.length - 1].value;
  return (
    <section className="card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-medium text-muted">Km por semana</p>
        <p className="text-sm">
          Esta semana: <span className="font-semibold">{fmtNum(thisWeek, 1)} km</span>
        </p>
      </div>
      <Bars data={data} color="var(--ok)" format={(v) => fmtNum(v, 1)} />
    </section>
  );
}
