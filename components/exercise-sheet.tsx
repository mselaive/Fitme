"use client";

import { exerciseInfo } from "@/lib/exercise-info";
import type { Exercise } from "@/lib/routine";
import { ExerciseFigure, MuscleMap, muscleList } from "./exercise-figure";
import { Sheet } from "./sheet";

/** Cómo se hace el ejercicio: figura animada, músculos y consejos. */
export function ExerciseSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const info = exerciseInfo(exercise.key);
  return (
    <Sheet title={exercise.name} onClose={onClose}>
      {info ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {exercise.sets} series × {exercise.target}
            {exercise.perSide ? " por lado" : ""}
          </p>
          <div className="rounded-2xl bg-bg p-2">
            <ExerciseFigure info={info} className="mx-auto aspect-square w-full max-w-64" />
          </div>
          <div className="flex gap-3">
            <MuscleMap primary={info.primary} secondary={info.secondary} className="w-40 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              <div>
                <p className="text-xs font-medium text-muted">Trabaja principalmente</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {muscleList(info.primary).map((m) => (
                    <span key={m} className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              {info.secondary.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted">También</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {muscleList(info.secondary).map((m) => (
                      <span key={m} className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted">Cómo hacerlo</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {info.cues.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">Sin ilustración para este ejercicio.</p>
      )}
    </Sheet>
  );
}
