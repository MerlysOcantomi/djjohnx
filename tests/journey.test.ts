import { describe, it, expect } from "vitest"
import {
  DEFAULT_JOURNEY,
  createJourneyState,
  isManual,
  skipJourney,
  stepJourney,
  type JourneyConfig,
  type JourneyInput,
} from "@/lib/cinematic/journey"

const config: JourneyConfig = { ...DEFAULT_JOURNEY, cruise: 0.06 }
const DT = 1 / 60

/** Simula `seconds` a 60 fps y devuelve la posicion en cada fotograma. */
function run(state = createJourneyState(config), seconds: number, input: (frame: number) => JourneyInput = () => ({})) {
  const positions: number[] = []
  const frames = Math.round(seconds / DT)
  for (let frame = 0; frame < frames; frame++) {
    stepJourney(state, config, input(frame), DT)
    positions.push(state.position)
  }
  return positions
}

const maxStep = (positions: number[]) =>
  positions.slice(1).reduce((max, value, i) => Math.max(max, Math.abs(value - positions[i])), 0)

describe("avance automatico", () => {
  it("empieza a caminar solo, sin ninguna interaccion", () => {
    const state = createJourneyState(config)
    run(state, config.startDelay - 0.1)
    expect(state.position).toBe(0)
    run(state, 3)
    expect(state.position).toBeGreaterThan(0.05)
  })

  it("llega al final y se detiene suavemente, sin pasarse", () => {
    const state = createJourneyState(config)
    const positions = run(state, 40)
    expect(state.position).toBe(1)
    expect(state.speed).toBe(0)
    expect(Math.max(...positions)).toBeLessThanOrEqual(1)
    // Siempre hacia delante.
    for (let i = 1; i < positions.length; i++) expect(positions[i]).toBeGreaterThanOrEqual(positions[i - 1])

    // La velocidad con la que entra en el ultimo tramo es mucho menor que la de paseo.
    const arrival = positions.findIndex((value) => value >= 0.999)
    const finalSpeed = (positions[arrival] - positions[arrival - 6]) / (6 * DT)
    expect(finalSpeed).toBeLessThan(config.cruise * 0.25)
  })

  it("mantiene el ritmo de paseo en el tramo central", () => {
    const positions = run(undefined, 10)
    const speed = (positions[540] - positions[480]) / (60 * DT)
    expect(speed).toBeCloseTo(config.cruise, 3)
  })

  it("no arranca de golpe: acelera de forma progresiva", () => {
    const positions = run(undefined, 6)
    const speeds = positions.slice(1).map((value, i) => (value - positions[i]) / DT)
    const maxAcceleration = speeds
      .slice(1)
      .reduce((max, value, i) => Math.max(max, Math.abs(value - speeds[i]) / DT), 0)
    // Menos de dos veces la velocidad de paseo por segundo.
    expect(maxAcceleration).toBeLessThan(config.cruise * 2)
  })

  it("desactivado (version fija) no se mueve", () => {
    const state = createJourneyState(config)
    for (let i = 0; i < 600; i++) stepJourney(state, config, {}, DT, false)
    expect(state.position).toBe(0)
  })

  it("si no se le da tiempo (pestana oculta), queda en pausa", () => {
    const state = createJourneyState(config)
    run(state, 5)
    const paused = state.position
    stepJourney(state, config, {}, 0)
    expect(state.position).toBe(paused)
  })
})

