import { askCoach, buildCoachContext } from "@/lib/coach";
import { geminiErrorMessage } from "@/lib/gemini";
import { createClient, getUserId } from "@/lib/supabase/server";

export async function POST() {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "No autenticado" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: "El coach no está configurado (falta GEMINI_API_KEY)" }, { status: 503 });

  try {
    const supabase = await createClient();
    const context = await buildCoachContext(supabase, userId);
    const advice = await askCoach({ apiKey, model: process.env.GEMINI_MODEL, context });
    return Response.json(advice);
  } catch (e) {
    console.error("coach error", e);
    return Response.json({ error: geminiErrorMessage(e, "No se pudo generar el consejo. Intenta de nuevo.") }, { status: 502 });
  }
}
