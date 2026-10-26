"use client";

import { useEffect, useMemo, useState } from "react";
import { MUSCLE_NAMES, type ExerciseInfo, type Limb, type MuscleId, type Pose, type Prop } from "@/lib/exercise-info";

/* ───────────── Geometría de la figura ───────────── */

const L = { torso: 46, upper: 25, fore: 23, thigh: 31, shin: 31, foot: 11, headR: 8.5, neck: 14 };
const FLOOR_Y = 182;

type Pt = { x: number; y: number };
const rad = (deg: number) => (deg * Math.PI) / 180;
const step = (p: Pt, angle: number, len: number): Pt => ({ x: p.x + Math.sin(rad(angle)) * len, y: p.y + Math.cos(rad(angle)) * len });

/** Interpola dos poses (en el espacio de ángulos, para que los brazos describan arcos). */
function mix(a: Pose, b: Pose, t: number): Pose {
  const n = (x: number, y: number) => x + (y - x) * t;
  // Los ángulos absolutos giran por el camino corto (de 10° a 350° se pasa por 0°, no por 180°).
  const ang = (x: number, y: number) => {
    let d = ((y - x) % 360 + 540) % 360 - 180;
    if (d === -180) d = 180;
    return x + d * t;
  };
  const limb = (x: Limb, y: Limb): Limb => ({ upper: ang(x.upper, y.upper), flex: n(x.flex, y.flex) });
  const leg = (x: Pose["legNear"], y: Pose["legNear"]) => ({
    thigh: ang(x.thigh, y.thigh),
    knee: n(x.knee, y.knee),
    foot: ang(x.foot ?? 90, y.foot ?? 90),
  });
  return {
    hip: { x: n(a.hip.x, b.hip.x), y: n(a.hip.y, b.hip.y) },
    torso: ang(a.torso, b.torso),
    head: n(a.head ?? 0, b.head ?? 0),
    near: limb(a.near, b.near),
    far: limb(a.far, b.far),
    legNear: leg(a.legNear, b.legNear),
    legFar: leg(a.legFar, b.legFar),
  };
}

type Segment = { a: Pt; b: Pt; far?: boolean; w?: number };
type Skeleton = { segments: Segment[]; head: Pt; hands: { near: Pt; far: Pt }; foreAngle: { near: number; far: number } };

function sideSkeleton(p: Pose): Skeleton {
  const shoulder = step(p.hip, p.torso, L.torso);
  const head = step(shoulder, p.torso + (p.head ?? 0), L.neck);
  const arm = (l: Limb) => {
    const elbow = step(shoulder, l.upper, L.upper);
    const hand = step(elbow, l.upper + l.flex, L.fore);
    return { elbow, hand, angle: l.upper + l.flex };
  };
  const leg = (g: Pose["legNear"]) => {
    const knee = step(p.hip, g.thigh, L.thigh);
    const ankle = step(knee, g.thigh - g.knee, L.shin);
    const toe = step(ankle, g.foot ?? 90, L.foot);
    return { knee, ankle, toe };
  };
  const an = arm(p.near);
  const af = arm(p.far);
  const ln = leg(p.legNear);
  const lf = leg(p.legFar);
  return {
    segments: [
      { a: shoulder, b: af.elbow, far: true },
      { a: af.elbow, b: af.hand, far: true },
      { a: p.hip, b: lf.knee, far: true },
      { a: lf.knee, b: lf.ankle, far: true },
      { a: lf.ankle, b: lf.toe, far: true, w: 6 },
      { a: p.hip, b: shoulder, w: 11 },
      { a: p.hip, b: ln.knee },
      { a: ln.knee, b: ln.ankle },
      { a: ln.ankle, b: ln.toe, w: 6 },
      { a: shoulder, b: an.elbow },
      { a: an.elbow, b: an.hand },
    ],
    head,
    hands: { near: an.hand, far: af.hand },
    foreAngle: { near: an.angle, far: af.angle },
  };
}