describe("control manual", () => {
  it("tomar el control no produce saltos de camara", () => {
    const state = createJourneyState(config)
    const walking = run(state, 6)
    const walkStep = maxStep(walking.slice(-60))

    // Rafaga fuerte de rueda hacia atras en mitad del paseo: un cuarto de tunel.
    const gesture = 12 * 0.02
    const manual = run(state, 1.5, (frame) => (frame < 12 ? { delta: -0.02 } : {}))
    const sequence = [walking[walking.length - 1], ...manual]
    // La posicion es continua: cada fotograma se mueve una fraccion pequena
    // del gesto, nunca el gesto entero de una vez.
    expect(maxStep(sequence)).toBeLessThan(gesture * 0.1)
    // El primer fotograma tras tomar el control apenas se distingue del paseo.
    expect(Math.abs(sequence[1] - sequence[0])).toBeLessThan(walkStep * 4)
    // Y obedece: la camara ha retrocedido.
    expect(state.position).toBeLessThan(walking[walking.length - 1])
  })

  it("tampoco hay tirones: la velocidad arranca desde la que llevaba", () => {
    // Tras un golpe de rueda, la velocidad en el instante siguiente es tanto
    // menor cuanto mas corto es el instante: no cambia de golpe.
    const speedAfter = (dt: number) => {
      const state = createJourneyState(config)
      stepJourney(state, config, { delta: 0.05 }, dt)
      return state.speed
    }
    expect(speedAfter(1 / 600)).toBeLessThan(speedAfter(1 / 60) * 0.2)
    expect(speedAfter(1 / 60)).toBeGreaterThan(0)
  })

  it("no rebasa los extremos aunque llegue lanzada", () => {
    const state = createJourneyState(config, 0.9)
    const positions = run(state, 2, (frame) => (frame < 6 ? { delta: 0.05 } : {}))
    expect(Math.max(...positions)).toBeLessThanOrEqual(1)
    expect(state.position).toBe(1)
    expect(state.speed).toBe(0)
  })

  it("mientras el visitante interactua, el paseo no empuja", () => {
    const state = createJourneyState(config)
    run(state, 6)
    const before = state.target
    // Dedo apoyado y quieto durante 3 s.
    run(state, 3, () => ({ holding: true }))
    expect(isManual(state, config, true)).toBe(true)
    expect(state.autoSpeed).toBe(0)
    expect(state.target - before).toBeLessThan(0.01)
  })

  it("al soltar, el paseo se reanuda tras un breve reposo y sin tiron", () => {
    const state = createJourneyState(config)
    run(state, 6)
    run(state, 1, () => ({ holding: true }))
    const held = state.position

    const waiting = run(state, config.resumeDelay - 0.1)
    expect(waiting[waiting.length - 1]).toBeCloseTo(held, 3)

    const resumed = run(state, 4)
    expect(state.position).toBeGreaterThan(held + 0.05)
    expect(maxStep([held, ...waiting, ...resumed])).toBeLessThan(config.cruise * DT * 1.2)
  })

  it("avanza y retrocede con la rueda dentro de los limites", () => {
    const state = createJourneyState(config)
    run(state, 0.3, () => ({ delta: 0.05 }))
    expect(state.target).toBeGreaterThan(0.5)
    run(state, 2, () => ({ delta: -0.05 }))
    expect(state.target).toBe(0)
    expect(state.position).toBeGreaterThanOrEqual(0)
    run(state, 2, () => ({ delta: 0.2 }))
    expect(state.target).toBe(1)
    expect(state.position).toBeLessThanOrEqual(1)
  })

  it("el gesto tactil tiene inercia y se agota sola", () => {
    const state = createJourneyState(config)
    stepJourney(state, config, { fling: 0.5 }, DT)
    const coasting = run(state, 0.5)
    expect(coasting[coasting.length - 1]).toBeGreaterThan(0.05)
    run(state, 3)
    expect(state.momentum).toBe(0)
  })

  it("la inercia esta limitada aunque el gesto sea muy brusco", () => {
    const state = createJourneyState(config)
    stepJourney(state, config, { fling: 50 }, DT)
    expect(state.momentum).toBeLessThanOrEqual(config.maxFling)
  })

  it("tocar la pantalla detiene la inercia", () => {
    const state = createJourneyState(config)
    stepJourney(state, config, { fling: 1 }, DT)
    stepJourney(state, config, { holding: true }, DT)
    expect(state.momentum).toBe(0)
  })
})

describe("saltar el recorrido", () => {
  it("lleva al final en poco tiempo, frenando en vez de cortar", () => {
    const state = createJourneyState(config)
    run(state, 2)
    skipJourney(state)
    const positions = run(state, 4)
    expect(state.position).toBe(1)
    const arrival = positions.findIndex((value) => value >= 0.999)
    expect(arrival * DT).toBeLessThan(3)
    // Es un avance rapido, no un teletransporte.
    expect(maxStep(positions)).toBeLessThan(0.02)
  })

  it("un gesto del visitante lo cancela", () => {
    const state = createJourneyState(config)
    skipJourney(state)
    run(state, 0.3)
    stepJourney(state, config, { delta: -0.01 }, DT)
    expect(state.skipping).toBe(false)
  })

  it("al final del recorrido no hace nada", () => {
    const state = createJourneyState(config, 1)
    skipJourney(state)
    expect(state.skipping).toBe(false)
  })
})
