"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Dumbbell, Flame, Footprints, Plus, Scale, Utensils } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { MacroBar, Ring } from "@/components/charts";
import { RunSheet } from "@/components/run-sheet";
import { WeightSheet } from "@/components/weight-sheet";
import { fetchMeals, fetchRecentWorkouts, fetchRuns, fetchSetsForWorkouts, fetchWorkouts } from "@/lib/data";
import { addDays, fmtDayLong, fmtDuration, fmtKg, fmtNum, fmtPace, fmtRelative, parseIso } from "@/lib/format";
import { runCalories } from "@/lib/nutrition";
import { dayByKey, nextDayKey } from "@/lib/routine";
import { volume } from "@/lib/strength";
import type { Meal, Run, Workout, WorkoutSet } from "@/lib/types";

type TodayData = {
  meals: Meal[];
  workouts: Workout[];
  sets: WorkoutSet[];
  runs: Run[];
  weekWorkouts: Workout[];
  weekRuns: Run[];
  weekMeals: Meal[];
  lastWorkout: Workout | null;
};

export default function TodayPage() {
  const { supabase, profile, today, targets, weightKg, weights, toast } = useApp();
  const [data, setData] = useState<TodayData | null>(null);
  const [sheet, setSheet] = useState<"run" | "weight" | null>(null);

  const load = useCallback(async () => {
    const from = addDays(today, -6);
    try {
      const [weekMeals, weekWorkouts, weekRuns, recent] = await Promise.all([
        fetchMeals(supabase, from, today),
        fetchWorkouts(supabase, from, today),
        fetchRuns(supabase, from, today),
        fetchRecentWorkouts(supabase, 1),
      ]);
      const workouts = weekWorkouts.filter((w) => w.date === today);
      const sets = await fetchSetsForWorkouts(
        supabase,
        workouts.map((w) => w.id),
      );
      setData({
        meals: weekMeals.filter((m) => m.date === today),
        workouts,
        sets,
        runs: weekRuns.filter((r) => r.date === today),
        weekWorkouts,
        weekRuns,
        weekMeals,
        lastWorkout: recent[0] ?? null,
      });
    } catch (e) {
      toast(`No se pudo cargar el día: ${(e as Error).message}`, "bad");
    }
  }, [supabase, today, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const eaten = data?.meals.reduce((s, m) => s + m.calories, 0) ?? 0;
  const protein = data?.meals.reduce((s, m) => s + m.protein_g, 0) ?? 0;
  const carbs = data?.meals.reduce((s, m) => s + m.carbs_g, 0) ?? 0;
  const fat = data?.meals.reduce((s, m) => s + m.fat_g, 0) ?? 0;
  const target = targets.calories;
  const remaining = target != null ? target - eaten : null;

  const todayWorkout = data?.workouts[0] ?? null;
  const suggested = dayByKey(nextDayKey(data?.lastWorkout?.day_key ?? null));
  const doneSets = data?.sets.filter((s) => s.done) ?? [];
  const lastWeight = weights[0] ?? null;

  const firstName = profile.display_name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="space-y-4">
      <header className="pt-1">
        <p className="text-sm text-muted">{fmtDayLong(today)}</p>
        <h1 className="text-2xl font-bold">
          {greeting}, {firstName}
        </h1>
      </header>

      {/* Calorías */}
      <section className="card p-4">
        <div className="flex items-center gap-4">
          <Ring value={eaten} max={target ?? 0} over={remaining != null && remaining < 0}>
            <span className="text-2xl font-bold tabular-nums">{fmtNum(eaten)}</span>
            <span className="text-[11px] text-muted">{target ? `de ${fmtNum(target)} kcal` : "kcal"}</span>
          </Ring>
          <div className="min-w-0 flex-1 space-y-2.5">
            {target != null ? (
              <p className="text-sm">
                {remaining != null && remaining >= 0 ? (
                  <>
                    Te quedan <span className="font-semibold text-accent">{fmtNum(remaining)} kcal</span>
                  </>
                ) : (
                  <>
                    Te pasaste por <span className="font-semibold text-bad">{fmtNum(Math.abs(remaining ?? 0))} kcal</span>
                  </>
                )}
              </p>
            ) : (
              <Link href="/settings" className="block text-sm text-accent">
                Completa tu peso, estatura y edad para calcular tu meta <ChevronRight className="inline size-4" />
              </Link>
            )}
            <MacroBar label="Proteína" value={protein} max={targets.protein_g} color="var(--protein)" />
            <MacroBar label="Carbohidratos" value={carbs} max={null} color="var(--carbs)" />
            <MacroBar label="Grasa" value={fat} max={null} color="var(--fat)" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
          <span className="text-muted">
            {data ? `${data.meals.length} ${data.meals.length === 1 ? "comida" : "comidas"} hoy` : "Cargando…"}
          </span>
          <Link href="/food" className="inline-flex items-center gap-1 font-medium text-accent">
            <Utensils className="size-4" /> Anotar comida
          </Link>
        </div>
      </section>

      {/* Entrenamiento */}
      <section className="card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
          <Dumbbell className="size-4" /> Pesas
        </div>
        {todayWorkout ? (
          <Link href={`/train/${todayWorkout.day_key}?w=${todayWorkout.id}`} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {dayByKey(todayWorkout.day_key)?.label ?? "Sesión"} · {todayWorkout.title}
              </p>
              <p className="text-sm text-muted">
                {doneSets.length} series · {fmtNum(volume(doneSets))} kg movidos
                {todayWorkout.finished_at ? " · terminado ✓" : " · en curso"}
              </p>
            </div>
            <ChevronRight className="size-5 text-muted" />
          </Link>
        ) : suggested ? (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted">Te toca</p>
              <p className="font-semibold">
                {suggested.label} · {suggested.title}
              </p>
              {data?.lastWorkout && (
                <p className="text-xs text-muted">
                  Última sesión: {dayByKey(data.lastWorkout.day_key)?.label ?? data.lastWorkout.title}{" "}
                  {fmtRelative(data.lastWorkout.date, today)}
                </p>
              )}
            </div>
            <Link href={`/train/${suggested.key}`} className="btn-primary px-4 py-2.5 text-sm">
              Empezar
            </Link>
          </div>
        ) : null}
        <Link href="/train" className="mt-3 block border-t border-line pt-3 text-sm text-accent">
          Ver toda la rutina <ChevronRight className="inline size-4" />
        </Link>
      </section>

      {/* Trote */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted">
            <Footprints className="size-4" /> Trote
          </div>
          <button className="btn-ghost text-accent" onClick={() => setSheet("run")}>
            <Plus className="size-4" /> Anotar
          </button>
        </div>
        {data?.runs.length ? (
          <ul className="mt-2 space-y-1.5">
            {data.runs.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="font-semibold">{fmtNum(r.distance_km, r.distance_km % 1 ? 1 : 0)} km</span>
                <span className="text-muted">{fmtDuration(r.duration_sec)}</span>
                <span className="text-muted">{fmtPace(r.distance_km, r.duration_sec)}</span>
                <span className="text-xs text-muted">≈ {runCalories(r.distance_km, weightKg)} kcal</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">Sin trote hoy</p>
        )}
      </section>

      {/* Peso */}
      <section className="card flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Scale className="size-5 text-muted" />
          <div>
            <p className="font-semibold">{fmtKg(weightKg)}</p>
            <p className="text-xs text-muted">{lastWeight ? `Pesado ${fmtRelative(lastWeight.date, today)}` : "Aún no anotas tu peso"}</p>
          </div>
        </div>
        <button className="btn-secondary px-3 py-2 text-sm" onClick={() => setSheet("weight")}>
          {lastWeight?.date === today ? "Corregir" : "Anotar"}
        </button>
      </section>

      {/* Semana */}
      {data && <WeekStrip today={today} workouts={data.weekWorkouts} runs={data.weekRuns} meals={data.weekMeals} />}

      {sheet === "run" && (
        <RunSheet
          defaultDate={today}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            load();
          }}
        />
      )}
      {sheet === "weight" && <WeightSheet onClose={() => setSheet(null)} />}
    </div>
  );
}

function WeekStrip({ today, workouts, runs, meals }: { today: string; workouts: Workout[]; runs: Run[]; meals: Meal[] }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const letters = ["D", "L", "M", "M", "J", "V", "S"];
  return (
    <section className="card p-4">
      <p className="mb-3 text-sm font-medium text-muted">Últimos 7 días</p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const w = workouts.find((x) => x.date === d);
          const r = runs.some((x) => x.date === d);
          const kcal = meals.filter((m) => m.date === d).reduce((s, m) => s + m.calories, 0);
          const isToday = d === today;
          return (
            <div key={d} className={`flex flex-col items-center gap-1 rounded-xl py-2 ${isToday ? "bg-accent-soft" : ""}`}>
              <span className={`text-[11px] ${isToday ? "font-bold text-accent" : "text-muted"}`}>{letters[parseIso(d).getDay()]}</span>
              <span className="text-xs tabular-nums">{parseIso(d).getDate()}</span>
              <div className="flex h-4 items-center gap-0.5">
                {w && (
                  <span className="rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-accent-fg">
                    {dayByKey(w.day_key)?.label.replace("Día ", "") ?? "·"}
                  </span>
                )}
                {r && <Footprints className="size-3 text-ok" />}
              </div>
              <span className="flex h-3 items-center text-[9px] text-muted">
                {kcal > 0 && (
                  <>
                    <Flame className="size-2.5" />
                    {Math.round(kcal / 100) / 10}k
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
