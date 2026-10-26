import { GoogleGenAI } from "@google/genai";

/*
 * Cliente mínimo de Gemini para pedir JSON con esquema.
 * Si un modelo está saturado (503) o sin cuota gratis (429) probamos el siguiente:
 * en la capa gratuita las cuotas son por modelo.
 */
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash"];
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
// Gemini rechaza plazos (deadline) menores a 10 s; cortamos nosotros un segundo antes.
const SERVER_DEADLINE_MS = 20_000;
const ATTEMPT_TIMEOUT_MS = 19_000;
// Si el modelo en curso no respondió en este tiempo, lanzamos el siguiente en paralelo.
const HEDGE_DELAY_MS = 7_000;

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

function shouldTryNextModel(e: unknown) {
  const err = e as { status?: number; name?: string; message?: string };
  if (err.status) return RETRYABLE.has(err.status);
  return (
    err.name === "AbortError" ||
    err.name === "TimeoutError" ||
    /abort|timeout|timed out|fetch failed/i.test(err.message ?? "")
  );
}

/** Pide a Gemini una respuesta JSON que cumpla `schema`. Devuelve el objeto ya parseado (sin validar). */
export async function generateJson(opts: {
  apiKey: string;
  model?: string;
  parts: Part[];
  schema: object;
  temperature?: number;
}): Promise<Record<string, unknown>> {
  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  const models = [...new Set([opts.model, ...FALLBACK_MODELS].filter(Boolean) as string[])];
  return firstSuccessful(models, async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: opts.parts }],
      config: {
        httpOptions: { timeout: SERVER_DEADLINE_MS, retryOptions: { attempts: 1 } },
        abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        responseMimeType: "application/json",
        responseJsonSchema: opts.schema,
        temperature: opts.temperature ?? 0.2,
      },
    });
    return JSON.parse(response.text ?? "{}") as Record<string, unknown>;
  });
}

/**
 * Prueba los modelos en orden, escalonados: si uno falla con un error recuperable se lanza el
 * siguiente de inmediato, y si solo tarda se lanza el siguiente en paralelo tras HEDGE_DELAY_MS.
 * Gana la primera respuesta correcta.
 */
function firstSuccessful<T>(models: string[], run: (model: string) => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let next = 0;
    let running = 0;
    let settled = false;
    let lastError: unknown;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const launch = () => {
      clearTimeout(timer);
      if (settled || next >= models.length) return;
      const model = models[next++];
      running++;
      run(model)
        .then(
          (result) => finish(() => resolve(result)),
          (e) => {
            lastError = e;
            if (!shouldTryNextModel(e)) return finish(() => reject(e));
            console.warn(
              `Gemini ${model} falló (${(e as { status?: number }).status ?? (e as Error).message}), probando otro modelo`,
            );
            launch();
          },
        )
        .finally(() => {
          running--;
          if (running === 0 && next >= models.length) finish(() => reject(lastError));
        });
      timer = setTimeout(launch, HEDGE_DELAY_MS);
    };

    launch();
  });
}

/** Mensaje para el usuario según el error de Gemini. */
export function geminiErrorMessage(e: unknown, fallback: string) {
  const status = (e as { status?: number }).status;
  return status === 429 ? "Se alcanzó el límite gratuito de Gemini por ahora. Intenta en un minuto." : fallback;
}
