# FitMe 💪🍽️

App web (instalable en el celular, como una app nativa) para llevar tu entrenamiento y tu comida:

- **Rutina de mancuernas** (4 días + el 5.º opcional de brazos y hombros) con **peso × repeticiones** por serie,
  lo que hiciste **la última vez** al lado de cada ejercicio, autocompletado al marcar la serie, récords (1RM estimado)
  y cronómetro de descanso. Cada ejercicio tiene una **figura animada** con el movimiento, un **mapa de los
  músculos** que trabaja y consejos de técnica (dibujados en SVG, sin depender de ninguna API).
- **Trotes**: distancia y tiempo → ritmo, calorías aproximadas y km por semana.
- **Comida con foto**: le sacas una foto al plato y **Gemini** estima alimentos, porciones, calorías y macros
  (editables antes de guardar). También se puede describir con texto o anotar a mano.
- **Metas según tu peso, estatura, edad y objetivo**: metabolismo basal y gasto diario (Mifflin-St Jeor),
  meta de calorías y proteína, IMC y gráfico de peso.
- **Progreso**: calendario mensual con sesiones, trotes y comidas; gráfico de fuerza por ejercicio.
- **Sugerencia de progresión**: si la última vez llegaste al tope de repeticiones en todas las series, te propone
  subir el peso (doble progresión); si faltaron, te dice que bajes o repitas.
- **Repetir comida**: vuelve a anotar cualquier comida ya guardada con un toque.
- **Coach semanal con Gemini**: analiza tus últimas dos semanas (pesas, trotes, comidas y peso) y te da logros,
  mejoras y qué intentar en la próxima sesión.

Stack 100 % gratis: **Next.js 16** en **Vercel (Hobby)** + **Supabase (Free)** + **Gemini API (capa gratuita)**.

---

## 1. Supabase (base de datos, login y fotos)

1. Crea una cuenta y un proyecto gratis en <https://supabase.com> (región `us-east` o la más cercana).
2. **SQL Editor → New query**: pega todo [`supabase/schema.sql`](supabase/schema.sql) y dale **Run**.
   Crea las tablas, la seguridad por usuario y el bucket privado `meals` para las fotos.
3. **Authentication → Sign In / Providers → Email**: desactiva **"Allow new users to sign up"**.
   Las cuentas se crean desde la app con el código de invitación, así nadie más se registra.
4. **Project Settings → API Keys**: copia la **Publishable key** y la **Secret key**.
   **Project Settings → Data API**: copia la **Project URL**.

## 2. Gemini (análisis de las fotos de comida)

1. Entra a <https://aistudio.google.com/apikey> con tu cuenta de Google y crea una API key (gratis).
2. Ojo: en la capa gratuita Google puede usar el contenido enviado para mejorar sus modelos.
3. Sin la key la app funciona igual; las comidas se anotan a mano.

## 3. Correr en tu computador

Requiere Node 20.9 o más nuevo.

```bash
cp .env.local.example .env.local   # y completa los valores
npm install
npm run dev                        # http://localhost:3000
```

Para probar desde el celular en la misma red Wi-Fi: `npm run dev:lan` y abre `http://<IP-de-tu-PC>:3000`.

### Supabase local (opcional, para desarrollar sin tocar el proyecto real)

Con Docker Desktop corriendo:

```bash
npm run db:start      # levanta Supabase en los puertos 5532x y aplica supabase/migrations
npm run db:stop
```

Las URL y claves locales las imprime `db:start`; van en `.env.local` (la cuenta de prueba local está en
`FITME_DEV_TEST_EMAIL` / `FITME_DEV_TEST_PASSWORD`).

## 4. Publicar en Vercel (gratis)

El repo ya viene con git inicializado y un commit. Pasos:

1. Crea un repositorio privado vacío en GitHub (por ejemplo `FitMe`) y súbelo:

   ```bash
   git remote add origin https://github.com/<tu-usuario>/FitMe.git
   git push -u origin main
   ```

2. En <https://vercel.com/new> importa el repositorio (framework: Next.js, sin cambiar nada más).
3. En **Environment Variables** agrega las variables de producción (las del proyecto Supabase real, no las locales):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
   `GEMINI_API_KEY`, `GEMINI_MODEL` (opcional) e `INVITE_CODE`.
