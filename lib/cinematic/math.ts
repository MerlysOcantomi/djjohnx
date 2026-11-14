/**
 * Utilidades del motor cinematografico. Portadas del motor ScrollSequence de
 * DJ-Canet: funciones puras, sin React ni DOM, para que todo el recorrido sea
 * una funcion determinista del progreso (y por tanto reversible).
 */

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t

/** Posicion normalizada de `value` dentro de [from, to], limitada a 0..1. */
export const progressIn = (from: number, to: number, value: number) =>
  to === from ? (value >= to ? 1 : 0) : clamp((value - from) / (to - from))

/**
 * Amortiguador exponencial independiente de la tasa de refresco: a 30, 60 o
 * 120 Hz la camara tarda lo mismo en alcanzar su objetivo.
 */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt))

export const EASINGS = {
  linear: (t: number) => t,
  smooth: (t: number) => t * t * (3 - 2 * t),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  inQuad: (t: number) => t * t,
} as const

export type EasingName = keyof typeof EASINGS
