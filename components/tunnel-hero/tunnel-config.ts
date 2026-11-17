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

/** Separacion entre el marco LED de la pared del fondo y los bordes del tunel. */
export const BACK_FRAME_INSET = 0.78

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

/* ------------------------------ Recorrido ------------------------------ */

/** Marcos LED que se atraviesan por segundo al caminar. */
export const WALK_FRAMES_PER_SECOND = 1.35

/** Pasos por cada tramo entre dos marcos: marca la cadencia del balanceo. */
const STEPS_PER_FRAME = 1.5

/** Altos de pantalla de rueda o arrastre que equivalen al tunel completo. */
export const MANUAL_SCREENS: Record<TunnelOrientation, number> = { landscape: 3.5, portrait: 3 }

/** Metros entre la posicion inicial de la camara y la final. */
export const travelLength = (metrics: TunnelMetrics) => metrics.startZ - metrics.endZ

/** Velocidad de paseo en m/s. */
export const walkSpeed = (layout: TunnelLayout) => WALK_FRAMES_PER_SECOND * layout.spacing

/** Ritmo de paseo como fraccion del recorrido por segundo. */
export const walkCruise = (layout: TunnelLayout, metrics: TunnelMetrics) =>
  walkSpeed(layout) / travelLength(metrics)

/** 0 mientras se recorre el tunel, 1 al llegar: gobierna el encuadre final. */
export const arrivalFactor = (travel: number) => EASINGS.smooth(progressIn(0.72, 1, clamp(travel)))

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

/**
 * Pose de la camara para un punto del recorrido. Es funcion pura de la
 * posicion: el balanceo de los pasos depende de la distancia recorrida (no del
 * tiempo), asi que al retroceder se deshace el mismo camino y al detenerse la
 * camara se queda quieta. `motion` (0..1) atenua el balanceo: a velocidad de
 * paseo vale 1; cuando el visitante avanza rapido baja a 0 y la camara planea.
 */
export function cameraPose(
  layout: TunnelLayout,
  metrics: TunnelMetrics,
  travel: number,
  motion = 1,
): CameraPose {
  const t = clamp(travel)
  const z = lerp(metrics.startZ, metrics.endZ, t)
  const distance = metrics.startZ - z

  // Media vuelta por paso: la cabeza sube y baja una vez por paso y se mece
  // de lado a lado una vez cada dos.
  const step = (distance / (layout.spacing / STEPS_PER_FRAME)) * Math.PI
  // Al llegar al escenario la camara se asienta.
  const settle = 1 - EASINGS.smooth(progressIn(0.86, 1, t))
  const bob = motion * settle

  return {
    x: Math.sin(step) * 0.034 * bob,
    y: layout.eye + Math.cos(step * 2) * 0.026 * bob,
    z,
    lookX: 0,
    lookY: lerp(layout.eye * 0.96, metrics.focusY, arrivalFactor(t)),
    lookZ: z - 18,
    roll: Math.sin(step) * 0.0045 * bob,
    distance,
  }
}

/**
 * Px que hay que subir la imagen final (desplazamiento de lente, sin inclinar
 * la camara) para que el escenario quede entero por encima de la franja
 * inferior ocupada por los accesos. Se limita para no sacar por arriba el
 * marco LED del fondo.
 */
export function stageLift(
  layout: TunnelLayout,
  metrics: TunnelMetrics,
  fovDegrees: number,
  viewportHeight: number,
  clearBottom: number,
): number {
  const pitch = Math.atan2(metrics.focusY - layout.eye, 18)
  const scale = 1 / Math.tan((fovDegrees * Math.PI) / 360)
  // Altura en pantalla (px desde arriba) de un punto del eje del tunel.
  const screenY = (y: number, z: number) => {
    const dy = y - layout.eye
    const forward = metrics.endZ - z
    const depth = dy * Math.sin(pitch) + forward * Math.cos(pitch)
    const height = dy * Math.cos(pitch) - forward * Math.sin(pitch)
    return (viewportHeight / 2) * (1 - (height / depth) * scale)
  }

  const margin = viewportHeight * 0.03
  const stageBottom = screenY(0, metrics.stage.z + metrics.stage.depth / 2)
  const frameTop = screenY(layout.height - BACK_FRAME_INSET, metrics.backWallZ)
  const wanted = stageBottom - (viewportHeight - clearBottom - margin)
  return Math.max(0, Math.min(wanted, frameTop - margin))
}
