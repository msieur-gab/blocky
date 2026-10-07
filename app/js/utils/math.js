// ══════════════════════════════════════════
// Math utilities
// ══════════════════════════════════════════

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function smoothStep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function mapRange(v, inMin, inMax, outMin, outMax) {
  return outMin + (outMax - outMin) * clamp((v - inMin) / (inMax - inMin), 0, 1);
}
