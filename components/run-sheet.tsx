"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Sheet } from "./sheet";
import { useApp } from "./app-provider";
import { fmtDuration, fmtPace, parseDuration } from "@/lib/format";
import { runCalories } from "@/lib/nutrition";
import type { Run } from "@/lib/types";

/** Anotar o editar un trote. */
export function RunSheet({
  run,
  defaultDate,
  onClose,
  onSaved,
}: {
  run?: Run | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: (run: Run | null) => void;
}) {
  const { supabase, userId, weightKg, toast } = useApp();
  const [date, setDate] = useState(run?.date ?? defaultDate);
  const [distance, setDistance] = useState(run ? String(run.distance_km).replace(".", ",") : "");
  const [duration, setDuration] = useState(run ? fmtDuration(run.duration_sec) : "");
  const [notes, setNotes] = useState(run?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const km = Number(distance.replace(",", "."));
  const sec = parseDuration(duration);
  const valid = km > 0 && sec != null && sec > 0;

  async function save() {
    if (!valid || !sec) return;
    setSaving(true);
    const payload = { user_id: userId, date, distance_km: km, duration_sec: sec, notes: notes.trim() || null };
    const query = run
      ? supabase.from("runs").update(payload).eq("id", run.id)
      : supabase.from("runs").insert(payload);
    const { data, error } = await query.select("id, date, distance_km, duration_sec, notes").single();
    setSaving(false);
    if (error || !data) {
      toast(`No se pudo guardar: ${error?.message ?? ""}`, "bad");
      return;
    }
    toast(run ? "Trote actualizado" : "Trote guardado 🏃");
    onSaved({ ...data, distance_km: Number(data.distance_km) });
  }

  async function remove() {
    if (!run || !confirm("¿Borrar este trote?")) return;
    const { error } = await supabase.from("runs").delete().eq("id", run.id);
    if (error) return toast(`No se pudo borrar: ${error.message}`, "bad");
    toast("Trote borrado");
    onSaved(null);
  }

  return (
    <Sheet title={run ? "Editar trote" : "Anotar trote"} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="label">Fecha</span>
          <input type="date" className="input" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Distancia (km)</span>
            <input
              className="input"
              inputMode="decimal"
              placeholder="5,0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              autoFocus={!run}
            />
          </label>
          <label className="block">
            <span className="label">Tiempo (mm:ss)</span>
            <input
              className="input"
              inputMode="numeric"
              placeholder="30:00"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
        </div>
        {valid && sec && (
          <div className="flex items-center justify-between rounded-xl bg-accent-soft px-4 py-3 text-sm">
            <span className="text-muted">Ritmo</span>
            <span className="font-semibold text-accent">{fmtPace(km, sec)}</span>
            <span className="text-muted">≈ {runCalories(km, weightKg)} kcal</span>
          </div>
        )}
        <label className="block">
          <span className="label">Notas (opcional)</span>
          <input className="input" placeholder="Cómo te sentiste, ruta…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button className="btn-primary w-full" disabled={!valid || saving} onClick={save}>
          {saving ? "Guardando…" : run ? "Guardar cambios" : "Guardar trote"}
        </button>
        {run && (
          <button className="btn-ghost mx-auto flex text-bad" onClick={remove}>
            <Trash2 className="size-4" /> Borrar trote
          </button>
        )}
      </div>
    </Sheet>
  );
}
