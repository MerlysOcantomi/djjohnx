import * as THREE from "three"
import {
  FRAME_COLORS,
  HAZE_COLOR,
  NEON,
  tunnelMetrics,
  type TunnelLayout,
  type TunnelMetrics,
} from "./tunnel-config"
import {
  DUST_FRAGMENT,
  DUST_VERTEX,
  FLOOR_FRAGMENT,
  GLOW_FRAGMENT,
  GLOW_VERTEX,
  HALO_FRAGMENT,
  HALO_VERTEX,
  SHELL_FRAGMENT,
  SMOKE_FRAGMENT,
  SMOKE_VERTEX,
  SURFACE_VERTEX,
  TUBE_FRAGMENT,
  TUBE_VERTEX,
} from "./tunnel-shaders"

/**
 * Construye el tunel con three.js "a mano" (sin React): unas pocas mallas
 * instanciadas y materiales con shader propio. En total son ~10 draw calls.
 *
 * - `scenery`: caja del tunel, suelo, tarima, humo y polvo.
 * - `lights`: todo lo que emite luz (tubos, halos, resplandor del fondo). Es lo
 *   unico que se dibuja, espejado, en la pasada de reflejo del suelo.
 */

export type TunnelDetail = {
  /** Particulas de polvo en suspension. */
  dust: number
  /** 1 = un banco de humo por tramo; 2 = uno cada dos tramos. */
  smokeEvery: number
}

export type TunnelWorld = {
  layout: TunnelLayout
  metrics: TunnelMetrics
  scenery: THREE.Group
  lights: THREE.Group
  uniforms: {
    time: THREE.IUniform<number>
    pixelWorld: THREE.IUniform<number>
    resolution: THREE.IUniform<THREE.Vector2>
    reflection: THREE.IUniform<THREE.Texture | null>
    dustSize: THREE.IUniform<number>
  }
  dispose: () => void
}

type Axis = "x" | "y" | "z"

type Segment = {
  center: [number, number, number]
  axis: Axis
  length: number
  colorA: THREE.Color
  colorB: THREE.Color
  /** Indice de marco: desfasa la onda de brillo. */
  phase: number
  thickness?: number
  /** Sin tubo: solo el halo (banos de luz). */
  tube?: boolean
  halo?: {
    width: number
    gain: number
    widthAxis: Axis
    offset?: [number, number, number]
    /** false = solo el bano de luz ancho, sin nucleo brillante. */
    core?: boolean
  }
}

const X = new THREE.Vector3(1, 0, 0)
const Y = new THREE.Vector3(0, 1, 0)
const Z = new THREE.Vector3(0, 0, 1)
const AXES: Record<Axis, THREE.Vector3> = { x: X, y: Y, z: Z }

/** Direccion del largo del segmento. En Z apunta hacia el fondo. */
const lengthDir = (axis: Axis) => (axis === "z" ? Z.clone().negate() : AXES[axis].clone())

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Textura de ruido repetible generada una sola vez en CPU.
 * R = grano fino, G = manchas grandes (charcos), BA = pendiente (relieve).
 * Al ser una textura con mipmaps no parpadea a lo lejos como el ruido
 * procedural por pixel, y es mucho mas barata.
 */
