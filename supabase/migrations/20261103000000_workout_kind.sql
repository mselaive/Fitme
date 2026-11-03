-- Tipo de registro en workouts: sesión normal, día de descanso o día omitido (saltado).
alter table public.workouts
  add column if not exists kind text not null default 'sesion'
  check (kind in ('sesion', 'descanso', 'omitido'));
