import type { WorkoutSet } from "./types";

/** 1RM estimado (Epley). Para series de 1 rep es el peso mismo. */
export function estimate1RM(weightKg: number, reps: number) {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** Volumen (kg × reps) de un conjunto de series. */
export function volume(sets: Pick<WorkoutSet, "weight_kg" | "reps">[]) {
  return sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
}

/** La mejor serie (mayor 1RM estimado) de un conjunto. */
export function bestSet<T extends Pick<WorkoutSet, "weight_kg" | "reps" | "seconds">>(sets: T[]): T | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const s of sets) {
    const score = s.reps != null && s.weight_kg != null ? estimate1RM(s.weight_kg, s.reps) : (s.seconds ?? -1);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

/** "20 kg × 8" o "45 s" */
export function fmtSet(s: Pick<WorkoutSet, "weight_kg" | "reps" | "seconds">) {
  if (s.seconds != null && s.reps == null) {
    return s.weight_kg ? `${trim(s.weight_kg)} kg · ${s.seconds} s` : `${s.seconds} s`;
  }
  const w = s.weight_kg != null ? `${trim(s.weight_kg)} kg` : "peso corporal";
  return `${w} × ${s.reps ?? 0}`;
}

function trim(n: number) {
  return n % 1 ? n.toFixed(1).replace(".", ",") : String(n);
}

/** Agrupa las series por sesión (workout) y devuelve la última sesión de cada ejercicio. */
export function lastSessionByExercise(sets: WorkoutSet[]) {
  // Las series vienen ordenadas de más nueva a más antigua.
  const result = new Map<string, WorkoutSet[]>();
  const sessionOf = new Map<string, string>();
  for (const s of sets) {
    const session = sessionOf.get(s.exercise_key);
    if (!session) {
      sessionOf.set(s.exercise_key, s.workout_id);
      result.set(s.exercise_key, [s]);
    } else if (session === s.workout_id) {
      result.get(s.exercise_key)!.push(s);
    }
  }
  for (const list of result.values()) list.sort((a, b) => a.set_no - b.set_no);
  return result;
}
