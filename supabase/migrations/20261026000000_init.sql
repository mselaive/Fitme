-- FitMe · esquema de Supabase
-- Pégalo completo en Supabase → SQL Editor → Run. Se puede volver a ejecutar sin romper nada.

-- ───────────────────────── Tablas ─────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  sex text not null default 'm' check (sex in ('m', 'f')),
  birth_date date,
  height_cm numeric(5, 1) check (height_cm is null or (height_cm > 50 and height_cm < 260)),
  activity text not null default 'moderado'
    check (activity in ('sedentario', 'ligero', 'moderado', 'activo', 'muy_activo')),
  goal text not null default 'mantener' check (goal in ('bajar', 'mantener', 'subir')),
  -- Si se dejan en null, la app calcula las metas con Mifflin-St Jeor.
  calorie_target integer check (calorie_target is null or calorie_target between 800 and 8000),
  protein_target_g integer check (protein_target_g is null or protein_target_g between 20 and 500),
  created_at timestamptz not null default now()
);

-- Peso corporal, uno por día.
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg > 20 and weight_kg < 400),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- Una sesión de pesas (un "día" de la rutina).
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date date not null,
  day_key text not null,          -- d1..d5 (rutina) o 'libre'
  title text not null default '',
  notes text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- Cada serie hecha: peso × repeticiones (o segundos para planchas/sostenes).
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  exercise_key text not null,
  exercise_name text not null,
  set_no integer not null check (set_no > 0),
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg >= 0),
  reps integer check (reps is null or reps >= 0),
  seconds integer check (seconds is null or seconds >= 0),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workout_id, exercise_key, set_no)
);

-- Trotes.
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date date not null,
  distance_km numeric(6, 2) not null check (distance_km > 0),
  duration_sec integer not null check (duration_sec > 0),
  notes text,
  created_at timestamptz not null default now()
);

-- Comidas (con foto analizada por Gemini o escritas a mano).
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date date not null,
  time time not null default '12:00',
  name text not null default '',
  calories numeric(7, 1) not null default 0 check (calories >= 0),
  protein_g numeric(6, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 1) not null default 0 check (fat_g >= 0),
  -- [{ name, grams, calories, protein_g, carbs_g, fat_g }]
  items jsonb not null default '[]'::jsonb,
  photo_path text,
  source text not null default 'manual' check (source in ('foto', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists weight_logs_user_date on public.weight_logs (user_id, date desc);
create index if not exists workouts_user_date on public.workouts (user_id, date desc);
create index if not exists workout_sets_user_exercise on public.workout_sets (user_id, exercise_key, created_at desc);
create index if not exists workout_sets_workout on public.workout_sets (workout_id);
create index if not exists runs_user_date on public.runs (user_id, date desc);
create index if not exists meals_user_date on public.meals (user_id, date desc);

-- ───────────────────────── Perfil automático al registrarse ─────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Seguridad (cada uno ve solo lo suyo) ─────────────────────────

alter table public.profiles enable row level security;
alter table public.weight_logs enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.runs enable row level security;
alter table public.meals enable row level security;

drop policy if exists "profiles own" on public.profiles;
create policy "profiles own" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "weight own" on public.weight_logs;
create policy "weight own" on public.weight_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "workouts own" on public.workouts;
create policy "workouts own" on public.workouts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "sets own" on public.workout_sets;
create policy "sets own" on public.workout_sets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "runs own" on public.runs;
create policy "runs own" on public.runs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "meals own" on public.meals;
create policy "meals own" on public.meals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────────────────── Fotos de comida (bucket privado) ─────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meals', 'meals', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists "meals photos read own" on storage.objects;
create policy "meals photos read own" on storage.objects for select to authenticated
  using (bucket_id = 'meals' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "meals photos insert own" on storage.objects;
create policy "meals photos insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'meals' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "meals photos delete own" on storage.objects;
create policy "meals photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'meals' and (storage.foldername(name))[1] = auth.uid()::text);
