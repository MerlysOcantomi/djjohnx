import { clamp, damp } from "./math"

/**
 * Motor del recorrido: una unica posicion 0..1 que avanza sola ("caminar") y
 * que el visitante puede mover con rueda, dedo o teclado.
 *
 * Las dos fuentes actuan sobre el mismo objetivo y la camara lo sigue con un
 * muelle amortiguado, asi que pasar de automatico a manual (y volver) nunca
 * produce un salto: posicion y velocidad cambian siempre de forma continua. Mientras el visitante
 * interactua, el avance automatico cede; se reanuda tras un breve reposo.
 *
 * Logica pura, sin DOM ni reloj propio: quien la usa le pasa el tiempo
 * transcurrido. Si no se llama (pestana oculta, lienzo detenido), el recorrido
 * queda en pausa.
 */

export type JourneyConfig = {
  /** Ritmo de paseo del avance automatico, en fraccion del recorrido por segundo. */
  cruise: number
  /** Tramo final en el que el avance automatico frena hasta detenerse. */
  brakeDistance: number
  /** Segundos sin interaccion antes de reanudar el avance automatico. */
  resumeDelay: number
  /** Espera inicial antes de empezar a caminar. */
  startDelay: number
  /** Rapidez con la que el paseo coge velocidad (1/s). */
  accel: number
  /** Rapidez con la que el paseo cede al control manual (1/s). */
  yielding: number
  /**
   * Rigidez del muelle que lleva la camara a su objetivo (1/s). Es un muelle
   * criticamente amortiguado: ni la posicion ni la velocidad cambian de golpe.
   */
  response: number
  /** Velocidad y frenada de "saltar": un avance rapido, no un corte. */
  skipCruise: number
  skipBrakeDistance: number
  /** Inercia del gesto tactil: velocidad maxima y tiempo de frenado. */
  maxFling: number
  flingDecay: number
}

export const DEFAULT_JOURNEY: Omit<JourneyConfig, "cruise"> = {
  brakeDistance: 0.11,
  resumeDelay: 1.4,
  startDelay: 0.5,
  accel: 1.3,
  yielding: 9,
  response: 14,
  skipCruise: 0.85,
  skipBrakeDistance: 0.3,
  maxFling: 1.4,
  flingDecay: 0.32,
}

export type JourneyState = {
  /** Donde quiere estar la camara. */
  target: number
  /** Donde esta (amortiguada). Es lo que se dibuja. */
  position: number
  /** Velocidad de la camara (fraccion/s, con signo). */
  speed: number
  /** Velocidad actual del avance automatico. */
  autoSpeed: number
  /** Segundos desde la ultima interaccion. */
  idle: number
  /** Inercia pendiente del ultimo gesto tactil. */
  momentum: number
  skipping: boolean
}

export type JourneyInput = {
  /** Desplazamiento manual acumulado desde el paso anterior. */
  delta?: number
  /** Dedo apoyado en pantalla: el recorrido espera aunque no se mueva. */
  holding?: boolean
  /** Velocidad al soltar el dedo (fraccion/s): arranca la inercia. */
  fling?: number
}

export function createJourneyState(config: JourneyConfig, position = 0): JourneyState {
  return {
    target: position,
    position,
    speed: 0,
    autoSpeed: 0,
    // Arranca "en reposo" para que el paseo empiece tras la espera inicial.
    idle: config.resumeDelay - config.startDelay,
    momentum: 0,
    skipping: false,
  }
}

/** El visitante tiene el control: el avance automatico no empuja. */
export function isManual(state: JourneyState, config: JourneyConfig, holding = false) {
  return holding || state.momentum !== 0 || state.idle < config.resumeDelay
}

/**
 * Avanza el recorrido `dt` segundos. `auto` = false desactiva el paseo (solo
 * control manual). Modifica y devuelve el mismo estado.
 */
export function stepJourney(
  state: JourneyState,
  config: JourneyConfig,
  input: JourneyInput,
  dt: number,
  auto = true,
): JourneyState {
  const holding = input.holding === true

  if (input.fling !== undefined) {
    state.momentum = clamp(input.fling, -config.maxFling, config.maxFling)
  }
  if (holding) state.momentum = 0

  let delta = input.delta ?? 0
  if (state.momentum !== 0) {
    delta += state.momentum * dt
    state.momentum *= Math.exp(-dt / config.flingDecay)
    if (Math.abs(state.momentum) < 0.004) state.momentum = 0
  }

  // Cualquier gesto del visitante manda: reinicia el reposo y cancela el salto.
  if (delta !== 0 || holding) {
    state.idle = 0
    state.skipping = false
  } else {
    state.idle += dt
  }
  state.target = clamp(state.target + delta)

  const walking = state.skipping || (auto && !isManual(state, config, holding))
  const cruise = state.skipping ? config.skipCruise : config.cruise
  const brake = state.skipping ? config.skipBrakeDistance : config.brakeDistance
  // Frenada de deceleracion constante: velocidad cero justo al llegar.
  const remaining = 1 - state.target
  const limit = cruise * Math.sqrt(Math.min(1, remaining / brake))
  const goal = walking ? limit : 0
  const rate = goal > state.autoSpeed ? (state.skipping ? config.accel * 8 : config.accel) : config.yielding
  state.autoSpeed = Math.min(damp(state.autoSpeed, goal, rate, dt), walking ? limit : Infinity)
  if (state.autoSpeed < 1e-5 && goal === 0) state.autoSpeed = 0

  state.target = clamp(state.target + state.autoSpeed * dt)
  if (1 - state.target < 1e-5) {
    state.target = 1
    state.skipping = false
  }

  followTarget(state, config.response, dt)

  return state
}

/**
 * Muelle criticamente amortiguado (solucion exacta, estable con cualquier dt):
 * la camara sigue al objetivo sin rebasarlo y con velocidad continua.
 */
function followTarget(state: JourneyState, omega: number, dt: number) {
  if (dt <= 0) return
  const offset = state.position - state.target
  const drift = state.speed + omega * offset
  const decay = Math.exp(-omega * dt)
  state.position = state.target + (offset + drift * dt) * decay
  state.speed = (drift - omega * (offset + drift * dt)) * decay

  // En los extremos del recorrido la camara no puede salirse.
  if (state.position <= 0 || state.position >= 1) {
    state.position = clamp(state.position)
    state.speed = 0
  }
  if (Math.abs(state.target - state.position) < 2e-5 && Math.abs(state.speed) < 2e-4) {
    state.position = state.target
    state.speed = 0
  }
}

/** Avance rapido hasta el final (boton "Saltar" o foco en los accesos). */
export function skipJourney(state: JourneyState) {
  if (state.target < 1) state.skipping = true
  state.momentum = 0
}