function createNoiseTexture(size = 256) {
  const rand = mulberry32(20261114)
  const lattice = (period: number) => {
    const values = new Float32Array(period * period)
    for (let i = 0; i < values.length; i++) values[i] = rand()
    return { period, values }
  }
  type Lattice = ReturnType<typeof lattice>

  const sample = ({ period, values }: Lattice, u: number, v: number) => {
    const x = u * period
    const y = v * period
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const fx = x - xi
    const fy = y - yi
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const i0 = ((xi % period) + period) % period
    const j0 = ((yi % period) + period) % period
    const i1 = (i0 + 1) % period
    const j1 = (j0 + 1) % period
    const a = values[j0 * period + i0]
    const b = values[j0 * period + i1]
    const c = values[j1 * period + i0]
    const d = values[j1 * period + i1]
    return a + (b - a) * sx + (c - a + (a - b - c + d) * sx) * sy
  }

  const field = (periods: number[]) => {
    const octaves = periods.map(lattice)
    const out = new Float32Array(size * size)
    let min = Infinity
    let max = -Infinity
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        let sum = 0
        let amp = 1
        for (const octave of octaves) {
          sum += sample(octave, i / size, j / size) * amp
          amp *= 0.5
        }
        out[j * size + i] = sum
        if (sum < min) min = sum
        if (sum > max) max = sum
      }
    }
    const range = max - min || 1
    for (let i = 0; i < out.length; i++) out[i] = (out[i] - min) / range
    return out
  }

  const grain = field([8, 16, 32, 64])
  const blotch = field([3, 6, 12])
  const relief = field([6, 12, 24, 48])

  const data = new Uint8Array(size * size * 4)
  const wrap = (n: number) => (n + size) % size
  let maxSlope = 1e-6
  const slopes = new Float32Array(size * size * 2)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const dx = relief[j * size + wrap(i + 1)] - relief[j * size + wrap(i - 1)]
      const dy = relief[wrap(j + 1) * size + i] - relief[wrap(j - 1) * size + i]
      slopes[(j * size + i) * 2] = dx
      slopes[(j * size + i) * 2 + 1] = dy
      maxSlope = Math.max(maxSlope, Math.abs(dx), Math.abs(dy))
    }
  }
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = Math.round(grain[i] * 255)
    data[i * 4 + 1] = Math.round(blotch[i] * 255)
    data[i * 4 + 2] = Math.round((0.5 + (slopes[i * 2] / maxSlope) * 0.5) * 255)
    data[i * 4 + 3] = Math.round((0.5 + (slopes[i * 2 + 1] / maxSlope) * 0.5) * 255)
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

