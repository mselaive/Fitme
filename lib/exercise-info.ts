/**
 * Cómo se hace cada ejercicio: poses para la figura animada, músculos que trabaja y consejos.
 *
 * Convención de ángulos (vista lateral, la figura mira hacia la derecha):
 *   0 = hacia abajo, 90 = hacia adelante, 180 = hacia arriba, 270 = hacia atrás.
 *   - torso: ángulo absoluto desde la cadera hacia los hombros (180 = de pie derecho).
 *   - upper: ángulo absoluto del brazo desde el hombro. flex: flexión del codo (0 = brazo recto,
 *     positivo = el antebrazo gira hacia adelante/arriba).
 *   - thigh: ángulo absoluto del muslo desde la cadera. knee: flexión de rodilla (0 = pierna recta,
 *     positivo = la canilla gira hacia atrás). foot: ángulo del pie (90 = plano en el suelo).
 * Vista frontal: upper 0 = abajo, 90 = hacia afuera; thigh 0 = abajo, positivo = hacia afuera.
 */

export type MuscleId =
  | "pecho"
  | "deltoide_anterior"
  | "deltoide_lateral"
  | "deltoide_posterior"
  | "biceps"
  | "triceps"
  | "antebrazo"
  | "abdominales"
  | "oblicuos"
  | "cuadriceps"
  | "isquios"
  | "gluteos"
  | "gemelos"
  | "dorsales"
  | "espalda_alta"
  | "lumbar"
  | "aductores";

export const MUSCLE_NAMES: Record<MuscleId, string> = {
  pecho: "Pecho",
  deltoide_anterior: "Hombro frontal",
  deltoide_lateral: "Hombro lateral",
  deltoide_posterior: "Hombro posterior",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebrazo: "Antebrazos",
  abdominales: "Abdomen",
  oblicuos: "Oblicuos",
  cuadriceps: "Cuádriceps",
  isquios: "Isquiotibiales",
  gluteos: "Glúteos",
  gemelos: "Pantorrillas",
  dorsales: "Dorsales",
  espalda_alta: "Espalda alta",
  lumbar: "Zona lumbar",
  aductores: "Aductores",
};

export type Limb = { upper: number; flex: number };
export type Leg = { thigh: number; knee: number; foot?: number };

export type Pose = {
  hip: { x: number; y: number };
  torso: number;
  /** Inclinación extra de la cabeza (grados). */
  head?: number;
  near: Limb;
  far: Limb;
  legNear: Leg;
  legFar: Leg;
};

export type Prop =
  | { kind: "bench"; x: number; y: number; w: number; h?: number; angle?: number }
  | { kind: "wall"; x: number }
  | { kind: "step"; x: number; w: number; h: number }
  | { kind: "pad"; x: number; y: number; w: number; angle: number };

export type ExerciseInfo = {
  view: "side" | "front";
  /** Fotograma inicial y final; la animación va y vuelve entre los dos. */
  start: Pose;
  end: Pose;
  /** Mancuerna en la mano cercana / lejana. */
  dumbbells?: { near?: boolean; far?: boolean; angle?: number };
  props?: Prop[];
  /** Dibuja el suelo. */
  floor?: boolean;
  primary: MuscleId[];
  secondary: MuscleId[];
  cues: string[];
};

const standingLeg: Leg = { thigh: 0, knee: 0 };
const straightDown: Limb = { upper: 0, flex: 0 };

const standing = (x = 100, y = 110): Pose => ({
  hip: { x, y },
  torso: 180,
  near: straightDown,
  far: straightDown,
  legNear: standingLeg,
  legFar: standingLeg,
});

/** De pie con los brazos colgando (vista lateral). */
const curlPose = (nearFlex: number, farFlex: number): Pose => ({
  ...standing(),
  near: { upper: 5, flex: nearFlex },
  far: { upper: 5, flex: farFlex },
});

