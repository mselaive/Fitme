"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ExerciseFigure, MuscleMap } from "@/components/exercise-figure";
import { ExerciseSheet } from "@/components/exercise-sheet";
import { exerciseInfo } from "@/lib/exercise-info";
import { ROUTINE, type Exercise } from "@/lib/routine";

/** Galería de todos los ejercicios de la rutina con su figura y músculos. */
export default function ExercisesPage() {
  const [open, setOpen] = useState<Exercise | null>(null);
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2 pt-1">
        <Link href="/train" className="-ml-2 rounded-full p-2 text-muted hover:bg-card" aria-label="Volver">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">Ejercicios</h1>
      </header>
      {ROUTINE.map((day) => (
        <section key={day.key}>
          <h2 className="mb-2 text-sm font-medium text-muted">
            {day.label} · {day.title}
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {day.exercises.map((e, i) => {
              const info = exerciseInfo(e.key);
              return (
                <li key={`${e.key}${i}`}>
                  <button type="button" className="card flex w-full flex-col items-stretch gap-1 p-2 text-left" onClick={() => setOpen(e)}>
                    {info ? (
                      <div className="flex items-center gap-1">
                        <ExerciseFigure info={info} className="aspect-square w-2/3" />
                        <MuscleMap primary={info.primary} secondary={info.secondary} className="w-1/3" />
                      </div>
                    ) : null}
                    <p className="text-xs font-semibold leading-tight">{e.name}</p>
                    <p className="text-[11px] text-muted">
                      {e.sets} × {e.target}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {open && <ExerciseSheet exercise={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
