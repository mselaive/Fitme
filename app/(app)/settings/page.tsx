"use client";

import { useEffect, useState } from "react";
import { Download, LogOut, Palette, Share, Smartphone } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { WeightSheet } from "@/components/weight-sheet";
import { signOut } from "@/app/login/actions";
import { fmtKg, fmtNum, fmtRelative } from "@/lib/format";
import { ageFromBirthDate, bmi, bmiLabel, targetsFor } from "@/lib/nutrition";
import { applyTheme, getTheme, THEMES, type Theme } from "@/lib/theme";
import { ACTIVITIES, GOALS, type Profile } from "@/lib/types";

export default function SettingsPage() {
  const { supabase, profile, weightKg, weights, today, updateProfile, toast } = useApp();
  const [form, setForm] = useState<Profile>(profile);
  const [custom, setCustom] = useState(profile.calorie_target != null || profile.protein_target_g != null);
  const [saving, setSaving] = useState(false);
  const [weightSheet, setWeightSheet] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => setTheme(getTheme()), []);

  const preview = targetsFor({ ...form, calorie_target: custom ? form.calorie_target : null, protein_target_g: custom ? form.protein_target_g : null }, weightKg);
  const age = ageFromBirthDate(form.birth_date);
  const imc = bmi(weightKg, form.height_cm);
  const dirty = JSON.stringify(form) !== JSON.stringify(profile) || custom !== (profile.calorie_target != null || profile.protein_target_g != null);

  async function save() {
    setSaving(true);
    const ok = await updateProfile({
      display_name: form.display_name.trim() || profile.display_name,
      sex: form.sex,
      birth_date: form.birth_date || null,
      height_cm: form.height_cm,
      activity: form.activity,
      goal: form.goal,
      calorie_target: custom ? form.calorie_target : null,
      protein_target_g: custom ? form.protein_target_g : null,
    });
    setSaving(false);
    if (ok) toast("Perfil guardado");
  }

  async function exportAll() {
    setExporting(true);
    try {
      const tables = ["weight_logs", "workouts", "workout_sets", "runs", "meals"] as const;
      const out: Record<string, unknown> = { exported_at: new Date().toISOString(), profile };
      for (const t of tables) {
        const rows: unknown[] = [];
        for (let fromRow = 0; ; fromRow += 1000) {
          const { data, error } = await supabase.from(t).select("*").order("created_at").range(fromRow, fromRow + 999);
          if (error) throw error;
          rows.push(...(data ?? []));
          if (!data || data.length < 1000) break;
        }
        out[t] = rows;
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `fitme-${today}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast(`No se pudo exportar: ${(e as Error).message}`, "bad");
    } finally {
      setExporting(false);
    }
  }

  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  return (
    <div className="space-y-4">
      <h1 className="pt-1 text-2xl font-bold">Ajustes</h1>

      <section className="card space-y-4 p-4">
        <h2 className="font-semibold">Tu perfil</h2>
        <label className="block">
          <span className="label">Nombre</span>
          <input className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </label>
        <div>
          <span className="label">Sexo (para el cálculo)</span>
          <div className="seg grid-cols-2">
            {(["m", "f"] as const).map((s) => (
              <button key={s} className={`seg-item ${form.sex === s ? "seg-on" : ""}`} onClick={() => setForm({ ...form, sex: s })}>
                {s === "m" ? "Hombre" : "Mujer"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Fecha de nacimiento {age != null && <span className="font-normal">· {age} años</span>}</span>
            <input type="date" className="input" value={form.birth_date ?? ""} max={today} onChange={(e) => setForm({ ...form, birth_date: e.target.value || null })} />
          </label>
          <label className="block">
            <span className="label">Estatura (cm)</span>
            <input className="input" inputMode="decimal" placeholder="175" value={form.height_cm ?? ""} onChange={(e) => setForm({ ...form, height_cm: num(e.target.value) })} />
          </label>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-bg px-4 py-3">
          <div>
            <p className="text-sm text-muted">Peso actual</p>
            <p className="font-semibold">
              {fmtKg(weightKg)} {weights[0] && <span className="text-xs font-normal text-muted">· {fmtRelative(weights[0].date, today)}</span>}
            </p>
            {imc != null && (
              <p className="text-xs text-muted">
                IMC {fmtNum(imc, 1)} · {bmiLabel(imc)}
              </p>
            )}
          </div>
          <button className="btn-secondary px-3 py-2 text-sm" onClick={() => setWeightSheet(true)}>
            Anotar peso
          </button>
        </div>
        <label className="block">
          <span className="label">Actividad diaria</span>
          <select className="input" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value as Profile["activity"] })}>
            {ACTIVITIES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label} · {a.hint}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="label">Objetivo</span>
          <div className="seg grid-cols-3">
            {GOALS.map((g) => (
              <button key={g.value} className={`seg-item ${form.goal === g.value ? "seg-on" : ""}`} onClick={() => setForm({ ...form, goal: g.value })}>
                {g.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{GOALS.find((g) => g.value === form.goal)?.hint}</p>
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Tus metas</h2>
        {preview.bmr ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Metabolismo basal" value={`${fmtNum(preview.bmr)} kcal`} />
            <Stat label="Gasto diario" value={`${fmtNum(preview.tdee ?? 0)} kcal`} />
            <Stat label="Meta del día" value={`${fmtNum(preview.calories ?? 0)} kcal`} accent />
          </div>
        ) : (
          <p className="text-sm text-muted">Completa peso, estatura y fecha de nacimiento para calcular tu gasto calórico (Mifflin-St Jeor).</p>
        )}
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="size-5 accent-accent" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
          Quiero fijar mis propias metas
        </label>
        {custom && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Calorías por día</span>
              <input className="input" inputMode="numeric" placeholder={String(preview.calories ?? 2000)} value={form.calorie_target ?? ""} onChange={(e) => setForm({ ...form, calorie_target: num(e.target.value) })} />
            </label>
            <label className="block">
              <span className="label">Proteína (g por día)</span>
              <input className="input" inputMode="numeric" placeholder={String(preview.protein_g ?? 120)} value={form.protein_target_g ?? ""} onChange={(e) => setForm({ ...form, protein_target_g: num(e.target.value) })} />
            </label>
          </div>
        )}
        {preview.calories && (
          <p className="text-xs text-muted">
            Reparto sugerido: proteína {preview.protein_g ?? "?"} g{custom ? "" : " (1,8 g por kg)"} · carbohidratos {preview.carbs_g ?? "?"} g · grasa{" "}
            {preview.fat_g ?? "?"} g.
          </p>
        )}
      </section>

      <button className="btn-primary w-full" onClick={save} disabled={!dirty || saving}>
        {saving ? "Guardando…" : "Guardar perfil"}
      </button>

      <section className="card space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Palette className="size-4" /> Apariencia
        </h2>
        <div className="seg grid-cols-3">
          {THEMES.map((t) => (
            <button
              key={t.value}
              className={`seg-item ${theme === t.value ? "seg-on" : ""}`}
              onClick={() => {
                setTheme(t.value);
                applyTheme(t.value);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">«Sistema» sigue el modo claro u oscuro del celular.</p>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Smartphone className="size-4" /> Ponla en tu pantalla de inicio
        </h2>
        <p className="text-sm text-muted">
          <b>iPhone:</b> en Safari toca <Share className="inline size-4" /> Compartir → <b>Agregar a pantalla de inicio</b>.
          <br />
          <b>Android:</b> en Chrome toca ⋮ → <b>Instalar app</b>.
        </p>
      </section>

      <section className="card space-y-3 p-4">
        <button className="btn-secondary w-full" onClick={exportAll} disabled={exporting}>
          <Download className="size-5" /> {exporting ? "Exportando…" : "Exportar todos mis datos (JSON)"}
        </button>
        <form action={signOut}>
          <button className="btn-ghost mx-auto flex text-bad" type="submit">
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </form>
      </section>

      {weightSheet && <WeightSheet onClose={() => setWeightSheet(false)} />}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl px-2 py-2 ${accent ? "bg-accent-soft" : "bg-bg"}`}>
      <p className={`text-sm font-bold tabular-nums ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
