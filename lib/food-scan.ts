import { generateJson, type Part } from "./gemini";
import type { FoodItem, FoodScan } from "./types";

const PROMPT = `Eres un nutricionista que estima calorías y macronutrientes a partir de una foto de comida (normalmente comida chilena o casera).
Devuelve SOLO el JSON pedido.
- is_food: false si la imagen no muestra comida ni bebida.
- name: nombre corto del plato o la comida completa ("Pollo con arroz y ensalada", "Café con leche y tostadas").
- items: cada alimento visible por separado, con su porción estimada en gramos (o ml para líquidos) y sus calorías,
  proteína, carbohidratos y grasa en gramos para ESA porción. Estima el tamaño usando referencias visibles
  (plato ≈ 26 cm, tenedor, taza ≈ 250 ml, lata ≈ 350 ml). Si el usuario escribe un comentario, úsalo para corregir
  porciones o ingredientes (por ejemplo "medio plato", "sin aceite", "son 200 g de carne").
- calories, protein_g, carbs_g, fat_g: la suma de todos los items.
- confidence: "alta" si el plato es claro y las porciones se ven bien; "media" si hay que suponer bastante;
  "baja" si la foto es confusa, parcial u oscura.
- notes: una frase corta en español con lo que supusiste (porciones, preparación) para que el usuario lo corrija.
Usa punto decimal, números razonables (nunca negativos) y redondea a enteros.`;

const ITEM_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    grams: { type: "number" },
    calories: { type: "number" },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
  },
  required: ["name", "grams", "calories", "protein_g", "carbs_g", "fat_g"],
};

const SCHEMA = {
  type: "object",
  properties: {
    is_food: { type: "boolean" },
    name: { type: "string" },
    items: { type: "array", items: ITEM_SCHEMA },
    calories: { type: "number" },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
    confidence: { type: "string", enum: ["alta", "media", "baja"] },
    notes: { type: "string" },
  },
  required: ["is_food", "name", "items", "calories", "protein_g", "carbs_g", "fat_g", "confidence", "notes"],
};

/** Analiza una foto de comida con Gemini y devuelve los datos ya validados. */
export async function scanFood(opts: {
  apiKey: string;
  model?: string;
  base64: string;
  mimeType: string;
  hint?: string;
}): Promise<FoodScan> {
  const prompt = opts.hint?.trim() ? `${PROMPT}\n\nComentario del usuario: "${opts.hint.trim().slice(0, 300)}"` : PROMPT;
  const parts: Part[] = [{ inlineData: { mimeType: opts.mimeType, data: opts.base64 } }, { text: prompt }];
  return sanitize(await generateJson({ apiKey: opts.apiKey, model: opts.model, parts, schema: SCHEMA }));
}

/** Estima una comida descrita con texto (sin foto). */
export async function scanFoodText(opts: { apiKey: string; model?: string; text: string }): Promise<FoodScan> {
  const prompt = `${PROMPT}\n\nNo hay foto: el usuario describe la comida con texto. Estima con porciones típicas chilenas si no dice cantidades.\nDescripción: "${opts.text.trim().slice(0, 500)}"`;
  return sanitize(await generateJson({ apiKey: opts.apiKey, model: opts.model, parts: [{ text: prompt }], schema: SCHEMA }));
}

const num = (v: unknown, max = 100_000) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), max) : 0;
};

function sanitize(raw: Record<string, unknown>): FoodScan {
  const items: FoodItem[] = Array.isArray(raw.items)
    ? raw.items.slice(0, 20).map((it) => {
        const i = (it ?? {}) as Record<string, unknown>;
        return {
          name: typeof i.name === "string" ? i.name.trim().slice(0, 60) : "Alimento",
          grams: num(i.grams, 5000),
          calories: num(i.calories, 5000),
          protein_g: num(i.protein_g, 1000),
          carbs_g: num(i.carbs_g, 1000),
          fat_g: num(i.fat_g, 1000),
        };
      })
    : [];
  const sum = (k: keyof FoodItem) => items.reduce((s, i) => s + (i[k] as number), 0);
  // Si hay items, los totales salen de la suma (más consistente que el total del modelo).
  const calories = items.length ? sum("calories") : num(raw.calories, 10_000);
  const confidence = (["alta", "media", "baja"] as const).includes(raw.confidence as "alta")
    ? (raw.confidence as FoodScan["confidence"])
    : "media";
  return {
    is_food: raw.is_food !== false,
    name: typeof raw.name === "string" ? raw.name.trim().slice(0, 80) : "",
    items,
    calories,
    protein_g: items.length ? sum("protein_g") : num(raw.protein_g, 1000),
    carbs_g: items.length ? sum("carbs_g") : num(raw.carbs_g, 1000),
    fat_g: items.length ? sum("fat_g") : num(raw.fat_g, 1000),
    confidence,
    notes: typeof raw.notes === "string" ? raw.notes.trim().slice(0, 300) : "",
  };
}
