"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useApp } from "./app-provider";
import type { CoachAdvice } from "@/lib/coach";

const KEY = "fitme:coach";

/** Consejo semanal generado con Gemini a partir de los últimos 14 días. Se guarda en el navegador por día. */
export function CoachCard() {
  const { today, toast } = useApp();
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CoachAdvice;
        if (parsed.generated_at?.slice(0, 10) === today) setAdvice(parsed);
      }
    } catch {
      // sin almacenamiento local: se pide de nuevo
    }
  }, [today]);

  async function ask() {
    setLoading(true);
    try {
      const res = await fetch("/api/coach", { method: "POST" });
      const json = (await res.json()) as CoachAdvice & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error");
      setAdvice(json);
      try {
        localStorage.setItem(KEY, JSON.stringify(json));
      } catch {
        // sin almacenamiento local
      }
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted">
          <Sparkles className="size-4 text-accent" /> Coach (Gemini)
        </div>
        {advice && (
          <button className="btn-ghost" onClick={ask} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
        )}
      </div>
      {!advice ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">Analiza tus últimas dos semanas (pesas, trotes, comidas y peso) y te dice qué va bien, qué mejorar y qué hacer en la próxima sesión.</p>
          <button className="btn-primary w-full" onClick={ask} disabled={loading}>
            {loading ? "Pensando…" : "Pedir consejo de la semana"}
          </button>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p>{advice.resumen}</p>
          <Block title="Lo que va bien" items={advice.logros} tone="text-ok" />
          <Block title="Para mejorar" items={advice.mejoras} tone="text-warn" />
          <Block title="Próxima sesión" items={advice.proxima_sesion} tone="text-accent" />
          <p className="text-[11px] text-muted">Generado {new Date(advice.generated_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })} · es una orientación, no un consejo médico.</p>
        </div>
      )}
    </section>
  );
}

function Block({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`text-xs font-semibold ${tone}`}>{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
