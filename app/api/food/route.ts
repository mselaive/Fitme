import { scanFood, scanFoodText } from "@/lib/food-scan";
import { geminiErrorMessage } from "@/lib/gemini";
import { getUserId } from "@/lib/supabase/server";

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "No autenticado" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "El análisis no está configurado (falta GEMINI_API_KEY)" }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  const hint = typeof form?.get("hint") === "string" ? String(form.get("hint")) : "";
  const hasImage = file instanceof File && file.size > 0;

  if (!hasImage && !hint.trim()) {
    return Response.json({ error: "Falta la foto o la descripción" }, { status: 400 });
  }
  if (hasImage && file.size > MAX_BYTES) {
    return Response.json({ error: "La imagen es demasiado grande" }, { status: 413 });
  }

  try {
    const model = process.env.GEMINI_MODEL;
    const result = hasImage
      ? await scanFood({
          apiKey,
          model,
          base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
          mimeType: file.type || "image/jpeg",
          hint,
        })
      : await scanFoodText({ apiKey, model, text: hint });
    return Response.json(result);
  } catch (e) {
    console.error("food scan error", e);
    return Response.json({ error: geminiErrorMessage(e, "No se pudo analizar la comida. Escribe los datos a mano.") }, { status: 502 });
  }
}
