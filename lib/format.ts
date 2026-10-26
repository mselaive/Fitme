const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Fecha local de hoy en formato YYYY-MM-DD (no UTC, para que el día cambie a medianoche de Chile). */
export function todayIso(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number) {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return todayIso(d);
}

/** "lun 26 oct" */
export function fmtDay(iso: string) {
  const d = parseIso(iso);
  return `${DAY_NAMES[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "lunes 26 de octubre" */
export function fmtDayLong(iso: string) {
  const d = parseIso(iso);
  const text = `${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_LONG[d.getMonth()]}`;
  return text[0].toUpperCase() + text.slice(1);
}

const MONTH_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function fmtMonth(year: number, monthIndex: number) {
  return `${MONTH_LONG[monthIndex][0].toUpperCase()}${MONTH_LONG[monthIndex].slice(1)} ${year}`;
}

/** "hoy", "ayer", "hace 3 días", o la fecha. */
export function fmtRelative(iso: string, today = todayIso()) {
  if (iso === today) return "hoy";
  const diff = Math.round((parseIso(today).getTime() - parseIso(iso).getTime()) / 86_400_000);
  if (diff === 1) return "ayer";
  if (diff > 1 && diff < 14) return `hace ${diff} días`;
  return fmtDay(iso);
}

export function fmtNum(n: number, decimals = 0) {
  return n.toLocaleString("es-CL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtKg(n: number | null | undefined) {
  if (n == null) return "—";
  return `${fmtNum(n, n % 1 ? 1 : 0)} kg`;
}

/** 95 → "1:35"; 3725 → "1:02:05" */
export function fmtDuration(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Ritmo en min/km: "5:12 /km" */
export function fmtPace(distanceKm: number, durationSec: number) {
  if (!distanceKm || !durationSec) return "—";
  const secPerKm = durationSec / distanceKm;
  return `${fmtDuration(secPerKm)} /km`;
}

/** "45:30" o "1:05:00" → segundos. También acepta "45" (minutos). */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || Number.isNaN(Number(p)))) return null;
  const nums = parts.map(Number);
  if (nums.length === 1) return Math.round(nums[0] * 60);
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return null;
}

/** "HH:MM" local actual. */
export function nowTime(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
