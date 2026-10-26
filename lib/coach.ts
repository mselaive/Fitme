import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchMeals, fetchProfile, fetchRuns, fetchSetsForWorkouts, fetchWeights, fetchWorkouts } from "./data";
import { addDays, fmtDuration, fmtPace, todayIso } from "./format";
import { generateJson } from "./gemini";
import { ageFromBirthDate, targetsFor } from "./nutrition";
import { dayByKey } from "./routine";
import { bestSet, fmtSet, volume } from "./strength";

export type CoachAdvice = {
  resumen: string;
  logros: string[];
  mejoras: string[];
  proxima_sesion: string[];
  generated_at: string;
};

const SCHEMA = {
  type: "object",
  properties: {
    resumen: { type: "string" },
    logros: { type: "array", items: { type: "string" } },
    mejoras: { type: "array", items: { type: "string" } },
    proxima_sesion: { type: "array", items: { type: "string" } },
  },
  required: ["resumen", "logros", "mejoras", "proxima_sesion"],
};

const PROMPT = `Eres un entrenador personal y nutricionista cercano, directo y concreto (español de Chile, tuteo).
Analiza los datos de las últimas dos semanas de la persona y devuelve SOLO el JSON pedido:
- resumen: 2 o 3 frases con el panorama general (constancia, tendencia de peso, calorías vs. meta, fuerza).
- logros: 2 a 4 cosas que van bien, con números cuando se pueda (p. ej. "Subiste el press plano de 20 a 22 kg").
- mejoras: 2 a 4 cosas concretas a corregir (adherencia a la rutina, proteína, descansos, trote, registro de comidas).
- proxima_sesion: 2 a 4 indicaciones para la próxima sesión de pesas: qué día de la rutina toca y qué peso o
  repeticiones intentar en ejercicios específicos (doble progresión: si llegó al tope del rango en todas las series,
  subir 1–2,5 kg; si no, repetir peso y sumar reps).
Reglas: no inventes datos que no estén; si falta información dilo en una frase; sé breve (cada ítem máximo 25 palabras);
no des diagnósticos médicos; no recomiendes menos de 1.200 kcal.`;

/** Arma el resumen de datos (texto) que se le entrega al modelo. */
export async function buildCoachContext(supabase: SupabaseClient, userId: string) {
  const today = todayIso();
  const from14 = addDays(today, -13);
  const from30 = addDays(today, -29);
  const [profile, weights, workouts, runs, meals] = await Promise.all([
    fetchProfile(supabase, userId),
    fetchWeights(supabase, 60),
    fetchWorkouts(supabase, from14, today),
    fetchRuns(supabase, from14, today),
    fetchMeals(supabase, from14, today),
  ]);
  const sets = await fetchSetsForWorkouts(
    supabase,
    workouts.map((w) => w.id),
  );
  const weightKg = weights[0]?.weight_kg ?? null;
  const targets = profile ? targetsFor(profile, weightKg) : null;

  const lines: string[] = [];
  lines.push(`Hoy es ${today}.`);
  if (profile) {
    const age = ageFromBirthDate(profile.birth_date);
    lines.push(
      `Perfil: ${profile.sex === "f" ? "mujer" : "hombre"}, ${age ?? "?"} años, ${profile.height_cm ?? "?"} cm, objetivo: ${profile.goal}, actividad: ${profile.activity}.`,
    );
  }
  if (targets?.calories) lines.push(`Meta diaria: ${targets.calories} kcal y ${targets.protein_g ?? "?"} g de proteína (gasto estimado ${targets.tdee} kcal).`);

  const recentWeights = weights.filter((w) => w.date >= from30);
  lines.push(
    recentWeights.length
      ? `Peso (últimos 30 días, más nuevo primero): ${recentWeights.map((w) => `${w.date} ${w.weight_kg} kg`).join(", ")}.`
      : "Sin registros de peso.",
  );

  lines.push(`Sesiones de pesas (últimos 14 días): ${workouts.length}.`);
  for (const w of [...workouts].reverse()) {
    const mine = sets.filter((s) => s.workout_id === w.id && s.done);
    const byExercise = new Map<string, typeof mine>();
    for (const s of mine) byExercise.set(s.exercise_name, [...(byExercise.get(s.exercise_name) ?? []), s]);
    const detail = [...byExercise.entries()]
      .map(([name, list]) => {
        const best = bestSet(list);
        return `${name}: ${list.length} series, mejor ${best ? fmtSet(best) : "-"}`;
      })
      .join("; ");
    lines.push(
      `- ${w.date} ${dayByKey(w.day_key)?.label ?? ""} ${w.title}${w.finished_at ? "" : " (sin terminar)"}: ${mine.length} series, volumen ${Math.round(volume(mine))} kg. ${detail}${w.notes ? ` Notas: "${w.notes}"` : ""}`,
    );
  }

  lines.push(`Trotes (últimos 14 días): ${runs.length}.`);
  for (const r of [...runs].reverse()) {
    lines.push(`- ${r.date}: ${r.distance_km} km en ${fmtDuration(r.duration_sec)} (${fmtPace(r.distance_km, r.duration_sec)})${r.notes ? ` "${r.notes}"` : ""}`);
  }

  const byDay = new Map<string, { kcal: number; prot: number; n: number }>();
  for (const m of meals) {
    const d = byDay.get(m.date) ?? { kcal: 0, prot: 0, n: 0 };
    d.kcal += m.calories;
    d.prot += m.protein_g;
    d.n += 1;
    byDay.set(m.date, d);
  }
  lines.push(`Comidas registradas (últimos 14 días): ${byDay.size} días con registro.`);
  for (const [date, d] of [...byDay.entries()].sort()) {
    lines.push(`- ${date}: ${Math.round(d.kcal)} kcal, ${Math.round(d.prot)} g proteína, ${d.n} comidas`);
  }

  return lines.join("\n");
}

export async function askCoach(opts: { apiKey: string; model?: string; context: string }): Promise<CoachAdvice> {
  const raw = await generateJson({
    apiKey: opts.apiKey,
    model: opts.model,
    parts: [{ text: `${PROMPT}\n\nDATOS:\n${opts.context}` }],
    schema: SCHEMA,
    temperature: 0.4,
  });
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => (x as string).trim().slice(0, 240)).slice(0, 5) : []);
  return {
    resumen: typeof raw.resumen === "string" ? raw.resumen.trim().slice(0, 600) : "",
    logros: list(raw.logros),
    mejoras: list(raw.mejoras),
    proxima_sesion: list(raw.proxima_sesion),
    generated_at: new Date().toISOString(),
  };
}