function frontSkeleton(p: Pose): Skeleton {
  const shoulder = step(p.hip, p.torso, L.torso);
  const head = step(shoulder, 180, L.neck);
  const sR = { x: shoulder.x + 13, y: shoulder.y };
  const sL = { x: shoulder.x - 13, y: shoulder.y };
  const hR = { x: p.hip.x + 7, y: p.hip.y };
  const hL = { x: p.hip.x - 7, y: p.hip.y };
  // Derecha de la figura = brazo "near" (sale hacia +x); izquierda = "far" (hacia −x).
  const arm = (s: Pt, l: Limb, dir: 1 | -1) => {
    const elbow = step(s, dir * l.upper, L.upper);
    const hand = step(elbow, dir * (l.upper + l.flex), L.fore);
    return { elbow, hand, angle: dir * (l.upper + l.flex) };
  };
  const leg = (h: Pt, g: Pose["legNear"], dir: 1 | -1) => {
    const knee = step(h, dir * g.thigh, L.thigh);
    const ankle = step(knee, dir * g.thigh, L.shin);
    return { knee, ankle };
  };
  const aR = arm(sR, p.near, 1);
  const aL = arm(sL, p.far, -1);
  const lR = leg(hR, p.legNear, 1);
  const lL = leg(hL, p.legFar, -1);
  return {
    segments: [
      { a: hL, b: hR, w: 11 },
      { a: sL, b: sR, w: 11 },
      { a: p.hip, b: shoulder, w: 14 },
      { a: hR, b: lR.knee },
      { a: lR.knee, b: lR.ankle },
      { a: hL, b: lL.knee },
      { a: lL.knee, b: lL.ankle },
      { a: sR, b: aR.elbow },
      { a: aR.elbow, b: aR.hand },
      { a: sL, b: aL.elbow },
      { a: aL.elbow, b: aL.hand },
    ],
    head,
    hands: { near: aR.hand, far: aL.hand },
    foreAngle: { near: aR.angle, far: aL.angle },
  };
}

/** Caja que envuelve ambos fotogramas (para encuadrar las miniaturas). */
function bounds(info: ExerciseInfo) {
  const pts: Pt[] = [];
  for (const pose of [info.start, info.end]) {
    const sk = info.view === "front" ? frontSkeleton(pose) : sideSkeleton(pose);
    for (const s of sk.segments) pts.push(s.a, s.b);
    pts.push(sk.head);
  }
  for (const pr of info.props ?? []) {
    if (pr.kind === "bench") pts.push({ x: pr.x, y: pr.y }, { x: pr.x + pr.w, y: pr.y + 10 });
    if (pr.kind === "step") pts.push({ x: pr.x, y: FLOOR_Y - pr.h }, { x: pr.x + pr.w, y: FLOOR_Y });
    if (pr.kind === "pad") pts.push({ x: pr.x, y: pr.y }, { x: pr.x + pr.w, y: pr.y + 30 });
  }
  if (info.floor) pts.push({ x: 0, y: FLOOR_Y });
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const pad = 16;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) + pad - minX;
  const h = Math.max(...ys) + pad - minY;
  // Encuadre cuadrado centrado.
  const size = Math.max(w, h);
  return { x: minX - (size - w) / 2, y: minY - (size - h) / 2, size };
}

/** Avanza suavemente de 0 a 1 y vuelve, en bucle. */
function useCycle(period: number, running: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      // ~30 fps es suficiente y ahorra batería.
      if (now - last > 33) {
        last = now;
        const phase = ((now - start) % period) / period;
        setT((1 - Math.cos(phase * Math.PI * 2)) / 2);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [period, running]);
  return t;
}