4. **Deploy** y abre `https://<tu-proyecto>.vercel.app` en el celular.

Checklist antes del primer deploy:

- [ ] Proyecto Supabase creado y `supabase/schema.sql` ejecutado (sección 1).
- [ ] "Allow new users to sign up" desactivado en Supabase.
- [ ] Key de Gemini creada (sección 2).
- [ ] `INVITE_CODE` elegido (es lo único que impide que otro se registre).

## 5. Primer uso

1. Entra a la URL → **Crear cuenta** (nombre, email, contraseña y el código de invitación).
2. En **Ajustes** completa sexo, fecha de nacimiento, estatura, actividad y objetivo, y anota tu peso.
   Con eso la app calcula tu meta de calorías y proteína (puedes fijarla a mano).
3. Agrégala a la pantalla de inicio:
   - **iPhone**: Safari → Compartir → "Agregar a pantalla de inicio".
   - **Android**: Chrome → ⋮ → "Instalar app".

## Cómo se usa

- **Hoy**: calorías comidas vs. meta, qué día de la rutina te toca, trote y peso del día, resumen de la semana.
- **Entrenar → Rutina**: elige el día. En cada ejercicio escribe kg y reps y toca ✓; si dejas la serie vacía,
  se copia lo de la última vez. Al marcar arranca un descanso de 90 s. "Terminar entrenamiento" cierra la sesión.
- **Entrenar → Trote**: distancia y tiempo; el ritmo y las calorías (≈1 kcal por kg por km) salen solos.
- **Comida**: "Sacar foto" o "Galería" → Gemini estima; corrige porciones (los gramos escalan los macros) y guarda.
  "A mano" para totales directos o para describir la comida con texto y estimarla.
- **Progreso**: peso con gráfico, calendario (toca un día para ver el detalle), fuerza por ejercicio (1RM estimado con Epley).

## Cómo se calcula

- **Metabolismo basal** (Mifflin-St Jeor): hombres `10·kg + 6,25·cm − 5·edad + 5`; mujeres `… − 161`.
- **Gasto diario** = basal × factor de actividad (1,2 a 1,9).
- **Meta** = gasto diario − 500 (bajar grasa), ± 0 (mantener) o + 300 (subir músculo). Mínimo 1.200.
- **Proteína sugerida** = 1,8 g por kg de peso.
- **1RM estimado** (Epley) = peso × (1 + reps / 30).

## Estructura

```
app/(app)/            pantallas con sesión: Hoy, Entrenar (+ sesión por día), Comida, Progreso, Ajustes
app/login/            login y registro con código de invitación (server actions)
app/api/food/         analiza la foto (o el texto) de la comida con Gemini (solo usuarios logueados)
app/api/coach/        consejo semanal: arma el resumen de tus datos y se lo pide a Gemini
lib/gemini.ts         cliente de Gemini con respaldo entre modelos cuando uno está saturado
lib/progression.ts    regla de doble progresión (subir, repetir o bajar el peso)
components/           UI compartida, proveedor de datos (AppProvider), hojas de trote y peso, gráficos
lib/routine.ts        la rutina (días, ejercicios, series × repeticiones)
lib/exercise-info.ts  poses de la figura animada, músculos y consejos por ejercicio
lib/nutrition.ts      metabolismo basal, gasto diario, metas, IMC
lib/strength.ts       1RM estimado, volumen, formato de series
lib/data.ts           consultas a Supabase (siempre por rango de fechas o con límite)
proxy.ts              refresca la sesión y redirige a /login si no hay sesión
supabase/schema.sql   esquema completo (idéntico a supabase/migrations/*)
```

## Límites del plan gratis

- Supabase Free **pausa el proyecto tras 7 días sin uso**; se reactiva desde el dashboard con un clic.
  500 MB de base de datos y 1 GB de fotos (las fotos se comprimen a ~200 KB en el celular).
- Gemini gratis tiene límites por minuto y por día: si se alcanzan, la app avisa y puedes anotar a mano.