function segmentList(layout: TunnelLayout, m: TunnelMetrics): Segment[] {
  const { halfWidth: hw, height: H, spacing, frames } = layout
  const inset = 0.14
  const segments: Segment[] = []
  const color = (hex: string) => new THREE.Color(hex)

  // Marcos rectangulares: tubo en cada pared y en el techo.
  for (let k = 0; k < frames; k++) {
    const z = m.firstFrameZ - k * spacing
    const [left, right] = FRAME_COLORS[k % FRAME_COLORS.length]
    const cL = color(left)
    const cR = color(right)
    const wallLength = H - 0.16
    segments.push(
      {
        center: [-hw + inset, H / 2, z],
        axis: "y",
        length: wallLength,
        colorA: cL,
        colorB: cL.clone().lerp(cR, 0.18),
        phase: k,
        halo: { width: 1.5, gain: 1, widthAxis: "x" },
      },
      {
        center: [hw - inset, H / 2, z],
        axis: "y",
        length: wallLength,
        colorA: cR,
        colorB: cR.clone().lerp(cL, 0.18),
        phase: k,
        halo: { width: 1.5, gain: 1, widthAxis: "x" },
      },
      {
        center: [0, H - inset, z],
        axis: "x",
        length: hw * 2 - inset * 2,
        colorA: cL,
        colorB: cR,
        phase: k,
        halo: { width: 1.5, gain: 1, widthAxis: "y" },
      },
    )
  }

  // Tiras LED continuas a lo largo del suelo, junto a cada pared.
  const stripNear = m.frontZ - 1
  const stripFar = m.backWallZ + 0.2
  const stripLength = stripNear - stripFar
  const stripZ = (stripNear + stripFar) / 2
  const stripX = hw - 0.34
  for (const side of [-1, 1]) {
    segments.push(
      {
        center: [side * stripX, 0.04, stripZ],
        axis: "z",
        length: stripLength,
        colorA: color(NEON.cyan),
        colorB: color(NEON.blue),
        phase: 0,
        thickness: 0.06,
        halo: { width: 1.5, gain: 0.5, widthAxis: "x", offset: [0, -0.025, 0], core: false },
      },
      {
        center: [side * (stripX - 0.3), 0.03, stripZ],
        axis: "z",
        length: stripLength,
        colorA: color(NEON.magenta),
        colorB: color(NEON.violet),
        phase: 2,
        thickness: 0.035,
        halo: { width: 0.8, gain: 0.3, widthAxis: "x", offset: [0, -0.015, 0], core: false },
      },
    )
  }

  // Pared del fondo: marco LED y barra de luz tras el futuro DJ set.
  const backZ = m.backWallZ + 0.16
  const frameInset = 0.78
  const violet = color(NEON.violet)
  const blue = color(NEON.blue)
  const magenta = color(NEON.magenta)
  const pink = color(NEON.pink)
  segments.push(
    {
      center: [-hw + frameInset, H / 2, backZ],
      axis: "y",
      length: H - frameInset * 2,
      colorA: violet,
      colorB: blue,
      phase: frames + 1,
      halo: { width: 1.25, gain: 0.9, widthAxis: "x" },
    },
    {
      center: [hw - frameInset, H / 2, backZ],
      axis: "y",
      length: H - frameInset * 2,
      colorA: violet,
      colorB: blue,
      phase: frames + 1,
      halo: { width: 1.25, gain: 0.9, widthAxis: "x" },
    },
    {
      center: [0, H - frameInset, backZ],
      axis: "x",
      length: hw * 2 - frameInset * 2,
      colorA: blue,
      colorB: blue,
      phase: frames + 1,
      halo: { width: 1.25, gain: 0.9, widthAxis: "y" },
    },
    {
      center: [0, m.bar.y, backZ],
      axis: "x",
      length: m.bar.width,
      colorA: magenta,
      colorB: pink,
      phase: frames + 2,
      thickness: 0.13,
      halo: { width: 2.6, gain: 1.25, widthAxis: "y" },
    },
  )

  // Canto LED de la tarima.
  segments.push({
    center: [0, m.stage.height - 0.02, m.stage.z + m.stage.depth / 2 + 0.03],
    axis: "x",
    length: m.stage.width,
    colorA: violet,
    colorB: color(NEON.cyan),
    phase: frames + 3,
    thickness: 0.045,
    halo: { width: 0.7, gain: 0.6, widthAxis: "y" },
  })

  return segments
}

