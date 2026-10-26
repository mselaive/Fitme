import type { SupabaseClient } from "@supabase/supabase-js";
import type { Meal, Profile, Run, WeightLog, Workout, WorkoutSet } from "./types";

/*
 * Consultas a Supabase. Todas filtran por rango de fechas o límite: PostgREST corta en 1000 filas,
 * así que nunca se trae "todo" de tablas que crecen (series, comidas).
 */

const num = (v: unknown) => (v == null ? null : Number(v));

export function normalizeProfile(p: Record<string, unknown>): Profile {
  return {
    ...(p as Profile),
    height_cm: num(p.height_cm),
    calorie_target: num(p.calorie_target),
    protein_target_g: num(p.protein_target_g),
  };
}

export function normalizeSet(s: Record<string, unknown>): WorkoutSet {
  return { ...(s as WorkoutSet), weight_kg: num(s.weight_kg) };
}

export function normalizeMeal(m: Record<string, unknown>): Meal {
  return {
    ...(m as Meal),
    calories: Number(m.calories ?? 0),
    protein_g: Number(m.protein_g ?? 0),
    carbs_g: Number(m.carbs_g ?? 0),
    fat_g: Number(m.fat_g ?? 0),
    items: Array.isArray(m.items) ? (m.items as Meal["items"]) : [],
    time: typeof m.time === "string" ? m.time.slice(0, 5) : "12:00",
  };
}

export function normalizeRun(r: Record<string, unknown>): Run {
  return { ...(r as Run), distance_km: Number(r.distance_km) };
}

export function normalizeWeight(w: Record<string, unknown>): WeightLog {
  return { ...(w as WeightLog), weight_kg: Number(w.weight_kg) };
}

export async function fetchProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? normalizeProfile(data) : null;
}

/** Pesos (uno por día). Un año de pesadas diarias son 365 filas: cabe de sobra. */
export async function fetchWeights(supabase: SupabaseClient, limit = 400) {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("id, date, weight_kg")
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(normalizeWeight);
}

export async function fetchWorkouts(supabase: SupabaseClient, from: string, to: string) {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, date, day_key, title, notes, started_at, finished_at")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Workout[];
}

export async function fetchRecentWorkouts(supabase: SupabaseClient, limit = 20) {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, date, day_key, title, notes, started_at, finished_at")
    .order("date", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Workout[];
}

export async function fetchSetsForWorkouts(supabase: SupabaseClient, workoutIds: string[]) {
  if (!workoutIds.length) return [] as WorkoutSet[];
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*")
    .in("workout_id", workoutIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeSet);
}

/** Últimas series de ciertos ejercicios (de más nueva a más antigua), excluyendo una sesión. */
export async function fetchPreviousSets(
  supabase: SupabaseClient,
  exerciseKeys: string[],
  excludeWorkoutId: string | null,
  limit = 300,
) {
  if (!exerciseKeys.length) return [] as WorkoutSet[];
  let q = supabase
    .from("workout_sets")
    .select("*")
    .in("exercise_key", exerciseKeys)
    .eq("done", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (excludeWorkoutId) q = q.neq("workout_id", excludeWorkoutId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(normalizeSet);
}

/** Historial de un ejercicio: series hechas con la fecha de su sesión. */
export async function fetchExerciseHistory(supabase: SupabaseClient, exerciseKey: string, limit = 400) {
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*, workout:workouts(date)")
    .eq("exercise_key", exerciseKey)
    .eq("done", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { workout, ...rest } = row as Record<string, unknown> & { workout: { date: string } | null };
    return { ...normalizeSet(rest), date: workout?.date ?? "" };
  });
}

export async function fetchRuns(supabase: SupabaseClient, from: string, to: string) {
  const { data, error } = await supabase
    .from("runs")
    .select("id, date, distance_km, duration_sec, notes")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeRun);
}

export async function fetchRecentRuns(supabase: SupabaseClient, limit = 30) {
  const { data, error } = await supabase
    .from("runs")
    .select("id, date, distance_km, duration_sec, notes")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(normalizeRun);
}

export async function fetchMeals(supabase: SupabaseClient, from: string, to: string) {
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .order("time", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeMeal);
}

/** Comidas recientes sin repetir nombre (para "Repetir"), de la más nueva a la más antigua. */
export async function fetchRecentMealNames(supabase: SupabaseClient, limit = 150) {
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const seen = new Set<string>();
  const out: Meal[] = [];
  for (const row of (data ?? []).map(normalizeMeal)) {
    const key = row.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Totales de calorías por día (para el calendario), sumados en el navegador sobre un rango acotado. */
export function caloriesByDay(meals: Meal[]) {
  const map = new Map<string, number>();
  for (const m of meals) map.set(m.date, (map.get(m.date) ?? 0) + m.calories);
  return map;
}
