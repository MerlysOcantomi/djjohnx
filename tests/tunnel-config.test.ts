import { describe, it, expect } from "vitest"
import {
  TUNNEL_LAYOUTS,
  cameraPose,
  fovFor,
  layoutFor,
  splitProgress,
  travelEase,
  tunnelMetrics,
} from "@/components/tunnel-hero/tunnel-config"
import { sanitizeLink } from "@/lib/site-links"

const layouts = Object.entries(TUNNEL_LAYOUTS)

describe("recorrido de camara del tunel", () => {
  it.each(layouts)("%s: empieza en la entrada y termina frente al escenario", (_, layout) => {
    const metrics = tunnelMetrics(layout)
    expect(cameraPose(layout, metrics, 0).z).toBeCloseTo(metrics.startZ)
    expect(cameraPose(layout, metrics, 1).z).toBeCloseTo(metrics.endZ)
    // La camara nunca atraviesa la tarima ni la pared del fondo.
    const stageFront = metrics.stage.z + metrics.stage.depth / 2
    expect(cameraPose(layout, metrics, 1, 1).z).toBeGreaterThan(stageFront + 2)
  })

  it.each(layouts)("%s: avanza siempre hacia delante al hacer scroll", (_, layout) => {
    const metrics = tunnelMetrics(layout)
    let previous = cameraPose(layout, metrics, 0).z
    for (let step = 1; step <= 200; step++) {
      const z = cameraPose(layout, metrics, step / 200).z
      expect(z).toBeLessThan(previous)
      previous = z
    }
  })

  it.each(layouts)("%s: es reversible (misma pose para el mismo progreso)", (_, layout) => {
    const metrics = tunnelMetrics(layout)
    expect(cameraPose(layout, metrics, 0.37)).toEqual(cameraPose(layout, metrics, 0.37))
  })

  it.each(layouts)("%s: la camara se mantiene dentro del tunel", (_, layout) => {
    const metrics = tunnelMetrics(layout)
    for (let step = 0; step <= 100; step++) {
      const pose = cameraPose(layout, metrics, step / 100)
      expect(Math.abs(pose.x)).toBeLessThan(layout.halfWidth * 0.1)
      expect(Math.abs(pose.y - layout.eye)).toBeLessThan(0.05)
    }
  })

  it("frena hasta detenerse al llegar al escenario, sin saltos de velocidad", () => {
    expect(travelEase(0)).toBe(0)
    expect(travelEase(1)).toBe(1)
    const speed = (t: number) => (travelEase(t + 1e-4) - travelEase(t - 1e-4)) / 2e-4
    expect(speed(0.9999)).toBeLessThan(0.01)
    // Continuidad de la velocidad en las uniones de los tres tramos.
    for (const joint of [0.05, 0.76]) {
      expect(speed(joint - 1e-3)).toBeCloseTo(speed(joint + 1e-3), 1)
    }
  })

  it("sin movimiento (motion = 0) no hay balanceo", () => {
    const layout = TUNNEL_LAYOUTS.landscape
    const metrics = tunnelMetrics(layout)
    const pose = cameraPose(layout, metrics, 0.4, 0, 0)
    expect(pose.x).toBeCloseTo(0, 10)
    expect(pose.y).toBeCloseTo(layout.eye, 10)
    expect(pose.roll).toBeCloseTo(0, 10)
  })
})

describe("geometria del tunel", () => {
  it.each(layouts)("%s: el DJ set queda centrado sobre la tarima y cabe en ella", (_, layout) => {
    const { djSet, stage, backWallZ, lastFrameZ } = tunnelMetrics(layout)
    expect(djSet.position[0]).toBe(0)
    expect(djSet.position[1]).toBe(stage.height)
    expect(djSet.position[2]).toBe(stage.z)
    expect(djSet.size[0]).toBeLessThan(stage.width)
    expect(djSet.size[1]).toBeLessThan(layout.height - stage.height)
    expect(stage.z).toBeLessThan(lastFrameZ)
    expect(stage.z - stage.depth / 2).toBeGreaterThan(backWallZ)
    expect(stage.width).toBeLessThan(layout.halfWidth * 2)
  })

  it("elige la disposicion vertical en pantallas de movil", () => {
    expect(layoutFor(390, 844)).toBe("portrait")
    expect(layoutFor(1440, 900)).toBe("landscape")
    expect(layoutFor(1024, 768)).toBe("landscape")
  })

  it("abre el campo de vision cuanto mas estrecha es la pantalla", () => {
    expect(fovFor(390, 844)).toBeGreaterThan(fovFor(1440, 900))
    expect(fovFor(1024, 768)).toBeGreaterThan(fovFor(1920, 1080))
  })
})

describe("fases del scroll", () => {
  it("reserva el ultimo alto de pantalla para la transicion a los bloques", () => {
    // Track de 5.5 pantallas: 4.5 de scroll, la ultima es la transicion.
    const stage = 800
    const scrollable = 4.5 * stage
    expect(splitProgress(0, stage, scrollable)).toMatchObject({ travel: 0, tail: 0 })
    const arrival = splitProgress(3.5 / 4.5, stage, scrollable)
    expect(arrival.travel).toBeCloseTo(1)
    expect(arrival.tail).toBeCloseTo(0)
    expect(splitProgress(1, stage, scrollable)).toMatchObject({ travel: 1, tail: 1 })
  })

  it("sin track largo (version fija) no hay recorrido ni transicion", () => {
    expect(splitProgress(0, 800, 0)).toMatchObject({ travel: 0, tail: 0 })
  })
})

describe("enlace de IAM PROSOUND", () => {
  it("sin URL configurada no enlaza a ningun sitio", () => {
    expect(sanitizeLink(undefined)).toBeNull()
    expect(sanitizeLink("")).toBeNull()
    expect(sanitizeLink("   ")).toBeNull()
  })

  it("acepta rutas internas y URLs https", () => {
    expect(sanitizeLink("/iam-prosound")).toBe("/iam-prosound")
    expect(sanitizeLink(" https://example.com/landing ")).toBe("https://example.com/landing")
  })

  it("descarta esquemas peligrosos o no seguros", () => {
    expect(sanitizeLink("javascript:alert(1)")).toBeNull()
    expect(sanitizeLink("http://example.com")).toBeNull()
    expect(sanitizeLink("//example.com")).toBeNull()
    expect(sanitizeLink("no es una url")).toBeNull()
  })
})
