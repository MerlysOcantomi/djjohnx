import { describe, it, expect } from "vitest"
import {
  MANUAL_SCREENS,
  TUNNEL_LAYOUTS,
  arrivalFactor,
  cameraPose,
  fovFor,
  layoutFor,
  stageLift,
  travelLength,
  tunnelMetrics,
  walkCruise,
  walkSpeed,
} from "@/components/tunnel-hero/tunnel-config"
import { sanitizeLink } from "@/lib/site-links"

const layouts = Object.entries(TUNNEL_LAYOUTS)

describe("recorrido de camara del tunel", () => {
  it.each(layouts)("%s: empieza en la entrada y termina frente al escenario", (_, layout) => {
    const metrics = tunnelMetrics(layout)
    expect(cameraPose(layout, metrics, 0).z).toBeCloseTo(metrics.startZ)
    expect(cameraPose(layout, metrics, 1).z).toBeCloseTo(metrics.endZ)
    // La camara se detiene delante de la tarima, sin atravesarla.
    const stageFront = metrics.stage.z + metrics.stage.depth / 2
    expect(metrics.endZ).toBeGreaterThan(stageFront + 2)
  })

  it.each(layouts)("%s: avanza de forma uniforme y atraviesa los marcos", (_, layout) => {
    const metrics = tunnelMetrics(layout)
    const step = travelLength(metrics) / 200
    let previous = cameraPose(layout, metrics, 0).z
    for (let i = 1; i <= 200; i++) {
      const z = cameraPose(layout, metrics, i / 200).z
      expect(previous - z).toBeCloseTo(step, 6)
      previous = z
    }
    // Se detiene bajo el ultimo marco, que hace de umbral del escenario.
    expect(metrics.endZ).toBeLessThan(metrics.lastFrameZ + layout.spacing)
    expect(metrics.endZ).toBeGreaterThan(metrics.lastFrameZ)
  })

  it.each(layouts)("%s: es reversible (misma pose para la misma posicion)", (_, layout) => {
    const metrics = tunnelMetrics(layout)
    expect(cameraPose(layout, metrics, 0.37)).toEqual(cameraPose(layout, metrics, 0.37))
  })

  it.each(layouts)("%s: el balanceo de los pasos es sutil y se apaga al llegar", (_, layout) => {
    const metrics = tunnelMetrics(layout)
    for (let i = 0; i <= 400; i++) {
      const pose = cameraPose(layout, metrics, i / 400)
      expect(Math.abs(pose.x)).toBeLessThan(0.05)
      expect(Math.abs(pose.y - layout.eye)).toBeLessThan(0.04)
      expect(Math.abs(pose.roll)).toBeLessThan(0.006)
    }
    const end = cameraPose(layout, metrics, 1)
    expect(end.x).toBeCloseTo(0, 10)
    expect(end.y).toBeCloseTo(layout.eye, 10)
    expect(end.roll).toBeCloseTo(0, 10)
  })

  it("sin balanceo (motion = 0) la camara planea", () => {
    const layout = TUNNEL_LAYOUTS.landscape
    const metrics = tunnelMetrics(layout)
    const pose = cameraPose(layout, metrics, 0.4, 0)
    expect(pose.x).toBeCloseTo(0, 10)
    expect(pose.y).toBeCloseTo(layout.eye, 10)
    expect(pose.roll).toBeCloseTo(0, 10)
  })

  it.each(layouts)("%s: el paseo va a ritmo de caminar entre marcos", (_, layout) => {
    const metrics = tunnelMetrics(layout)
    // Entre uno y dos marcos por segundo, y el tunel entero en 12-20 s.
    expect(walkSpeed(layout) / layout.spacing).toBeGreaterThan(1)
    expect(walkSpeed(layout) / layout.spacing).toBeLessThan(2)
    const seconds = 1 / walkCruise(layout, metrics)
    expect(seconds).toBeGreaterThan(12)
    expect(seconds).toBeLessThan(20)
  })
})

describe("encuadre final", () => {
  it("solo actua al acercarse al escenario", () => {
    expect(arrivalFactor(0)).toBe(0)
    expect(arrivalFactor(0.5)).toBe(0)
    expect(arrivalFactor(1)).toBe(1)
  })

  it.each([
    ["escritorio", 1440, 810, 190],
    ["portatil bajo", 1280, 600, 150],
    ["movil vertical", 390, 844, 215],
    ["movil apaisado", 844, 390, 120],
  ])("%s: sube la imagen para dejar el escenario sobre los accesos", (_, width, height, dock) => {
    const layout = TUNNEL_LAYOUTS[layoutFor(width, height)]
    const metrics = tunnelMetrics(layout)
    const lift = stageLift(layout, metrics, fovFor(width, height), height, dock)
    expect(lift).toBeGreaterThanOrEqual(0)
    // Nunca desplaza mas de un cuarto de pantalla.
    expect(lift).toBeLessThan(height * 0.25)
    // Sin franja inferior no hace falta mover nada.
    expect(stageLift(layout, metrics, fovFor(width, height), height, 0)).toBe(0)
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

  it("el control manual recorre el tunel en unas pocas pantallas", () => {
    expect(MANUAL_SCREENS.landscape).toBeGreaterThan(2)
    expect(MANUAL_SCREENS.portrait).toBeGreaterThan(2)
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
