// Faked 6-digit MGRS-style grid math.
// Ground plane spans X ∈ [-500, 500], Z ∈ [-500, 500] (axis-aligned, X east, Z south).
// Grid string: 6 digits, first 3 = easting (X), last 3 = northing (Z).

const MIN = -500;
const MAX = 500;
const SCALE = 0.999;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function pad3(n: number): string {
  if (n < 0) n = 0;
  if (n > 999) n = 999;
  return n.toString().padStart(3, '0');
}

export function worldToGrid(x: number, z: number): string {
  const cx = clamp(x, MIN, MAX);
  const cz = clamp(z, MIN, MAX);
  const easting = Math.round((cx - MIN) * SCALE);
  const northing = Math.round((cz - MIN) * SCALE);
  return `${pad3(easting)}${pad3(northing)}`;
}

export function gridToWorld(grid: string): { x: number; y: number; z: number } {
  const e = parseInt(grid.slice(0, 3), 10);
  const n = parseInt(grid.slice(3, 6), 10);
  const x = e / SCALE + MIN;
  const z = n / SCALE + MIN;
  return { x, y: 0, z };
}
