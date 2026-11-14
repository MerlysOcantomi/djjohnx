import { EASINGS, clamp, lerp, progressIn } from "@/lib/cinematic/math"

/**
 * Configuracion pura del tunel (sin three.js ni DOM): dimensiones, paleta,
 * recorrido de camara y punto reservado para el DJ set. Al ser funciones puras
 * se pueden probar con Vitest y la escena 3D solo las dibuja.
 *
 * Unidades en metros. La camara mira hacia -Z; el suelo esta en y = 0.
 */

export type TunnelOrientation = "landscape" | "portrait"

export type TunnelLayout = {
  /** Mitad del ancho interior del tunel. */
  halfWidth: number
  /** Altura interior. */
  height: number
  /** Altura de los ojos: la camara "camina". */
  eye: number
  /** Distancia entre marcos LED consecutivos. */
  spacing: number
  /** Numero de marcos LED. */
  frames: number
}

/**
 * En vertical (movil) el tunel es mas estrecho y alto para que el rectangulo
 * siga llenando la pantalla, y algo mas corto para que el recorrido no se haga
 * largo con el dedo.
 */
export const TUNNEL_LAYOUTS: Record<TunnelOrientation, TunnelLayout> = {
  landscape: { halfWidth: 4, height: 4.8, eye: 1.65, spacing: 5, frames: 22 },
  portrait: { halfWidth: 2.45, height: 5.7, eye: 1.65, spacing: 4.4, frames: 20 },
}

export const layoutFor = (width: number, height: number): TunnelOrientation =>
  width / Math.max(1, height) < 0.9 ? "portrait" : "landscape"

/**
 * Campo de vision vertical segun la proporcion de la pantalla: cuanto mas
 * estrecha, mas abierto, para que las paredes no se salgan del encuadre.
 */
export function fovFor(width: number, height: number): number {
  const aspect = width / Math.max(1, height)
  return layoutFor(width, height) === "portrait"
    ? lerp(80, 70, progressIn(0.42, 0.9, aspect))
    : lerp(70, 58, progressIn(0.9, 1.9, aspect))
}

/** Paleta LED aprobada: azul, violeta y magenta. */
export const NEON = {
  magenta: "#ff1fc8",
  pink: "#ff4d9d",
  violet: "#8a3dff",
  blue: "#2b5cff",
  cyan: "#19c2ff",
} as const

/** Color [pared izquierda, pared derecha] de cada marco; se repite en bucle. */
export const FRAME_COLORS: readonly (readonly [string, string])[] = [
  [NEON.magenta, NEON.cyan],
  [NEON.pink, NEON.blue],
  [NEON.blue, NEON.magenta],
  [NEON.violet, NEON.cyan],
]

/** Niebla y oscuridad de fondo. */
export const HAZE_COLOR = "#0c0726"

export type TunnelMetrics = {
  firstFrameZ: number
  lastFrameZ: number
  /** Posicion de la camara al empezar y al llegar. */
  startZ: number
  endZ: number
  /** Limites de la caja del tunel. */
  frontZ: number
  backWallZ: number
  /** Tarima del escenario final. */
  stage: { z: number; width: number; depth: number; height: number }
  /** Barra de luz de la pared del fondo. */
  bar: { y: number; width: number }
  /**
   * Punto reservado para el DJ set de John: origen a ras de tarima, centrado,
   * mirando hacia la camara (+Z). `size` es el volumen previsto (ancho, alto,
   * fondo) para encajar la cabina y a John.
   */
  djSet: { position: readonly [number, number, number]; size: readonly [number, number, number] }
  /** Altura a la que mira la camara al llegar (centro del futuro DJ set). */
  focusY: number
}