export function ExerciseFigure({
  info,
  className = "",
  animate = true,
  period = 2600,
}: {
  info: ExerciseInfo;
  className?: string;
  animate?: boolean;
  period?: number;
}) {
  const t = useCycle(period, animate);
  const pose = mix(info.start, info.end, animate ? t : 1);
  const sk = info.view === "front" ? frontSkeleton(pose) : sideSkeleton(pose);
  const box = useMemo(() => bounds(info), [info]);
  const db = info.dumbbells;
  const dbAngle = db?.angle ?? 0;

  return (
    <svg viewBox={`${box.x} ${box.y} ${box.size} ${box.size}`} className={className} role="img" aria-label="Figura del ejercicio">
      {info.floor && <line x1={box.x} y1={FLOOR_Y + 4} x2={box.x + box.size} y2={FLOOR_Y + 4} stroke="var(--line)" strokeWidth={3} strokeLinecap="round" />}
      {(info.props ?? []).map((p, i) => (
        <PropShape key={i} prop={p} />
      ))}
      {sk.segments.map((s, i) => (
        <line
          key={i}
          x1={s.a.x}
          y1={s.a.y}
          x2={s.b.x}
          y2={s.b.y}
          stroke={s.far ? "var(--muted)" : "var(--fg)"}
          strokeOpacity={s.far ? 0.45 : 1}
          strokeWidth={s.w ?? 8}
          strokeLinecap="round"
        />
      ))}
      <circle cx={sk.head.x} cy={sk.head.y} r={L.headR} fill="var(--fg)" />
      {db?.far && <Dumbbell at={sk.hands.far} angle={sk.foreAngle.far + 90 + dbAngle} far />}
      {db?.near && <Dumbbell at={sk.hands.near} angle={sk.foreAngle.near + 90 + dbAngle} />}
    </svg>
  );
}

function Dumbbell({ at, angle, far }: { at: Pt; angle: number; far?: boolean }) {
  return (
    <g transform={`translate(${at.x} ${at.y}) rotate(${-angle + 90})`} opacity={far ? 0.5 : 1}>
      <rect x={-9} y={-1.5} width={18} height={3} rx={1.5} fill="var(--accent)" />
      <rect x={-10} y={-5} width={4} height={10} rx={1.5} fill="var(--accent)" />
      <rect x={6} y={-5} width={4} height={10} rx={1.5} fill="var(--accent)" />
    </g>
  );
}

function PropShape({ prop }: { prop: Prop }) {
  const fill = "var(--line)";
  if (prop.kind === "bench") {
    const h = prop.h ?? 9;
    return (
      <g transform={`rotate(${prop.angle ?? 0} ${prop.x} ${prop.y})`}>
        <rect x={prop.x} y={prop.y} width={prop.w} height={h} rx={3} fill={fill} />
        {!prop.angle && (
          <>
            <rect x={prop.x + 10} y={prop.y + h} width={5} height={FLOOR_Y - prop.y - h + 4} fill={fill} />
            <rect x={prop.x + prop.w - 15} y={prop.y + h} width={5} height={FLOOR_Y - prop.y - h + 4} fill={fill} />
          </>
        )}
      </g>
    );
  }
  if (prop.kind === "wall") {
    return <rect x={prop.x} y={40} width={6} height={FLOOR_Y - 36} rx={2} fill={fill} />;
  }
  if (prop.kind === "step") {
    return <rect x={prop.x} y={FLOOR_Y + 4 - prop.h} width={prop.w} height={prop.h} rx={2} fill={fill} />;
  }
  return (
    <g transform={`rotate(${prop.angle} ${prop.x} ${prop.y})`}>
      <rect x={prop.x} y={prop.y} width={prop.w} height={8} rx={3} fill={fill} />
    </g>
  );
}

/* ───────────── Mapa muscular (frente y espalda) ───────────── */

type Region = { id: MuscleId; side: "front" | "back"; d: string[] };

// Silueta en un viewBox de 0 0 110 220 por lado. Las zonas son elipses/caminos aproximados.
const E = (cx: number, cy: number, rx: number, ry: number, rot = 0) =>
  `M ${cx - rx} ${cy} a ${rx} ${ry} ${rot} 1 0 ${rx * 2} 0 a ${rx} ${ry} ${rot} 1 0 ${-rx * 2} 0`;

