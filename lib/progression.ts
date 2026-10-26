import type { Exercise } from "./routine";
import type { WorkoutSet } from "./types";

export type Suggestion = { kind: "up" | "keep" | "down"; weight: number | null; text: string };

/** "5–8" → [5, 8]; "30–45 s" → [30, 45]; "al fallo" → null. */
export function parseRange(target: string): [number, number] | null {
  const m = target.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

/** Salto de peso razonable con mancuernas (kg). */
function stepFor(weightKg: number) {
  if (weightKg < 8) return 1;
  if (weightKg < 20) return 2;
  return 2.5;
}

/**
 * Doble progresión: si la última vez llegaste al tope del rango en todas las series, sube el peso;
 * si no llegaste al mínimo en alguna, baja un poco; si no, repite el peso y suma repeticiones.
 */
export function suggestProgression(exercise: Exercise, lastSets: WorkoutSet[]): Suggestion | null {
  if (exercise.unit !== "reps" || lastSets.length === 0) return null;
  const range = parseRange(exercise.target);
  if (!range) return null;
  const [min, max] = range;
  const done = lastSets.filter((s) => s.reps != null && s.weight_kg != null);
  if (done.length === 0) return null;
  const weight = Math.max(...done.map((s) => s.weight_kg as number));
  if (weight <= 0) return null;
  const sameWeight = done.filter((s) => s.weight_kg === weight);
  const allTop = sameWeight.length >= Math.min(exercise.sets, done.length) && sameWeight.every((s) => (s.reps as number) >= max);
  const anyBelow = sameWeight.some((s) => (s.reps as number) < min);
  if (allTop) {
    const next = Math.round((weight + stepFor(weight)) * 2) / 2;
    return { kind: "up", weight: next, text: `Llegaste a ${max} reps en todas: prueba ${fmt(next)} kg` };
  }
  if (anyBelow) {
    const next = Math.max(1, Math.round((weight - stepFor(weight)) * 2) / 2);
    return { kind: "down", weight: next, text: `Faltaron reps para llegar a ${min}: usa ${fmt(next)} kg o repite con menos series` };
  }
  return { kind: "keep", weight, text: `Repite ${fmt(weight)} kg y suma una rep por serie` };
}

const fmt = (n: number) => (n % 1 ? n.toFixed(1).replace(".", ",") : String(n));