/** Acostado boca arriba en banca plana (cabeza a la izquierda). */
const supine = (near: Limb): Pose => ({
  hip: { x: 108, y: 118 },
  torso: 270,
  head: 10,
  near,
  far: near,
  legNear: { thigh: 60, knee: 60 },
  legFar: { thigh: 75, knee: 75 },
});

const FLAT_BENCH: Prop = { kind: "bench", x: 38, y: 122, w: 90 };

export const EXERCISE_INFO: Record<string, ExerciseInfo> = {
  press_plano: {
    view: "side",
    start: supine({ upper: 20, flex: 150 }),
    end: supine({ upper: 180, flex: 0 }),
    dumbbells: { near: true, far: true },
    props: [FLAT_BENCH],
    floor: true,
    primary: ["pecho"],
    secondary: ["deltoide_anterior", "triceps"],
    cues: [
      "Omóplatos juntos y pegados a la banca, pies firmes en el suelo.",
      "Baja controlado hasta que las mancuernas queden a la altura del pecho.",
      "Empuja hacia arriba sin chocar las mancuernas ni bloquear los codos de golpe.",
    ],
  },
  remo_una_mano: {
    view: "side",
    start: {
      hip: { x: 92, y: 112 },
      torso: 112,
      head: -20,
      near: { upper: 0, flex: 0 },
      far: { upper: 20, flex: 0 },
      legNear: { thigh: 345, knee: 10 },
      legFar: { thigh: 20, knee: 15 },
    },
    end: {
      hip: { x: 92, y: 112 },
      torso: 112,
      head: -20,
      near: { upper: 300, flex: 70 },
      far: { upper: 20, flex: 0 },
      legNear: { thigh: 345, knee: 10 },
      legFar: { thigh: 20, knee: 15 },
    },
    dumbbells: { near: true },
    props: [{ kind: "bench", x: 118, y: 148, w: 60 }],
    floor: true,
    primary: ["dorsales", "espalda_alta"],
    secondary: ["biceps", "deltoide_posterior", "antebrazo"],
    cues: [
      "Mano y rodilla apoyadas en la banca, espalda recta y paralela al suelo.",
      "Tira del codo hacia la cadera, no hacia el hombro; el codo pegado al cuerpo.",
      "Baja lento hasta estirar el brazo sin girar el torso.",
    ],
  },
  press_militar_sentado: {
    view: "side",
    start: {
      hip: { x: 100, y: 118 },
      torso: 180,
      near: { upper: 50, flex: 130 },
      far: { upper: 50, flex: 130 },
      legNear: { thigh: 90, knee: 90 },
      legFar: { thigh: 90, knee: 90 },
    },
    end: {
      hip: { x: 100, y: 118 },
      torso: 180,
      near: { upper: 178, flex: 0 },
      far: { upper: 178, flex: 0 },
      legNear: { thigh: 90, knee: 90 },
      legFar: { thigh: 90, knee: 90 },
    },
    dumbbells: { near: true, far: true },
    props: [{ kind: "bench", x: 70, y: 122, w: 50 }],
    floor: true,
    primary: ["deltoide_anterior", "deltoide_lateral"],
    secondary: ["triceps", "espalda_alta"],
    cues: [
      "Siéntate con la espalda apoyada y el abdomen firme; no arquees la zona lumbar.",
      "Parte con las mancuernas a la altura de las orejas y empuja hasta estirar los brazos.",
      "Baja controlado; si duele el hombro, usa agarre neutro (palmas enfrentadas).",
    ],
  },
  curl_alternado: {
    view: "side",
    start: curlPose(0, 150),
    end: curlPose(150, 0),
    dumbbells: { near: true, far: true },
    floor: true,
    primary: ["biceps"],
    secondary: ["antebrazo"],
    cues: [
      "Codos pegados al cuerpo; que no se vayan hacia adelante al subir.",
      "Sube un brazo mientras bajas el otro, girando la palma hacia arriba.",
      "Sin balancear el torso: si tienes que impulsar, baja el peso.",
    ],
  },
  curl_martillo: {
    view: "side",
    start: curlPose(0, 0),
    end: curlPose(150, 150),
    dumbbells: { near: true, far: true, angle: 90 },
    floor: true,
    primary: ["biceps", "antebrazo"],
    secondary: [],
    cues: [
      "Palmas enfrentadas (como sosteniendo un martillo) durante todo el recorrido.",
      "Codos fijos al costado; sube hasta que el antebrazo quede vertical.",
      "Baja en 2–3 segundos para cuidar el codo.",
    ],
  },
  elevaciones_laterales: {
    view: "front",
    start: {
      hip: { x: 100, y: 112 },
      torso: 180,
      near: { upper: 8, flex: 10 },
      far: { upper: 8, flex: 10 },
      legNear: { thigh: 6, knee: 0 },
      legFar: { thigh: 6, knee: 0 },
    },
    end: {
      hip: { x: 100, y: 112 },
      torso: 180,
      near: { upper: 88, flex: 10 },
      far: { upper: 88, flex: 10 },
      legNear: { thigh: 6, knee: 0 },
      legFar: { thigh: 6, knee: 0 },
    },
    dumbbells: { near: true, far: true },
    floor: true,
    primary: ["deltoide_lateral"],
    secondary: ["deltoide_anterior", "espalda_alta"],
    cues: [
      "Sube los brazos hasta la altura de los hombros, codos un poco flexionados.",
      "Lidera con los codos, como si vertieras agua de una jarra al final.",
      "Peso liviano y muchas repeticiones: sin impulso ni encoger los hombros.",
    ],
  },
  sentadilla_bulgara: {
    view: "side",
    start: {
      hip: { x: 100, y: 108 },
      torso: 176,
      near: straightDown,
      far: straightDown,
      legNear: { thigh: 8, knee: 8 },
      legFar: { thigh: 320, knee: 95, foot: 190 },
    },
    end: {
      hip: { x: 96, y: 136 },
      torso: 165,
      near: straightDown,
      far: straightDown,
      legNear: { thigh: 85, knee: 85 },
      legFar: { thigh: 330, knee: 130, foot: 190 },
    },
    dumbbells: { near: true, far: true, angle: 90 },
    props: [{ kind: "bench", x: 22, y: 140, w: 50 }],
    floor: true,
    primary: ["cuadriceps", "gluteos"],
    secondary: ["isquios", "aductores"],
    cues: [
      "Empeine trasero sobre la banca; el pie delantero lo bastante adelante para que la rodilla no pase la punta.",
      "Baja recto hasta que el muslo delantero quede paralelo al suelo.",
      "Empuja con el talón delantero; el torso puede inclinarse un poco hacia adelante.",
    ],
  },
  peso_muerto_rumano: {
    view: "side",
    start: standing(100, 108),
    end: {
      hip: { x: 88, y: 112 },
      torso: 100,
      head: -15,
      near: straightDown,
      far: straightDown,
      legNear: { thigh: 350, knee: 12 },
      legFar: { thigh: 350, knee: 12 },
    },
    dumbbells: { near: true, far: true },
    floor: true,
    primary: ["isquios", "gluteos"],
    secondary: ["lumbar", "espalda_alta", "antebrazo"],
    cues: [
      "Lleva la cadera hacia atrás con las rodillas apenas flexionadas; la espalda siempre recta.",
      "Las mancuernas bajan rozando los muslos hasta sentir estirar los isquios (más o menos a la rodilla).",
      "Sube apretando los glúteos; no termines inclinándote hacia atrás.",
    ],
  },
  sentadilla_goblet: {
    view: "side",
    start: {
      ...standing(100, 108),
      near: { upper: 25, flex: 150 },
      far: { upper: 25, flex: 150 },
    },
    end: {
      hip: { x: 90, y: 138 },
      torso: 165,
      near: { upper: 25, flex: 150 },
      far: { upper: 25, flex: 150 },
      legNear: { thigh: 80, knee: 105 },
      legFar: { thigh: 80, knee: 105 },
    },
    dumbbells: { near: true, angle: 90 },
    floor: true,
    primary: ["cuadriceps", "gluteos"],
    secondary: ["abdominales", "aductores"],
    cues: [
      "Sostén la mancuerna vertical contra el pecho, codos abajo.",
      "Pies al ancho de hombros, puntas un poco hacia afuera; baja entre las rodillas.",
      "Baja todo lo que puedas con la espalda recta y los talones en el suelo.",
    ],
  },
  hip_thrust: {
    view: "side",
    start: {
      hip: { x: 100, y: 150 },
      torso: 232,
      head: 40,
      near: { upper: 105, flex: 40 },
      far: { upper: 105, flex: 40 },
      legNear: { thigh: 95, knee: 95 },
      legFar: { thigh: 95, knee: 95 },
    },
    end: {
      hip: { x: 100, y: 124 },
      torso: 270,
      head: 60,
      near: { upper: 90, flex: 10 },
      far: { upper: 90, flex: 10 },
      legNear: { thigh: 50, knee: 50 },
      legFar: { thigh: 50, knee: 50 },
    },
    dumbbells: { near: true },
    props: [{ kind: "bench", x: 20, y: 124, w: 45 }],
    floor: true,
    primary: ["gluteos"],
    secondary: ["isquios", "lumbar"],
    cues: [
      "Apoya la parte alta de la espalda en la banca; la mancuerna va sobre la cadera.",
      "Sube hasta que el tronco quede horizontal, apretando fuerte los glúteos arriba.",
      "Mentón hacia el pecho y costillas abajo: que suba la cadera, no la espalda baja.",
    ],
  },
  pantorrilla_una_pierna: {
    view: "side",
    start: {
      hip: { x: 100, y: 108 },
      torso: 180,
      near: { upper: 80, flex: 20 },
      far: straightDown,
      legNear: { thigh: 0, knee: 0, foot: 90 },
      legFar: { thigh: 0, knee: 80 },
    },
    end: {
      hip: { x: 100, y: 100 },
      torso: 180,
      near: { upper: 80, flex: 20 },
      far: straightDown,
      legNear: { thigh: 0, knee: 0, foot: 55 },
      legFar: { thigh: 0, knee: 80 },
    },
    dumbbells: { far: true },
    props: [{ kind: "wall", x: 150 }, { kind: "step", x: 86, w: 22, h: 10 }],
    floor: true,
    primary: ["gemelos"],
    secondary: [],
    cues: [
      "Punta del pie en un escalón, el talón libre; la otra mano apoyada para equilibrarte.",
      "Baja el talón todo lo posible y sube hasta quedar en puntillas, con pausa arriba.",
      "La mancuerna va en la mano del mismo lado de la pierna que trabaja.",
    ],
  },
  abdominal_mancuerna: {
    view: "side",
    start: {
      hip: { x: 100, y: 170 },
      torso: 270,
      head: 20,
      near: { upper: 95, flex: 130 },
      far: { upper: 95, flex: 130 },
      legNear: { thigh: 140, knee: 125 },
      legFar: { thigh: 140, knee: 125 },
    },
    end: {
      hip: { x: 100, y: 170 },
      torso: 225,
      head: 20,
      near: { upper: 140, flex: 130 },
      far: { upper: 140, flex: 130 },
      legNear: { thigh: 140, knee: 125 },
      legFar: { thigh: 140, knee: 125 },
    },
    dumbbells: { near: true },
    floor: true,
    primary: ["abdominales"],
    secondary: ["oblicuos"],
    cues: [
      "Acostado con las rodillas flexionadas, mancuerna abrazada contra el pecho.",
      "Despega los omóplatos enrollando la columna; la zona lumbar se queda en el suelo.",
      "Exhala al subir y baja lento sin tirar del cuello.",
    ],
  },
  press_inclinado: {
    view: "side",
    start: {
      hip: { x: 104, y: 124 },
      torso: 232,
      head: 15,
      near: { upper: 20, flex: 125 },
      far: { upper: 20, flex: 125 },
      legNear: { thigh: 70, knee: 70 },
      legFar: { thigh: 80, knee: 80 },
    },
    end: {
      hip: { x: 104, y: 124 },
      torso: 232,
      head: 15,
      near: { upper: 145, flex: 0 },
      far: { upper: 145, flex: 0 },
      legNear: { thigh: 70, knee: 70 },
      legFar: { thigh: 80, knee: 80 },
    },
    dumbbells: { near: true, far: true },
    props: [{ kind: "bench", x: 58, y: 128, w: 56, angle: -38 }, { kind: "bench", x: 92, y: 128, w: 30 }],
    floor: true,
    primary: ["pecho", "deltoide_anterior"],
    secondary: ["triceps"],
    cues: [
      "Banca a 30–45°; glúteos y espalda alta apoyados.",
      "Baja las mancuernas hacia la parte alta del pecho, codos a unos 45° del cuerpo.",
      "Empuja en diagonal hacia arriba juntando un poco las mancuernas al final.",
    ],
  },
  remo_pecho_apoyado: {
    view: "side",
    start: {
      hip: { x: 84, y: 124 },
      torso: 128,
      head: -15,
      near: { upper: 5, flex: 5 },
      far: { upper: 5, flex: 5 },
      legNear: { thigh: 15, knee: 15 },
      legFar: { thigh: 25, knee: 25 },
    },
    end: {
      hip: { x: 84, y: 124 },
      torso: 128,
      head: -15,
      near: { upper: 300, flex: 75 },
      far: { upper: 300, flex: 75 },
      legNear: { thigh: 15, knee: 15 },
      legFar: { thigh: 25, knee: 25 },
    },
    dumbbells: { near: true, far: true },
    props: [{ kind: "bench", x: 90, y: 118, w: 60, angle: -52 }],
    floor: true,
    primary: ["espalda_alta", "dorsales"],
    secondary: ["biceps", "deltoide_posterior", "antebrazo"],
    cues: [
      "Pecho apoyado en la banca inclinada: así no haces trampa con el impulso.",
      "Tira de los codos hacia atrás y arriba juntando los omóplatos al final.",
      "Baja hasta estirar por completo los brazos, con el cuello neutro.",
    ],
  },
  pullover: {
    view: "side",
    start: supine({ upper: 255, flex: 20 }),
    end: supine({ upper: 165, flex: 20 }),
    dumbbells: { near: true },
    props: [FLAT_BENCH],
    floor: true,
    primary: ["dorsales", "pecho"],
    secondary: ["triceps", "abdominales"],
    cues: [
      "Una sola mancuerna sujeta con las dos manos por el disco de arriba.",
      "Baja por detrás de la cabeza con los codos apenas flexionados hasta sentir estirar el dorsal.",
      "Vuelve hasta que quede sobre el pecho; las costillas no se levantan.",
    ],
  },
  press_cerrado_triceps: {
    view: "side",
    start: supine({ upper: 70, flex: 115 }),
    end: supine({ upper: 180, flex: 0 }),
    dumbbells: { near: true, far: true, angle: 90 },
    props: [FLAT_BENCH],
    floor: true,
    primary: ["triceps"],
    secondary: ["pecho", "deltoide_anterior"],
    cues: [
      "Mancuernas juntas con las palmas enfrentadas, codos pegados al cuerpo.",
      "Baja hasta la parte baja del pecho manteniendo los codos cerrados.",
      "Estira los brazos del todo arriba apretando el tríceps.",
    ],
  },
  curl_predicador_unilateral: {
    view: "side",
    start: {
      hip: { x: 96, y: 118 },
      torso: 175,
      near: { upper: 50, flex: 5 },
      far: { upper: 50, flex: 5 },
      legNear: { thigh: 90, knee: 90 },
      legFar: { thigh: 90, knee: 90 },
    },
    end: {
      hip: { x: 96, y: 118 },
      torso: 175,
      near: { upper: 50, flex: 125 },
      far: { upper: 50, flex: 5 },
      legNear: { thigh: 90, knee: 90 },
      legFar: { thigh: 90, knee: 90 },
    },
    dumbbells: { near: true },
    props: [
      { kind: "bench", x: 64, y: 122, w: 50 },
      { kind: "pad", x: 122, y: 76, w: 34, angle: 50 },
    ],
    floor: true,
    primary: ["biceps"],
    secondary: ["antebrazo"],
    cues: [
      "Parte alta del brazo apoyada por completo en la banca inclinada (o en el respaldo).",
      "Sube hasta que el antebrazo quede vertical; no levantes el codo del apoyo.",
      "Baja muy lento sin estirar de golpe: el codo sufre en esa posición.",
    ],
  },
  curl_martillo_cruzado: {
    view: "side",
    start: curlPose(0, 0),
    end: curlPose(160, 20),
    dumbbells: { near: true, far: true, angle: 90 },
    floor: true,
    primary: ["biceps", "antebrazo"],
    secondary: [],
    cues: [
      "Agarre martillo, pero la mancuerna sube cruzando hacia el hombro contrario.",
      "El codo se queda pegado al costado durante todo el recorrido.",
      "Alterna brazos y controla la bajada.",
    ],
  },
  pajaros_pecho_apoyado: {
    view: "side",
    start: {
      hip: { x: 84, y: 124 },
      torso: 128,
      head: -15,
      near: { upper: 10, flex: 20 },
      far: { upper: 10, flex: 20 },
      legNear: { thigh: 15, knee: 15 },
      legFar: { thigh: 25, knee: 25 },
    },
    end: {
      hip: { x: 84, y: 124 },
      torso: 128,
      head: -15,
      near: { upper: 275, flex: 20 },
      far: { upper: 275, flex: 20 },
      legNear: { thigh: 15, knee: 15 },
      legFar: { thigh: 25, knee: 25 },
    },
    dumbbells: { near: true, far: true },
    props: [{ kind: "bench", x: 90, y: 118, w: 60, angle: -52 }],
    floor: true,
    primary: ["deltoide_posterior"],
    secondary: ["espalda_alta"],
    cues: [
      "Pecho apoyado en la banca inclinada, brazos colgando con codos un poco flexionados.",
      "Abre los brazos hacia los lados hasta la altura de los hombros, meñiques arriba.",
      "Peso liviano: el movimiento es corto y lo manda el hombro posterior, no el impulso.",
    ],
  },
  zancada_atras: {
    view: "side",
    start: standing(100, 108),
    end: {
      hip: { x: 96, y: 136 },
      torso: 172,
      near: straightDown,
      far: straightDown,
      legNear: { thigh: 88, knee: 88 },
      legFar: { thigh: 325, knee: 65, foot: 150 },
    },
    dumbbells: { near: true, far: true, angle: 90 },
    floor: true,
    primary: ["cuadriceps", "gluteos"],
    secondary: ["isquios", "aductores"],
    cues: [
      "Da el paso hacia atrás y baja hasta que la rodilla de atrás casi toque el suelo.",
      "La rodilla delantera sobre el tobillo; el peso en el talón de adelante.",
      "Vuelve empujando con la pierna delantera y alterna.",
    ],
  },
  rdl_una_pierna: {
    view: "side",
    start: standing(100, 108),
    end: {
      hip: { x: 90, y: 110 },
      torso: 95,
      head: -10,
      near: straightDown,
      far: straightDown,
      legNear: { thigh: 355, knee: 15 },
      legFar: { thigh: 265, knee: 5, foot: 200 },
    },
    dumbbells: { near: true, far: true },
    floor: true,
    primary: ["isquios", "gluteos"],
    secondary: ["lumbar", "gemelos", "abdominales"],
    cues: [
      "Inclínate hacia adelante levantando la pierna contraria atrás, como una balanza.",
      "Cadera cuadrada (que no se abra) y la rodilla de apoyo apenas flexionada.",
      "Baja hasta sentir el estiramiento atrás del muslo y vuelve apretando el glúteo.",
    ],
  },
  goblet_amplia: {
    view: "side",
    start: {
      ...standing(100, 108),
      near: { upper: 25, flex: 150 },
      far: { upper: 25, flex: 150 },
      legNear: { thigh: 8, knee: 0 },
      legFar: { thigh: 352, knee: 0 },
    },
    end: {
      hip: { x: 94, y: 136 },
      torso: 170,
      near: { upper: 25, flex: 150 },
      far: { upper: 25, flex: 150 },
      legNear: { thigh: 75, knee: 95 },
      legFar: { thigh: 75, knee: 95 },
    },
    dumbbells: { near: true, angle: 90 },
    floor: true,
    primary: ["gluteos", "aductores", "cuadriceps"],
    secondary: ["abdominales"],
    cues: [
      "Pies bastante más anchos que los hombros y puntas hacia afuera (postura de sumo).",
      "Baja empujando las rodillas hacia afuera, siguiendo la dirección de los pies.",
      "Torso lo más vertical posible, mancuerna pegada al pecho.",
    ],
  },
  hip_thrust_una_pierna: {
    view: "side",
    start: {
      hip: { x: 100, y: 150 },
      torso: 232,
      head: 40,
      near: { upper: 105, flex: 40 },
      far: { upper: 105, flex: 40 },
      legNear: { thigh: 95, knee: 95 },
      legFar: { thigh: 115, knee: 0 },
    },
    end: {
      hip: { x: 100, y: 124 },
      torso: 270,
      head: 60,
      near: { upper: 90, flex: 10 },
      far: { upper: 90, flex: 10 },
      legNear: { thigh: 50, knee: 50 },
      legFar: { thigh: 90, knee: 0 },
    },
    props: [{ kind: "bench", x: 20, y: 124, w: 45 }],
    floor: true,
    primary: ["gluteos"],
    secondary: ["isquios", "abdominales"],
    cues: [
      "Igual que el hip thrust, pero con una pierna estirada al aire.",
      "Sube hasta que la cadera quede alineada con el tronco; que no rote hacia el lado libre.",
      "Pausa un segundo arriba apretando el glúteo y baja controlado.",
    ],
  },
  pantorrillas: {
    view: "side",
    start: { ...standing(100, 108), legNear: { thigh: 0, knee: 0, foot: 90 }, legFar: { thigh: 0, knee: 0, foot: 90 } },
    end: { ...standing(100, 100), legNear: { thigh: 0, knee: 0, foot: 55 }, legFar: { thigh: 0, knee: 0, foot: 55 } },
    dumbbells: { near: true, far: true },
    props: [{ kind: "step", x: 86, w: 24, h: 10 }],
    floor: true,
    primary: ["gemelos"],
    secondary: [],
    cues: [
      "Puntas de los pies en el borde de un escalón, mancuernas colgando a los lados.",
      "Baja el talón hasta sentir el estiramiento y sube a puntillas con pausa arriba.",
      "Rodillas estiradas pero no bloqueadas; recorrido completo y lento.",
    ],
  },
  plancha_lateral: {
    view: "side",
    start: {
      hip: { x: 104, y: 152 },
      torso: 258,
      head: 0,
      near: { upper: 5, flex: 90 },
      far: { upper: 190, flex: 0 },
      legNear: { thigh: 102, knee: 0, foot: 10 },
      legFar: { thigh: 102, knee: 0, foot: 10 },
    },
    end: {
      hip: { x: 104, y: 146 },
      torso: 258,
      head: 0,
      near: { upper: 5, flex: 90 },
      far: { upper: 190, flex: 0 },
      legNear: { thigh: 100, knee: 0, foot: 10 },
      legFar: { thigh: 100, knee: 0, foot: 10 },
    },
    floor: true,
    primary: ["oblicuos", "abdominales"],
    secondary: ["gluteos", "deltoide_lateral"],
    cues: [
      "Codo justo debajo del hombro y el cuerpo en una línea recta de cabeza a pies.",
      "Empuja la cadera hacia arriba: que no se hunda. Aguanta el tiempo indicado por lado.",
      "Alternativa: de pie, sostén una mancuerna pesada a un lado sin inclinarte (paseo del granjero a una mano).",
    ],
  },
  pajaros_posterior: {
    view: "side",
    start: {
      hip: { x: 92, y: 112 },
      torso: 110,
      head: -20,
      near: { upper: 10, flex: 20 },
      far: { upper: 10, flex: 20 },
      legNear: { thigh: 350, knee: 15 },
      legFar: { thigh: 350, knee: 15 },
    },
    end: {
      hip: { x: 92, y: 112 },
      torso: 110,
      head: -20,
      near: { upper: 280, flex: 20 },
      far: { upper: 280, flex: 20 },
      legNear: { thigh: 350, knee: 15 },
      legFar: { thigh: 350, knee: 15 },
    },
    dumbbells: { near: true, far: true },
    floor: true,
    primary: ["deltoide_posterior"],
    secondary: ["espalda_alta"],
    cues: [
      "Inclinado hacia adelante con la espalda recta (o con el pecho apoyado en la banca).",
      "Abre los brazos hasta la altura de los hombros con los codos un poco flexionados.",
      "Peso liviano, sin impulso; aprieta atrás del hombro al final.",
    ],
  },
  curl_predicador_ligero: {
    view: "side",
    start: {
      hip: { x: 96, y: 118 },
      torso: 175,
      near: { upper: 50, flex: 5 },
      far: { upper: 50, flex: 5 },
      legNear: { thigh: 90, knee: 90 },
      legFar: { thigh: 90, knee: 90 },
    },
    end: {
      hip: { x: 96, y: 118 },
      torso: 175,
      near: { upper: 50, flex: 125 },
      far: { upper: 50, flex: 125 },
      legNear: { thigh: 90, knee: 90 },
      legFar: { thigh: 90, knee: 90 },
    },
    dumbbells: { near: true, far: true },
    props: [
      { kind: "bench", x: 64, y: 122, w: 50 },
      { kind: "pad", x: 122, y: 76, w: 34, angle: 50 },
    ],
    floor: true,
    primary: ["biceps"],
    secondary: ["antebrazo"],
    cues: [
      "Versión liviana del predicador: el objetivo es bombear sangre, no cargar.",
      "Brazos apoyados en la banca inclinada; recorrido completo y controlado.",
      "Si el codo molesta, acorta el estiramiento final.",
    ],
  },
  sosten_pesado: {
    view: "front",
    start: {
      hip: { x: 100, y: 112 },
      torso: 180,
      near: { upper: 6, flex: 0 },
      far: { upper: 6, flex: 0 },
      legNear: { thigh: 6, knee: 0 },
      legFar: { thigh: 6, knee: 0 },
    },
    end: {
      hip: { x: 100, y: 111 },
      torso: 180,
      near: { upper: 7, flex: 0 },
      far: { upper: 7, flex: 0 },
      legNear: { thigh: 6, knee: 0 },
      legFar: { thigh: 6, knee: 0 },
    },
    dumbbells: { near: true, far: true },
    floor: true,
    primary: ["antebrazo", "espalda_alta"],
    secondary: ["abdominales", "gluteos"],
    cues: [
      "Las mancuernas más pesadas que puedas sujetar, una en cada mano, de pie y derecho.",
      "Hombros atrás y abajo, abdomen firme; aguanta hasta que el agarre falle.",
      "Anota los segundos: la meta es aguantar un poco más cada semana.",
    ],
  },
};

export function exerciseInfo(key: string): ExerciseInfo | null {
  return EXERCISE_INFO[key] ?? null;
}
