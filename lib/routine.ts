/** La rutina de mancuernas y banca: 4 días fijos + un 5.º opcional de brazos y hombros. */

export type Exercise = {
  key: string;
  name: string;
  /** Series objetivo (el mínimo si es un rango, p. ej. "2–3"). */
  sets: number;
  /** Texto del objetivo: "5–8", "30–45 s", etc. */
  target: string;
  /** "reps" (peso × repeticiones) o "seconds" (planchas, sostenes). */
  unit: "reps" | "seconds";
  /** Por brazo / por pierna. */
  perSide?: boolean;
  /** Ejercicio sin peso o donde el peso es opcional. */
  bodyweight?: boolean;
  note?: string;
};

export type RoutineDay = {
  key: string;
  /** "Día 1", "Día 2"… */
  label: string;
  title: string;
  subtitle: string;
  optional?: boolean;
  warning?: string;
  exercises: Exercise[];
};

const reps = (
  key: string,
  name: string,
  sets: number,
  target: string,
  extra: Partial<Exercise> = {},
): Exercise => ({ key, name, sets, target, unit: "reps", ...extra });

export const ROUTINE: RoutineDay[] = [
  {
    key: "d1",
    label: "Día 1",
    title: "Torso A y bíceps fuerte",
    subtitle: "Press plano, remo, press militar, bíceps",
    exercises: [
      reps("press_plano", "Press plano con mancuernas", 4, "5–8"),
      reps("remo_una_mano", "Remo a una mano apoyado en la banca", 4, "6–10", { perSide: true }),
      reps("press_militar_sentado", "Press militar sentado con mancuernas", 3, "6–10"),
      reps("curl_alternado", "Curl alternado de pie", 3, "6–10"),
      reps("curl_martillo", "Curl martillo", 2, "8–12"),
      reps("elevaciones_laterales", "Elevaciones laterales", 2, "12–20"),
    ],
  },
  {
    key: "d2",
    label: "Día 2",
    title: "Piernas A",
    subtitle: "Búlgara, peso muerto rumano, goblet, hip thrust",
    exercises: [
      reps("sentadilla_bulgara", "Sentadilla búlgara con mancuernas", 4, "6–10", { perSide: true }),
      reps("peso_muerto_rumano", "Peso muerto rumano con mancuernas", 4, "6–10"),
      reps("sentadilla_goblet", "Sentadilla goblet", 3, "8–12"),
      reps("hip_thrust", "Hip thrust apoyado en la banca", 3, "8–12"),
      reps("pantorrilla_una_pierna", "Elevación de pantorrilla a una pierna", 3, "10–20", { perSide: true }),
      reps("abdominal_mancuerna", "Abdominal con mancuerna en el pecho", 3, "10–20"),
    ],
  },
  {
    key: "d3",
    label: "Día 3",
    title: "Torso B y bíceps",
    subtitle: "Press inclinado, remo, pullover, tríceps, bíceps",
    exercises: [
      reps("press_inclinado", "Press inclinado con mancuernas", 3, "8–12"),
      reps("remo_pecho_apoyado", "Remo con pecho apoyado en banca inclinada", 4, "8–12"),
      reps("pullover", "Pullover con mancuerna", 3, "8–12"),
      reps("press_cerrado_triceps", "Press cerrado con mancuernas para tríceps", 3, "8–12"),
      reps("curl_predicador_unilateral", "Curl predicador unilateral", 2, "10–15", { perSide: true, note: "2–3 series" }),
      reps("curl_martillo_cruzado", "Curl martillo cruzado", 2, "10–15"),
      reps("pajaros_pecho_apoyado", "Pájaros con pecho apoyado", 2, "12–20"),
    ],
  },
  {
    key: "d4",
    label: "Día 4",
    title: "Piernas B",
    subtitle: "Zancadas, RDL a una pierna, goblet amplia, pantorrillas",
    exercises: [
      reps("zancada_atras", "Zancada hacia atrás con mancuernas", 4, "8–12", { perSide: true }),
      reps("rdl_una_pierna", "Peso muerto rumano a una pierna", 3, "8–12", { perSide: true }),
      reps("goblet_amplia", "Sentadilla goblet con postura amplia", 3, "10–15"),
      reps("hip_thrust_una_pierna", "Hip thrust a una pierna", 3, "10–15", { perSide: true, bodyweight: true }),
      reps("pantorrillas", "Elevación de pantorrillas", 4, "12–20"),
      {
        key: "plancha_lateral",
        name: "Plancha lateral o sostén de mancuerna a un lado",
        sets: 3,
        target: "30–45 s",
        unit: "seconds",
        perSide: true,
        bodyweight: true,
      },
    ],
  },
  {
    key: "d5",
    label: "Día 5",
    title: "Brazos y hombros",
    subtitle: "Opcional · solo con bíceps y codo recuperados",
    optional: true,
    warning: "Hazlo solamente cuando el bíceps y el codo estén completamente recuperados.",
    exercises: [
      reps("press_cerrado_triceps", "Press cerrado con mancuernas", 3, "8–12"),
      reps("elevaciones_laterales", "Elevaciones laterales", 3, "15–25"),
      reps("pajaros_posterior", "Pájaros para deltoide posterior", 3, "12–20"),
      reps("curl_predicador_ligero", "Curl predicador ligero", 2, "12–15"),
      reps("curl_martillo", "Curl martillo", 2, "12–15"),
      {
        key: "sosten_pesado",
        name: "Sostén pesado de mancuernas",
        sets: 3,
        target: "al fallo",
        unit: "seconds",
        note: "Anota los segundos que aguantaste",
      },
    ],
  },
];

export const FREE_DAY_KEY = "libre";

export function dayByKey(key: string) {
  return ROUTINE.find((d) => d.key === key) ?? null;
}

/** Todos los ejercicios distintos (para el historial por ejercicio). */
export function allExercises(): Exercise[] {
  const seen = new Map<string, Exercise>();
  for (const d of ROUTINE) for (const e of d.exercises) if (!seen.has(e.key)) seen.set(e.key, e);
  return [...seen.values()];
}

/** El día que toca después del último hecho: d1 → d2 → d3 → d4 → d1 (el 5 es opcional). */
export function nextDayKey(lastKey: string | null) {
  const order = ["d1", "d2", "d3", "d4"];
  if (!lastKey) return "d1";
  const i = order.indexOf(lastKey);
  if (i < 0) return "d1";
  return order[(i + 1) % order.length];
}