export function tunnelMetrics(layout: TunnelLayout): TunnelMetrics {
  const firstFrameZ = -3.5
  const lastFrameZ = firstFrameZ - (layout.frames - 1) * layout.spacing
  const stageZ = lastFrameZ - 5.5
  const backWallZ = stageZ - 4.2
  const startZ = 1.5
  const endZ = stageZ + 6.2
  const stageWidth = Math.min(4.8, layout.halfWidth * 2 - 1.3)
  const stageHeight = 0.32
  const setWidth = Math.min(3.2, stageWidth - 0.5)

  return {
    firstFrameZ,
    lastFrameZ,
    startZ,
    endZ,
    frontZ: startZ + 9,
    backWallZ,
    stage: { z: stageZ, width: stageWidth, depth: 2.6, height: stageHeight },
    bar: { y: 0.95, width: layout.halfWidth * 2 * 0.74 },
    djSet: { position: [0, stageHeight, stageZ], size: [setWidth, 2.3, 1.2] },
    focusY: stageHeight + 1.15,
  }
}

export type TravelPhases = {
  /** 0..1 mientras la camara recorre el tunel. */
  travel: number
  /** 0..1 mientras los dos bloques suben por encima del final del tunel. */
  tail: number
  /** Progreso en el que termina el recorrido y empieza la transicion. */
  cover: number
}

/**
 * El ultimo alto de pantalla del track queda solapado por la seccion de los dos
 * bloques (margen negativo en CSS). Aqui se separa el progreso en "recorrido" y
 * "transicion" a partir de las medidas reales del DOM.
 */
export function splitProgress(progress: number, stageHeight: number, scrollable: number): TravelPhases {
  const cover = scrollable > stageHeight * 1.5 ? 1 - stageHeight / scrollable : 1
  return {
    travel: clamp(progress / cover),
    tail: progressIn(cover, 1, progress),
    cover,
  }
}

export type CameraPose = {
  x: number
  y: number
  z: number
  lookX: number
  lookY: number
  lookZ: number
  /** Balanceo en radianes. */
  roll: number
  /** Metros recorridos desde el inicio. */
  distance: number
}

/** Metros que dura un "paso" del balanceo de camara. */
const STRIDE = 7

/**
 * Perfil de velocidad trapezoidal: la camara responde al primer gesto de
 * scroll, mantiene velocidad constante y frena con suavidad hasta detenerse
 * justo delante del escenario (velocidad cero al llegar).
 */
const EASE_IN = 0.05
const EASE_OUT = 0.24

export function travelEase(travel: number): number {
  const t = clamp(travel)
  const cruise = 1 / (1 - (EASE_IN + EASE_OUT) / 2)
  if (t < EASE_IN) return (cruise * t * t) / (2 * EASE_IN)
  if (t > 1 - EASE_OUT) return 1 - (cruise * (1 - t) * (1 - t)) / (2 * EASE_OUT)
  return cruise * (t - EASE_IN / 2)
}

/**
 * Pose de la camara para un punto del recorrido. Es funcion pura del progreso:
 * el balanceo depende de la distancia recorrida (no del tiempo), asi que el
 * camino de vuelta es identico al de ida. `motion` 0 desactiva el balanceo.
 */
export function cameraPose(
  layout: TunnelLayout,
  metrics: TunnelMetrics,
  travel: number,
  tail = 0,
  motion = 1,
): CameraPose {
  const t = clamp(travel)
  const z = lerp(metrics.startZ, metrics.endZ, travelEase(t)) - clamp(tail) * 0.9
  const distance = metrics.startZ - z

  const stride = (distance / STRIDE) * Math.PI * 2
  // Al llegar al escenario la camara se asienta.
  const settle = 1 - 0.85 * EASINGS.smooth(progressIn(0.84, 1, t))
  const bob = motion * settle

  const arrive = EASINGS.smooth(progressIn(0.72, 1, t))

  return {
    x: Math.sin(stride * 0.5) * 0.06 * bob,
    y: layout.eye + Math.sin(stride) * 0.035 * bob,
    z,
    lookX: 0,
    lookY: lerp(layout.eye * 0.96, metrics.focusY, arrive),
    lookZ: z - 18,
    roll: Math.sin(stride * 0.5) * 0.006 * bob,
    distance,
  }
}
