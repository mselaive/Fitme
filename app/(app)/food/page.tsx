"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, History, Images, PencilLine, Sparkles, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { MacroBar } from "@/components/charts";
import { MealPhoto } from "@/components/meal-photo";
import { Sheet } from "@/components/sheet";
import { fetchMeals, fetchRecentMealNames } from "@/lib/data";
import { compressImage } from "@/lib/image";
import { addDays, fmtDay, fmtNum, fmtRelative, nowTime } from "@/lib/format";
import type { FoodItem, FoodScan, Meal } from "@/lib/types";

const emptyItem = (): FoodItem => ({ name: "", grams: 0, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

export default function FoodPage() {
  const { supabase, userId, today, targets, toast } = useApp();
  const [date, setDate] = useState(today);
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [draft, setDraft] = useState<{ file: Blob | null; preview: string | null } | null>(null);
  const [detail, setDetail] = useState<Meal | null>(null);
  const [repeat, setRepeat] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setMeals(await fetchMeals(supabase, date, date));
    } catch (e) {
      toast(`No se pudieron cargar las comidas: ${(e as Error).message}`, "bad");
    }
  }, [supabase, date, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const t = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    for (const m of meals ?? []) {
      t.calories += m.calories;
      t.protein_g += m.protein_g;
      t.carbs_g += m.carbs_g;
      t.fat_g += m.fat_g;
    }
    return t;
  }, [meals]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const blob = await compressImage(file);
      setDraft({ file: blob, preview: URL.createObjectURL(blob) });
    } catch {
      toast("No se pudo leer la foto", "bad");
    }
  }

  async function remove(meal: Meal) {
    if (!confirm("¿Borrar esta comida?")) return;
    const { error } = await supabase.from("meals").delete().eq("id", meal.id);
    if (error) return toast(`No se pudo borrar: ${error.message}`, "bad");
    if (meal.photo_path) await supabase.storage.from("meals").remove([meal.photo_path]);
    setDetail(null);
    toast("Comida borrada");
    load();
  }

  const remaining = targets.calories != null ? targets.calories - totals.calories : null;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-bold">Comida</h1>
        <div className="flex items-center gap-1">
          <button className="rounded-full p-2 hover:bg-card" aria-label="Día anterior" onClick={() => setDate(addDays(date, -1))}>
            <ChevronLeft className="size-5" />
          </button>
          <button className="min-w-24 rounded-lg px-2 py-1 text-sm font-medium capitalize" onClick={() => setDate(today)}>
            {date === today ? "Hoy" : fmtRelative(date, today)}
          </button>
          <button
            className="rounded-full p-2 hover:bg-card disabled:opacity-30"
            aria-label="Día siguiente"
            disabled={date >= today}
            onClick={() => setDate(addDays(date, 1))}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </header>

      <section className="card p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p>
            <span className="text-2xl font-bold tabular-nums">{fmtNum(totals.calories)}</span>
            <span className="text-sm text-muted"> {targets.calories ? `/ ${fmtNum(targets.calories)} kcal` : "kcal"}</span>
          </p>
          {remaining != null && (
            <p className={`text-sm font-medium ${remaining >= 0 ? "text-accent" : "text-bad"}`}>
              {remaining >= 0 ? `quedan ${fmtNum(remaining)}` : `+${fmtNum(-remaining)} de más`}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <MacroBar label="Proteína" value={totals.protein_g} max={targets.protein_g} color="var(--protein)" />
          <MacroBar label="Carbohidratos" value={totals.carbs_g} max={null} color="var(--carbs)" />
          <MacroBar label="Grasa" value={totals.fat_g} max={null} color="var(--fat)" />
        </div>
      </section>

      <div className="grid grid-cols-4 gap-2">
        <button className="btn-primary flex-col gap-1 py-3 text-sm" onClick={() => cameraRef.current?.click()}>
          <Camera className="size-6" /> Sacar foto
        </button>
        <button className="btn-secondary flex-col gap-1 py-3 text-sm" onClick={() => galleryRef.current?.click()}>
          <Images className="size-6" /> Galería
        </button>
        <button className="btn-secondary flex-col gap-1 py-3 text-sm" onClick={() => setDraft({ file: null, preview: null })}>
          <PencilLine className="size-6" /> A mano
        </button>
        <button className="btn-secondary flex-col gap-1 py-3 text-sm" onClick={() => setRepeat(true)}>
          <History className="size-6" /> Repetir
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">{fmtDay(date)}</h2>
        {meals == null ? (
          <p className="card p-4 text-center text-sm text-muted">Cargando…</p>
        ) : meals.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">Sin comidas anotadas. Sácale una foto a tu plato y Gemini estima las calorías.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {meals.map((m) => (
              <li key={m.id}>
                <button className="flex w-full items-center gap-3 px-3 py-3 text-left" onClick={() => setDetail(m)}>
                  {m.photo_path ? (
                    <MealPhoto path={m.photo_path} className="size-14 shrink-0" />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-bg text-muted">
                      <PencilLine className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.name || "Comida"}</p>
                    <p className="text-xs text-muted">
                      {m.time} · P {Math.round(m.protein_g)} · C {Math.round(m.carbs_g)} · G {Math.round(m.fat_g)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">{fmtNum(m.calories)} kcal</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {draft && (
        <MealSheet
          file={draft.file}
          preview={draft.preview}
          date={date}
          userId={userId}
          onClose={() => {
            if (draft.preview) URL.revokeObjectURL(draft.preview);
            setDraft(null);
          }}
          onSaved={() => {
            if (draft.preview) URL.revokeObjectURL(draft.preview);
            setDraft(null);
            load();
          }}
        />
      )}

      {repeat && (
        <RepeatSheet
          date={date}
          userId={userId}
          onClose={() => setRepeat(false)}
          onSaved={() => {
            setRepeat(false);
            load();
          }}
        />
      )}

      {detail && (
        <Sheet title={detail.name || "Comida"} onClose={() => setDetail(null)}>
          <div className="space-y-3">
            {detail.photo_path && <MealPhoto path={detail.photo_path} className="aspect-[4/3] w-full" />}
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat label="kcal" value={fmtNum(detail.calories)} />
              <Stat label="Proteína" value={`${Math.round(detail.protein_g)} g`} color="var(--protein)" />
              <Stat label="Carbos" value={`${Math.round(detail.carbs_g)} g`} color="var(--carbs)" />
              <Stat label="Grasa" value={`${Math.round(detail.fat_g)} g`} color="var(--fat)" />
            </div>
            {detail.items.length > 0 && (
              <ul className="divide-y divide-line rounded-xl border border-line text-sm">
                {detail.items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2">
                    <span>
                      {it.name} <span className="text-muted">· {it.grams} g</span>
                    </span>
                    <span className="tabular-nums">{fmtNum(it.calories)} kcal</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted">
              {fmtDay(detail.date)} a las {detail.time} · {detail.source === "foto" ? "estimado con Gemini" : "anotado a mano"}
            </p>
            <button className="btn-ghost mx-auto flex text-bad" onClick={() => remove(detail)}>
              <Trash2 className="size-4" /> Borrar comida
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** Repite una comida ya registrada (misma comida, otra hora) sin volver a analizarla. */
function RepeatSheet({ date, userId, onClose, onSaved }: { date: string; userId: string; onClose: () => void; onSaved: () => void }) {
  const { supabase, toast } = useApp();
  const [recent, setRecent] = useState<Meal[] | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentMealNames(supabase).then(setRecent, (e) => toast((e as Error).message, "bad"));
  }, [supabase, toast]);

  const shown = (recent ?? []).filter((m) => !query.trim() || m.name.toLowerCase().includes(query.trim().toLowerCase()));

  async function pick(m: Meal) {
    setSaving(m.id);
    const { error } = await supabase.from("meals").insert({
      user_id: userId,
      date,
      time: nowTime(),
      name: m.name,
      calories: m.calories,
      protein_g: m.protein_g,
      carbs_g: m.carbs_g,
      fat_g: m.fat_g,
      items: m.items,
      photo_path: m.photo_path,
      source: m.source,
    });
    setSaving(null);
    if (error) return toast(`No se pudo guardar: ${error.message}`, "bad");
    toast("Comida repetida 🍽️");
    onSaved();
  }

  return (
    <Sheet title="Repetir una comida" onClose={onClose}>
      <div className="space-y-3">
        <input className="input" placeholder="Buscar por nombre…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        {recent == null ? (
          <p className="py-4 text-center text-sm text-muted">Cargando…</p>
        ) : shown.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">{recent.length ? "Nada con ese nombre" : "Todavía no tienes comidas guardadas"}</p>
        ) : (
          <ul className="max-h-[55dvh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {shown.map((m) => (
              <li key={m.id}>
                <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left" disabled={saving != null} onClick={() => pick(m)}>
                  {m.photo_path ? (
                    <MealPhoto path={m.photo_path} className="size-10 shrink-0" />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-bg text-muted">
                      <PencilLine className="size-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name || "Comida"}</p>
                    <p className="text-xs text-muted">
                      {fmtRelative(m.date)} · P {Math.round(m.protein_g)} · C {Math.round(m.carbs_g)} · G {Math.round(m.fat_g)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{saving === m.id ? "…" : `${fmtNum(m.calories)} kcal`}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-bg px-2 py-2">
      <p className="text-base font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

/** Hoja para analizar la foto (o escribir a mano) y guardar la comida. */
function MealSheet({
  file,
  preview,
  date,
  userId,
  onClose,
  onSaved,
}: {
  file: Blob | null;
  preview: string | null;
  date: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { supabase, toast } = useApp();
  const [hint, setHint] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<FoodScan | null>(null);
  const [name, setName] = useState("");
  const [items, setItems] = useState<FoodItem[]>([]);
  const [manual, setManual] = useState({ calories: "", protein_g: "", carbs_g: "", fat_g: "" });
  const [time, setTime] = useState(nowTime());
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"scan" | "manual">(file ? "scan" : "manual");

  // Al abrir con foto, analizamos de inmediato (el comentario sirve para re-analizar).
  const autoScanned = useRef(false);
  useEffect(() => {
    if (file && !autoScanned.current) {
      autoScanned.current = true;
      analyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  async function analyze() {
    if (!file && !hint.trim()) return toast("Escribe qué comiste para estimarlo", "bad");
    setScanning(true);
    try {
      const form = new FormData();
      if (file) form.append("image", file, "comida.jpg");
      form.append("hint", hint);
      const res = await fetch("/api/food", { method: "POST", body: form });
      const json = (await res.json()) as FoodScan & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al analizar");
      if (!json.is_food) toast("No parece comida; revisa los datos", "bad");
      setScan(json);
      setName(json.name);
      setItems(json.items.length ? json.items : [{ ...emptyItem(), name: json.name || "Comida", calories: json.calories, protein_g: json.protein_g, carbs_g: json.carbs_g, fat_g: json.fat_g }]);
      setMode("scan");
    } catch (e) {
      toast((e as Error).message, "bad");
      if (!scan) setMode("manual");
    } finally {
      setScanning(false);
    }
  }

  const totals = useMemo(() => {
    if (mode === "manual") {
      const n = (s: string) => Number(s.replace(",", ".")) || 0;
      return { calories: n(manual.calories), protein_g: n(manual.protein_g), carbs_g: n(manual.carbs_g), fat_g: n(manual.fat_g) };
    }
    return items.reduce(
      (t, i) => ({
        calories: t.calories + (Number(i.calories) || 0),
        protein_g: t.protein_g + (Number(i.protein_g) || 0),
        carbs_g: t.carbs_g + (Number(i.carbs_g) || 0),
        fat_g: t.fat_g + (Number(i.fat_g) || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
  }, [mode, items, manual]);

  function updateItem(i: number, patch: Partial<FoodItem>) {
    setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  /** Escala un alimento al cambiar sus gramos (macros proporcionales). */
  function scaleItem(i: number, grams: number) {
    setItems((list) =>
      list.map((it, j) => {
        if (j !== i) return it;
        const factor = it.grams > 0 ? grams / it.grams : 1;
        const r = (v: number) => Math.round(v * factor);
        return { ...it, grams, calories: r(it.calories), protein_g: r(it.protein_g), carbs_g: r(it.carbs_g), fat_g: r(it.fat_g) };
      }),
    );
  }

  async function save() {
    if (totals.calories <= 0 && !confirm("¿Guardar con 0 calorías?")) return;
    setSaving(true);
    try {
      let photo_path: string | null = null;
      if (file) {
        photo_path = `${userId}/${date}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("meals").upload(photo_path, file, { contentType: "image/jpeg" });
        if (error) throw error;
      }
      const { error } = await supabase.from("meals").insert({
        user_id: userId,
        date,
        time,
        name: (name || (mode === "manual" ? "Comida" : scan?.name) || "Comida").trim().slice(0, 80),
        calories: Math.round(totals.calories),
        protein_g: Math.round(totals.protein_g),
        carbs_g: Math.round(totals.carbs_g),
        fat_g: Math.round(totals.fat_g),
        items: mode === "manual" ? [] : items.filter((i) => i.name.trim()),
        photo_path,
        source: file || scan ? "foto" : "manual",
      });
      if (error) throw error;
      toast("Comida guardada 🍽️");
      onSaved();
    } catch (e) {
      toast(`No se pudo guardar: ${(e as Error).message}`, "bad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title={file ? "Analizar comida" : "Anotar comida"} onClose={onClose}>
      <div className="space-y-4">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Tu comida" className="max-h-56 w-full rounded-xl object-cover" />
        )}

        <div className="flex gap-2">
          <input
            className="input"
            placeholder={file ? "Comentario opcional: 'medio plato', 'sin aceite'…" : "Qué comiste: 'dos huevos con pan y palta'"}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
          />
          <button className="btn-secondary shrink-0 px-3" onClick={analyze} disabled={scanning}>
            <Sparkles className={`size-5 ${scanning ? "animate-pulse text-accent" : ""}`} />
            {scanning ? "…" : scan ? "Re-analizar" : "Estimar"}
          </button>
        </div>

        {scan && mode === "scan" && (
          <div className="rounded-xl bg-accent-soft px-3 py-2 text-xs">
            <span className="font-semibold text-accent">Gemini · confianza {scan.confidence}</span>
            {scan.notes && <span className="text-muted"> · {scan.notes}</span>}
          </div>
        )}

        <div className="seg grid-cols-2">
          <button className={`seg-item ${mode === "scan" ? "seg-on" : ""}`} onClick={() => setMode("scan")} disabled={!scan && !items.length}>
            Por alimento
          </button>
          <button className={`seg-item ${mode === "manual" ? "seg-on" : ""}`} onClick={() => setMode("manual")}>
            Totales a mano
          </button>
        </div>

        <label className="block">
          <span className="label">Nombre</span>
          <input className="input" placeholder="Almuerzo: pollo con arroz" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        {mode === "scan" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_3.2rem_3.5rem_2.6rem_2.6rem_2.6rem] gap-1 px-1 text-[10px] text-muted">
              <span>Alimento</span>
              <span className="text-center">g</span>
              <span className="text-center">kcal</span>
              <span className="text-center">P</span>
              <span className="text-center">C</span>
              <span className="text-center">G</span>
            </div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_3.2rem_3.5rem_2.6rem_2.6rem_2.6rem] gap-1">
                <input className="input-sm !text-left !px-2 text-sm" value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} />
                <NumCell value={it.grams} onChange={(v) => scaleItem(i, v)} />
                <NumCell value={it.calories} onChange={(v) => updateItem(i, { calories: v })} />
                <NumCell value={it.protein_g} onChange={(v) => updateItem(i, { protein_g: v })} />
                <NumCell value={it.carbs_g} onChange={(v) => updateItem(i, { carbs_g: v })} />
                <NumCell value={it.fat_g} onChange={(v) => updateItem(i, { fat_g: v })} />
              </div>
            ))}
            <div className="flex justify-between">
              <button className="btn-ghost text-accent" onClick={() => setItems((l) => [...l, emptyItem()])}>
                + Alimento
              </button>
              {items.length > 1 && (
                <button className="btn-ghost text-bad" onClick={() => setItems((l) => l.slice(0, -1))}>
                  Quitar último
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ["calories", "kcal"],
                ["protein_g", "Prot. g"],
                ["carbs_g", "Carb. g"],
                ["fat_g", "Grasa g"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="block">
                <span className="label text-xs">{label}</span>
                <input className="input-sm" inputMode="decimal" value={manual[k]} onChange={(e) => setManual({ ...manual, [k]: e.target.value })} />
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-bg px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            Hora
            <input type="time" className="rounded-lg border border-line bg-card px-2 py-1 text-base" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <p className="text-right">
            <span className="text-xl font-bold tabular-nums">{fmtNum(totals.calories)}</span> <span className="text-sm text-muted">kcal</span>
            <br />
            <span className="text-xs text-muted">
              P {Math.round(totals.protein_g)} · C {Math.round(totals.carbs_g)} · G {Math.round(totals.fat_g)}
            </span>
          </p>
        </div>

        <button className="btn-primary w-full" onClick={save} disabled={saving || scanning}>
          {saving ? "Guardando…" : "Guardar comida"}
        </button>
      </div>
    </Sheet>
  );
}

function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : String(value);
  return (
    <input
      className="input-sm !px-1 text-sm"
      inputMode="decimal"
      value={shown}
      onFocus={() => {
        setText(String(value));
        setFocused(true);
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const n = Number(text.replace(",", "."));
        if (Number.isFinite(n) && n >= 0) onChange(Math.round(n));
      }}
    />
  );
}
