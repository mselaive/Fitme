"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { fetchProfile, fetchWeights } from "@/lib/data";
import { targetsFor, type Targets } from "@/lib/nutrition";
import { todayIso } from "@/lib/format";
import type { Profile, WeightLog } from "@/lib/types";
import { AppLogo } from "./app-logo";

type Tone = "ok" | "bad";

type AppData = {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
  /** Pesadas de más nueva a más antigua. */
  weights: WeightLog[];
};

type AppContextValue = AppData & {
  /** Último peso registrado (kg) o null. */
  weightKg: number | null;
  targets: Targets;
  today: string;
  refresh: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<boolean>;
  logWeight: (date: string, weightKg: number) => Promise<boolean>;
  toast: (message: string, tone?: Tone) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = use(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
  return ctx;
}

async function loadAll(supabase: SupabaseClient): Promise<AppData | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const userId = session.user.id;

  const [profile, weights] = await Promise.all([fetchProfile(supabase, userId), fetchWeights(supabase)]);
  return {
    supabase,
    userId,
    profile: profile ?? {
      id: userId,
      display_name: session.user.email?.split("@")[0] ?? "Yo",
      sex: "m",
      birth_date: null,
      height_cm: null,
      activity: "moderado",
      goal: "mantener",
      calorie_target: null,
      protein_target_g: null,
    },
    weights,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => (hasSupabaseEnv ? createClient() : null), []);
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; tone: Tone }[]>([]);
  const [today, setToday] = useState(() => todayIso());
  const toastId = useRef(0);

  const load = useCallback(
    () =>
      supabase
        ? loadAll(supabase).then(
            (next) => {
              if (!next) {
                router.replace("/login");
                return;
              }
              setData(next);
              setError(null);
            },
            (e: Error) => {
              console.error(e);
              setError(e.message ?? "Error al cargar");
            },
          )
        : Promise.resolve(),
    [supabase, router],
  );

  // Carga inicial y, al volver a la app, actualiza "hoy" (puede haber pasado la medianoche).
  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setToday(todayIso());
        load();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const toast = useCallback((message: string, tone: Tone = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!supabase || !data) return false;
      const prev = data.profile;
      setData((d) => d && { ...d, profile: { ...d.profile, ...patch } });
      const { error } = await supabase.from("profiles").upsert({ id: data.userId, display_name: prev.display_name, ...patch });
      if (error) {
        setData((d) => d && { ...d, profile: prev });
        toast(`No se pudo guardar: ${error.message}`, "bad");
        return false;
      }
      return true;
    },
    [supabase, data, toast],
  );

  const logWeight = useCallback(
    async (date: string, weightKg: number) => {
      if (!supabase || !data) return false;
      const { data: row, error } = await supabase
        .from("weight_logs")
        .upsert({ user_id: data.userId, date, weight_kg: weightKg }, { onConflict: "user_id,date" })
        .select("id, date, weight_kg")
        .single();
      if (error || !row) {
        toast(`No se pudo guardar el peso: ${error?.message ?? ""}`, "bad");
        return false;
      }
      setData((d) => {
        if (!d) return d;
        const rest = d.weights.filter((w) => w.date !== date);
        const next = [...rest, { ...row, weight_kg: Number(row.weight_kg) }].sort((a, b) => b.date.localeCompare(a.date));
        return { ...d, weights: next };
      });
      return true;
    },
    [supabase, data, toast],
  );

  if (!hasSupabaseEnv) return <SetupNotice />;
  if (!data) return <Splash error={error} onRetry={load} />;

  const weightKg = data.weights[0]?.weight_kg ?? null;
  const value: AppContextValue = {
    ...data,
    weightKg,
    targets: targetsFor(data.profile, weightKg),
    today,
    refresh: load,
    updateProfile,
    logWeight,
    toast,
  };

  return (
    <AppContext value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-full px-4 py-2.5 text-sm font-medium shadow-lg ${
              t.tone === "ok" ? "bg-fg text-bg" : "bg-bad text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </AppContext>
  );
}

function Splash({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <AppLogo className="size-14 animate-pulse" />
      {error ? (
        <>
          <p className="text-sm text-bad">No se pudieron cargar los datos: {error}</p>
          <button className="btn-secondary" onClick={onRetry}>
            Reintentar
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">Cargando…</p>
      )}
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6">
      <h1 className="text-xl font-bold">Falta configurar Supabase</h1>
      <p className="text-sm text-muted">
        Copia <code>.env.local.example</code> a <code>.env.local</code>, completa las variables de Supabase y reinicia
        el servidor. Los pasos están en el README.
      </p>
    </div>
  );
}