const REGIONS: Region[] = [
  { id: "pecho", side: "front", d: [E(43, 62, 13, 9), E(67, 62, 13, 9)] },
  { id: "deltoide_anterior", side: "front", d: [E(27, 56, 7, 8), E(83, 56, 7, 8)] },
  { id: "deltoide_lateral", side: "front", d: [E(22, 60, 4, 9), E(88, 60, 4, 9)] },
  { id: "biceps", side: "front", d: [E(23, 80, 5, 12), E(87, 80, 5, 12)] },
  { id: "antebrazo", side: "front", d: [E(19, 108, 4.5, 14), E(91, 108, 4.5, 14)] },
  { id: "abdominales", side: "front", d: ["M 47 74 h 16 v 34 a 8 8 0 0 1 -16 0 z"] },
  { id: "oblicuos", side: "front", d: [E(40, 92, 4, 14), E(70, 92, 4, 14)] },
  { id: "cuadriceps", side: "front", d: [E(43, 142, 9, 24), E(67, 142, 9, 24)] },
  { id: "aductores", side: "front", d: [E(50, 128, 3.5, 12), E(60, 128, 3.5, 12)] },
  { id: "gemelos", side: "front", d: [E(43, 190, 5, 13), E(67, 190, 5, 13)] },
  { id: "espalda_alta", side: "back", d: ["M 38 50 h 34 l 8 18 h -50 z"] },
  { id: "deltoide_posterior", side: "back", d: [E(27, 57, 7, 8), E(83, 57, 7, 8)] },
  { id: "dorsales", side: "back", d: ["M 33 68 h 44 l -8 32 h -28 z"] },
  { id: "triceps", side: "back", d: [E(23, 80, 5, 12), E(87, 80, 5, 12)] },
  { id: "antebrazo", side: "back", d: [E(19, 108, 4.5, 14), E(91, 108, 4.5, 14)] },
  { id: "lumbar", side: "back", d: ["M 47 100 h 16 v 14 h -16 z"] },
  { id: "gluteos", side: "back", d: [E(44, 124, 10, 10), E(66, 124, 10, 10)] },
  { id: "isquios", side: "back", d: [E(43, 152, 8, 20), E(67, 152, 8, 20)] },
  { id: "gemelos", side: "back", d: [E(43, 190, 6, 14), E(67, 190, 6, 14)] },
];

function Silhouette() {
  return (
    <g fill="var(--line)">
      <circle cx={55} cy={22} r={13} />
      <rect x={30} y={38} width={50} height={74} rx={14} />
      <rect x={15} y={46} width={13} height={78} rx={6.5} />
      <rect x={82} y={46} width={13} height={78} rx={6.5} />
      <rect x={33} y={108} width={21} height={100} rx={9} />
      <rect x={56} y={108} width={21} height={100} rx={9} />
    </g>
  );
}

export function MuscleMap({ primary, secondary, className = "" }: { primary: MuscleId[]; secondary: MuscleId[]; className?: string }) {
  const side = (which: "front" | "back") => (
    <g>
      <Silhouette />
      {REGIONS.filter((r) => r.side === which).map((r) =>
        r.d.map((d, i) => {
          const isPrimary = primary.includes(r.id);
          const isSecondary = secondary.includes(r.id);
          if (!isPrimary && !isSecondary) return null;
          return <path key={`${r.id}${i}`} d={d} fill="var(--accent)" opacity={isPrimary ? 1 : 0.4} />;
        }),
      )}
      <text x={55} y={218} fontSize="11" textAnchor="middle" fill="var(--muted)">
        {which === "front" ? "Frente" : "Espalda"}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 240 224" className={className} role="img" aria-label="Músculos que trabaja">
      <g transform="translate(5 0)">{side("front")}</g>
      <g transform="translate(125 0)">{side("back")}</g>
    </svg>
  );
}

export function muscleList(ids: MuscleId[]) {
  return ids.map((id) => MUSCLE_NAMES[id]);
}