export function createTunnelWorld(layout: TunnelLayout, detail: TunnelDetail): TunnelWorld {
  const m = tunnelMetrics(layout)
  const { halfWidth: hw, height: H, spacing, frames } = layout
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(item: T) => {
    disposables.push(item)
    return item
  }

  const noise = track(createNoiseTexture())
  const haze = new THREE.Color(HAZE_COLOR)

  const time: THREE.IUniform<number> = { value: 0 }
  const pixelWorld: THREE.IUniform<number> = { value: 0.001 }
  const resolution: THREE.IUniform<THREE.Vector2> = { value: new THREE.Vector2(1, 1) }
  const reflection: THREE.IUniform<THREE.Texture | null> = { value: null }
  const dustSize: THREE.IUniform<number> = { value: 30 }

  const fogUniforms = {
    uFogColor: { value: haze },
    uFogDensity: { value: 0.0175 },
    uTime: time,
  }

  const stripX = hw - 0.34
  const lightUniforms = {
    uPalL: { value: FRAME_COLORS.map(([left]) => new THREE.Color(left)) },
    uPalR: { value: FRAME_COLORS.map(([, right]) => new THREE.Color(right)) },
    uZ0: { value: m.firstFrameZ },
    uSpacing: { value: spacing },
    uFrames: { value: frames },
    uHalfW: { value: hw },
    uH: { value: H },
    uLightGain: { value: 7 },
    uStripX: { value: stripX },
    uStripColor: { value: new THREE.Color(NEON.cyan).lerp(new THREE.Color(NEON.blue), 0.35) },
    uStripZ: { value: new THREE.Vector2(m.frontZ - 1, m.backWallZ + 0.2) },
    uBarColor: { value: new THREE.Color(NEON.magenta).lerp(new THREE.Color(NEON.pink), 0.4) },
    uBarPos: { value: new THREE.Vector3(0, m.bar.y, m.backWallZ + 0.16) },
    uBarHalf: { value: m.bar.width / 2 },
  }

  /* ------------------------------ Luces ------------------------------ */

  const lights = new THREE.Group()
  lights.name = "tunnel-lights"
  const segments = segmentList(layout, m)
  const tubes = segments.filter((segment) => segment.tube !== false)
  const halos = segments.filter((segment) => segment.halo)

  const fillInstances = (
    mesh: THREE.InstancedMesh,
    list: Segment[],
    matrixFor: (segment: Segment) => THREE.Matrix4,
    gainFor?: (segment: Segment) => number,
  ) => {
    const colorA = new Float32Array(list.length * 3)
    const colorB = new Float32Array(list.length * 3)
    const phase = new Float32Array(list.length)
    const gain = new Float32Array(list.length)
    const core = new Float32Array(list.length)
    const size = new Float32Array(list.length * 2)
    list.forEach((segment, i) => {
      mesh.setMatrixAt(i, matrixFor(segment))
      segment.colorA.toArray(colorA, i * 3)
      segment.colorB.toArray(colorB, i * 3)
      phase[i] = segment.phase
      gain[i] = gainFor ? gainFor(segment) : 1
      core[i] = segment.halo?.core === false ? 0 : 1
      size[i * 2] = segment.length
      size[i * 2 + 1] = segment.halo?.width ?? 1
    })
    mesh.geometry.setAttribute("aColorA", new THREE.InstancedBufferAttribute(colorA, 3))
    mesh.geometry.setAttribute("aColorB", new THREE.InstancedBufferAttribute(colorB, 3))
    mesh.geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1))
    mesh.geometry.setAttribute("aGain", new THREE.InstancedBufferAttribute(gain, 1))
    mesh.geometry.setAttribute("aCore", new THREE.InstancedBufferAttribute(core, 1))
    mesh.geometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 2))
    mesh.instanceMatrix.needsUpdate = true
    // Las instancias ocupan todo el tunel: no merece la pena el culling.
    mesh.frustumCulled = false
  }

  const basis = new THREE.Matrix4()
  const tubeMatrix = (segment: Segment) => {
    const t = segment.thickness ?? 0.075
    const along = lengthDir(segment.axis)
    const up = segment.axis === "y" ? X.clone().negate() : Y.clone()
    const side = new THREE.Vector3().crossVectors(along, up)
    basis.makeBasis(along.multiplyScalar(segment.length), up.multiplyScalar(t), side.multiplyScalar(t))
    basis.setPosition(...segment.center)
    return basis
  }
  const haloMatrix = (segment: Segment) => {
    const halo = segment.halo!
    const along = lengthDir(segment.axis)
    const across = AXES[halo.widthAxis].clone()
    const normal = new THREE.Vector3().crossVectors(along, across)
    const [ox, oy, oz] = halo.offset ?? [0, 0, 0]
    // El plano sobresale medio ancho por cada extremo para redondear el halo.
    basis.makeBasis(along.multiplyScalar(segment.length + halo.width), across.multiplyScalar(halo.width), normal)
    basis.setPosition(segment.center[0] + ox, segment.center[1] + oy, segment.center[2] + oz)
    return basis
  }

  const tubeGeometry = track(new THREE.BoxGeometry(1, 1, 1))
  const tubeMaterial = track(
    new THREE.ShaderMaterial({
      vertexShader: TUBE_VERTEX,
      fragmentShader: TUBE_FRAGMENT,
      uniforms: { ...fogUniforms, uPixelWorld: pixelWorld, uMinPx: { value: 1.6 } },
      side: THREE.DoubleSide,
    }),
  )
  const tubeMesh = new THREE.InstancedMesh(tubeGeometry, tubeMaterial, tubes.length)
  fillInstances(tubeMesh, tubes, tubeMatrix)
  lights.add(tubeMesh)

  const haloGeometry = track(new THREE.PlaneGeometry(1, 1))
  const haloMaterial = track(
    new THREE.ShaderMaterial({
      vertexShader: HALO_VERTEX,
      fragmentShader: HALO_FRAGMENT,
      uniforms: { ...fogUniforms, uHaloSpread: { value: 0.03 }, uHaloGain: { value: 1 } },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  const haloMesh = new THREE.InstancedMesh(haloGeometry, haloMaterial, halos.length)
  fillInstances(haloMesh, halos, haloMatrix, (segment) => segment.halo!.gain)
  haloMesh.renderOrder = 2
  lights.add(haloMesh)

  // Resplandor del fondo: el punto brillante hacia el que se camina.
  const glowGeometry = track(new THREE.PlaneGeometry(1, 1))
  const glowMaterial = track(
    new THREE.ShaderMaterial({
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      uniforms: {
        ...fogUniforms,
        uGlowA: { value: new THREE.Color(NEON.magenta) },
        uGlowB: { value: new THREE.Color(NEON.violet).lerp(new THREE.Color(NEON.blue), 0.5) },
        uGlowGain: { value: 0.42 },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  const glow = new THREE.Mesh(glowGeometry, glowMaterial)
  glow.position.set(0, m.focusY + 0.25, m.backWallZ + 0.4)
  glow.scale.set(hw * 2 * 1.3, H * 1.15, 1)
  glow.renderOrder = 1
  lights.add(glow)

  /* ----------------------------- Escenario ---------------------------- */

  const scenery = new THREE.Group()
  scenery.name = "tunnel-scenery"

  const surfaceUniforms = {
    ...fogUniforms,
    ...lightUniforms,
    uNoise: { value: noise },
    uAmbient: { value: 0.1 },
  }

  const shellMaterial = track(
    new THREE.ShaderMaterial({
      vertexShader: SURFACE_VERTEX,
      fragmentShader: SHELL_FRAGMENT,
      uniforms: {
        ...surfaceUniforms,
        uNormalSign: { value: -1 },
        uPanel: { value: new THREE.Vector2(spacing / 4, H / 3) },
        uStreak: { value: 0.8 },
        uAlbedo: { value: 1 },
      },
      side: THREE.BackSide,
    }),
  )
  const floorMaterial = track(
    new THREE.ShaderMaterial({
      vertexShader: SURFACE_VERTEX,
      fragmentShader: FLOOR_FRAGMENT,
      uniforms: {
        ...surfaceUniforms,
        uNormalSign: { value: -1 },
        uReflection: reflection,
        uResolution: resolution,
        uReflGain: { value: 1.15 },
        uReflLod: { value: 4.2 },
      },
      side: THREE.BackSide,
    }),
  )

  // Una sola caja vista desde dentro: paredes, techo, fondo y suelo.
  const depth = m.frontZ - m.backWallZ
  const shellGeometry = track(new THREE.BoxGeometry(hw * 2, H, depth))
  const shell = new THREE.Mesh(shellGeometry, [
    shellMaterial,
    shellMaterial,
    shellMaterial,
    floorMaterial,
    shellMaterial,
    shellMaterial,
  ])
  shell.position.set(0, H / 2, (m.frontZ + m.backWallZ) / 2)
  scenery.add(shell)

  // Tarima donde se montara el DJ set.
  const riserMaterial = track(
    new THREE.ShaderMaterial({
      vertexShader: SURFACE_VERTEX,
      fragmentShader: SHELL_FRAGMENT,
      uniforms: {
        ...surfaceUniforms,
        uNormalSign: { value: 1 },
        uPanel: { value: new THREE.Vector2(m.stage.width / 4, m.stage.height * 2) },
        uStreak: { value: 0 },
        uAlbedo: { value: 1.5 },
      },
    }),
  )
  const riserGeometry = track(new THREE.BoxGeometry(m.stage.width, m.stage.height, m.stage.depth))
  const riser = new THREE.Mesh(riserGeometry, riserMaterial)
  riser.position.set(0, m.stage.height / 2, m.stage.z)
  scenery.add(riser)

  // Bancos de humo bajo, tenidos por los LED del tramo.
  const rand = mulberry32(77)
  const smokeHeight = Math.min(2.6, H * 0.5)
  const smokeSlots: { z: number; a: THREE.Color; b: THREE.Color }[] = []
  for (let k = 0; k < frames; k += detail.smokeEvery) {
    const [left, right] = FRAME_COLORS[k % FRAME_COLORS.length]
    smokeSlots.push({
      z: m.firstFrameZ - k * spacing - spacing * (0.35 + rand() * 0.3),
      a: new THREE.Color(left),
      b: new THREE.Color(right),
    })
  }
  smokeSlots.push(
    { z: m.stage.z + 2.4, a: new THREE.Color(NEON.violet), b: new THREE.Color(NEON.blue) },
    { z: m.stage.z - 1.8, a: new THREE.Color(NEON.magenta), b: new THREE.Color(NEON.violet) },
  )
  const smokeGeometry = track(new THREE.PlaneGeometry(1, 1))
  const smokeMaterial = track(
    new THREE.ShaderMaterial({
      vertexShader: SMOKE_VERTEX,
      fragmentShader: SMOKE_FRAGMENT,
      uniforms: { ...fogUniforms, uNoise: { value: noise }, uSmokeGain: { value: 0.3 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  const smoke = new THREE.InstancedMesh(smokeGeometry, smokeMaterial, smokeSlots.length)
  const smokeSeed = new Float32Array(smokeSlots.length)
  const smokeA = new Float32Array(smokeSlots.length * 3)
  const smokeB = new Float32Array(smokeSlots.length * 3)
  smokeSlots.forEach((slot, i) => {
    basis.makeScale(hw * 2, smokeHeight, 1)
    basis.setPosition(0, smokeHeight / 2, slot.z)
    smoke.setMatrixAt(i, basis)
    smokeSeed[i] = rand()
    slot.a.toArray(smokeA, i * 3)
    slot.b.toArray(smokeB, i * 3)
  })
  smokeGeometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(smokeSeed, 1))
  smokeGeometry.setAttribute("aColorA", new THREE.InstancedBufferAttribute(smokeA, 3))
  smokeGeometry.setAttribute("aColorB", new THREE.InstancedBufferAttribute(smokeB, 3))
  smoke.instanceMatrix.needsUpdate = true
  smoke.frustumCulled = false
  smoke.renderOrder = 3
  scenery.add(smoke)

  // Polvo en suspension: da paralaje y sensacion de volumen al avanzar.
  if (detail.dust > 0) {
    const positions = new Float32Array(detail.dust * 3)
    const seeds = new Float32Array(detail.dust)
    for (let i = 0; i < detail.dust; i++) {
      positions[i * 3] = (rand() * 2 - 1) * (hw - 0.3)
      positions[i * 3 + 1] = 0.15 + rand() * (H - 0.4)
      positions[i * 3 + 2] = m.backWallZ + rand() * (m.frontZ - m.backWallZ)
      seeds[i] = rand()
    }
    const dustGeometry = track(new THREE.BufferGeometry())
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    dustGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1))
    const dustMaterial = track(
      new THREE.ShaderMaterial({
        vertexShader: DUST_VERTEX,
        fragmentShader: DUST_FRAGMENT,
        uniforms: {
          uTime: time,
          uDustSize: dustSize,
          uDustColor: { value: new THREE.Color("#9db4ff").multiplyScalar(0.55) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    const dust = new THREE.Points(dustGeometry, dustMaterial)
    dust.frustumCulled = false
    dust.renderOrder = 4
    scenery.add(dust)
  }

  return {
    layout,
    metrics: m,
    scenery,
    lights,
    uniforms: { time, pixelWorld, resolution, reflection, dustSize },
    dispose: () => disposables.forEach((item) => item.dispose()),
  }
}
