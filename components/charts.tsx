"use client";

/** Anillo de progreso (calorías del día). */
export function Ring({
  value,
  max,
  size = 132,
  stroke = 12,
  children,
  over = false,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  over?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "var(--bad)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Barra horizontal de un macro. */
export function MacroBar({ label, value, max, color }: { label: string; value: number; max: number | null; color: string }) {
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium" style={{ color }}>
          {label}
        </span>
        <span className="tabular-nums text-muted">
          {Math.round(value)} g{max ? ` / ${max} g` : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export type Point = { x: string; y: number };

/** Gráfico de línea simple (peso, 1RM estimado…). `x` es una etiqueta (fecha). */
export function LineChart({
  points,
  height = 140,
  unit = "",
  color = "var(--accent)",
  decimals = 1,
}: {
  points: Point[];
  height?: number;
  unit?: string;
  color?: string;
  decimals?: number;
}) {
  if (points.length === 0) return <p className="py-6 text-center text-sm text-muted">Sin datos todavía</p>;
  const w = 320;
  const padX = 8;
  const padY = 18;
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (max === min) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.1;
  max += span * 0.1;
  const sx = (i: number) => (points.length === 1 ? w / 2 : padX + (i * (w - padX * 2)) / (points.length - 1));
  const sy = (v: number) => height - padY - ((v - min) / (max - min)) * (height - padY * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const fmt = (v: number) => `${v.toLocaleString("es-CL", { maximumFractionDigits: decimals })}${unit}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Gráfico">
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={sx(i)} cy={sy(p.y)} r={points.length > 40 ? 1.5 : 3} fill={color} />
      ))}
      <text x={sx(0)} y={sy(first.y) - 8} fontSize="11" fill="var(--muted)" textAnchor={points.length === 1 ? "middle" : "start"}>
        {fmt(first.y)}
      </text>
      {points.length > 1 && (
        <text x={sx(points.length - 1)} y={sy(last.y) - 8} fontSize="11" fill="var(--fg)" fontWeight="600" textAnchor="end">
          {fmt(last.y)}
        </text>
      )}
      <text x={padX} y={height - 4} fontSize="10" fill="var(--muted)">
        {first.x}
      </text>
      {points.length > 1 && (
        <text x={w - padX} y={height - 4} fontSize="10" fill="var(--muted)" textAnchor="end">
          {last.x}
        </text>
      )}
    </svg>
  );
}

/** Barras verticales (km por semana, kcal por día…). */
export function Bars({
  data,
  height = 120,
  color = "var(--accent)",
  format = (v: number) => String(Math.round(v)),
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  color?: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          {d.value > 0 && <span className="text-[10px] tabular-nums text-muted">{format(d.value)}</span>}
          <div
            className="w-full rounded-t-md transition-[height] duration-500"
            style={{
              height: `${Math.max(d.value > 0 ? 4 : 2, (d.value / max) * (height - 36))}px`,
              background: d.value > 0 ? color : "var(--line)",
              opacity: d.highlight === false ? 0.45 : 1,
            }}
          />
          <span className="text-[10px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
