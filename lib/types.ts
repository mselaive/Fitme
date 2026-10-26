export type Sex = "m" | "f";
export type Activity = "sedentario" | "ligero" | "moderado" | "activo" | "muy_activo";
export type Goal = "bajar" | "mantener" | "subir";

export type Profile = {
  id: string;
  display_name: string;
  sex: Sex;
  birth_date: string | null;
  height_cm: number | null;
  activity: Activity;
  goal: Goal;
  calorie_target: number | null;
  protein_target_g: number | null;
};

export type WeightLog = { id: string; date: string; weight_kg: number };

export type Workout = {
  id: string;
  date: string;
  day_key: string;
  title: string;
  notes: string | null;
  started_at: string;
  finished_at: string | null;
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_key: string;
  exercise_name: string;
  set_no: number;
  weight_kg: number | null;
  reps: number | null;
  seconds: number | null;
  done: boolean;
  created_at: string;
};

export type Run = {
  id: string;
  date: string;
  distance_km: number;
  duration_sec: number;
  notes: string | null;
};

export type FoodItem = {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Meal = {
  id: string;
  date: string;
  time: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: FoodItem[];
  photo_path: string | null;
  source: "foto" | "manual";
  created_at: string;
};

/** Lo que devuelve /api/food al analizar una foto. */
export type FoodScan = {
  is_food: boolean;
  name: string;
  items: FoodItem[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "alta" | "media" | "baja";
  notes: string;
};

export const ACTIVITIES: { value: Activity; label: string; hint: string; factor: number }[] = [
  { value: "sedentario", label: "Sedentario", hint: "Trabajo de escritorio, casi sin ejercicio", factor: 1.2 },
  { value: "ligero", label: "Ligero", hint: "Ejercicio 1–3 días por semana", factor: 1.375 },
  { value: "moderado", label: "Moderado", hint: "Ejercicio 3–5 días por semana", factor: 1.55 },
  { value: "activo", label: "Activo", hint: "Ejercicio fuerte 6–7 días", factor: 1.725 },
  { value: "muy_activo", label: "Muy activo", hint: "Dos sesiones al día o trabajo físico", factor: 1.9 },
];

export const GOALS: { value: Goal; label: string; hint: string; delta: number }[] = [
  { value: "bajar", label: "Bajar grasa", hint: "Déficit de 500 kcal (≈0,5 kg por semana)", delta: -500 },
  { value: "mantener", label: "Mantener", hint: "Comer lo que gastas", delta: 0 },
  { value: "subir", label: "Subir músculo", hint: "Superávit de 300 kcal", delta: 300 },
];
