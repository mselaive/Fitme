import { ACTIVITIES, GOALS, type Profile } from "./types";

export function ageFromBirthDate(birthDate: string | null, today = new Date()): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  let age = today.getFullYear() - y;
  const hadBirthday = today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthday) age--;
  return age >= 0 && age < 130 ? age : null;
}

/** Metabolismo basal (Mifflin-St Jeor), kcal por día. */
export function bmr(profile: Pick<Profile, "sex" | "birth_date" | "height_cm">, weightKg: number | null) {
  const age = ageFromBirthDate(profile.birth_date);
  if (!weightKg || !profile.height_cm || age == null) return null;
  const base = 10 * weightKg + 6.25 * profile.height_cm - 5 * age;
  return Math.round(profile.sex === "f" ? base - 161 : base + 5);
}

export type Targets = {
  bmr: number | null;
  tdee: number | null;
  /** Meta de calorías del día (la del perfil o la calculada). */
  calories: number | null;
  /** Meta de proteína en gramos (la del perfil o 1,8 g por kg). */
  protein_g: number | null;
  /** true si la meta de calorías viene calculada (no editada a mano). */
  calculated: boolean;
};

export function targetsFor(profile: Profile, weightKg: number | null): Targets {
  const basal = bmr(profile, weightKg);
  const factor = ACTIVITIES.find((a) => a.value === profile.activity)?.factor ?? 1.55;
  const delta = GOALS.find((g) => g.value === profile.goal)?.delta ?? 0;
  const tdee = basal ? Math.round(basal * factor) : null;
  const calculated = tdee ? Math.max(1200, tdee + delta) : null;
  const protein = weightKg ? Math.round(weightKg * 1.8) : null;
  return {
    bmr: basal,
    tdee,
    calories: profile.calorie_target ?? calculated,
    protein_g: profile.protein_target_g ?? protein,
    calculated: profile.calorie_target == null,
  };
}

/** Índice de masa corporal. */
export function bmi(weightKg: number | null, heightCm: number | null) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiLabel(value: number | null) {
  if (value == null) return "";
  if (value < 18.5) return "Bajo peso";
  if (value < 25) return "Normal";
  if (value < 30) return "Sobrepeso";
  return "Obesidad";
}

/** Calorías aproximadas de un trote: ≈1 kcal por kg por km. */
export function runCalories(distanceKm: number, weightKg: number | null) {
  return Math.round(distanceKm * (weightKg ?? 70));
}
