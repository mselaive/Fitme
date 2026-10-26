"use client";

import { useState } from "react";
import { Sheet } from "./sheet";
import { useApp } from "./app-provider";
import { fmtKg, fmtRelative } from "@/lib/format";

/** Anotar el peso corporal de un día. */
export function WeightSheet({ onClose }: { onClose: () => void }) {
  const { today, weights, logWeight, toast } = useApp();
  const last = weights[0] ?? null;
  const [date, setDate] = useState(today);
  const [value, setValue] = useState(last ? String(last.weight_kg).replace(".", ",") : "");
  const [saving, setSaving] = useState(false);
  const kg = Number(value.replace(",", "."));
  const valid = kg > 20 && kg < 400;

  async function save() {
    if (!valid) return;
    setSaving(true);
    const ok = await logWeight(date, Math.round(kg * 10) / 10);
    setSaving(false);
    if (ok) {
      toast("Peso guardado");
      onClose();
    }
  }

  return (
    <Sheet title="Anotar peso" onClose={onClose}>
      <div className="space-y-4">
        {last && (
          <p className="text-sm text-muted">
            Último: <span className="font-medium text-fg">{fmtKg(last.weight_kg)}</span> · {fmtRelative(last.date, today)}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Peso (kg)</span>
            <input className="input" inputMode="decimal" placeholder="75,0" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
          </label>
          <label className="block">
            <span className="label">Fecha</span>
            <input type="date" className="input" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
        </div>
        <button className="btn-primary w-full" disabled={!valid || saving} onClick={save}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Sheet>
  );
}
