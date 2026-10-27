"use client";

import { useActionState, useState } from "react";
import { KeyRound, Lock, Mail, User } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { signIn, signUp, type AuthState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(signIn, {});
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signUp, {});

  const isLogin = mode === "login";
  const state = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;

  return (
    <main className="min-h-dvh bg-bg">
      {/* Cabecera naranja */}
      <section className="hero relative overflow-hidden px-6 pt-[max(env(safe-area-inset-top),3rem)] pb-16 text-white">
        <div className="relative mx-auto max-w-md">
          <AppLogo className="size-16 shadow-xl" />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight">FitMe</h1>
          <p className="mt-1 text-base text-white/85">Entrena, trota y come mejor.</p>
        </div>
      </section>

      {/* Tarjeta del formulario, montada sobre la cabecera */}
      <section className="relative mx-auto -mt-12 w-full max-w-md px-5 pb-10">
        <div className="rounded-3xl border border-line bg-card p-5 shadow-xl shadow-accent/10">
          <div className="seg mb-5 grid-cols-2">
            {(["login", "signup"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`seg-item ${mode === m ? "seg-on" : ""}`}>
                {m === "login" ? "Entrar" : "Crear cuenta"}
              </button>
            ))}
          </div>

          <form action={isLogin ? loginAction : signupAction} className="space-y-3.5" key={mode}>
            {!isLogin && (
              <Field icon={<User className="size-5" />} label="Tu nombre">
                <input name="name" className="input pl-11" placeholder="Matías" autoComplete="given-name" required />
              </Field>
            )}
            <Field icon={<Mail className="size-5" />} label="Email">
              <input
                name="email"
                type="email"
                className="input pl-11"
                placeholder="tu@email.com"
                autoComplete="email"
                inputMode="email"
                required
              />
            </Field>
            <Field icon={<Lock className="size-5" />} label="Contraseña">
              <input
                name="password"
                type="password"
                className="input pl-11"
                placeholder="••••••••"
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={6}
                required
              />
            </Field>
            {!isLogin && (
              <Field icon={<KeyRound className="size-5" />} label="Código de invitación">
                <input name="code" className="input pl-11" placeholder="El de tu .env" autoCapitalize="off" required />
              </Field>
            )}

            {state.error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{state.error}</p>}

            <button type="submit" className="btn-primary mt-1 w-full" disabled={pending}>
              {pending ? "Un momento…" : isLogin ? "Entrar" : "Crear cuenta"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-muted">
          {isLogin ? "¿Primera vez? " : "¿Ya tienes cuenta? "}
          <button type="button" className="font-semibold text-accent" onClick={() => setMode(isLogin ? "signup" : "login")}>
            {isLogin ? "Crea tu cuenta con el código" : "Entra aquí"}
          </button>
        </p>
      </section>
    </main>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">{icon}</span>
        {children}
      </span>
    </label>
  );
}
