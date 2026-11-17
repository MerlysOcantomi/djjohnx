"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { JourneyController } from "@/components/cinematic/sequence-context"
import { clamp, damp, progressIn } from "@/lib/cinematic/math"
import {
  TUNNEL_LAYOUTS,
  arrivalFactor,
  cameraPose,
  fovFor,
  layoutFor,
  stageLift,
  travelLength,
  walkSpeed,
} from "./tunnel-config"
import { createTunnelWorld, type TunnelDetail } from "./tunnel-world"

export type TunnelTier = "high" | "low"

type TierSettings = {
  /** Limites de resolucion (device pixel ratio) y valor de arranque. */
  minDpr: number
  maxDpr: number
  startDpr: number
  /** Resolucion del reflejo del suelo respecto al lienzo. */
  reflectionScale: number
  detail: TunnelDetail
}

const TIERS: Record<TunnelTier, TierSettings> = {
  high: {
    minDpr: 1,
    maxDpr: 2,
    startDpr: 1.5,
    reflectionScale: 0.5,
    detail: { dust: 320, smokeEvery: 1 },
  },
  low: {
    minDpr: 0.75,
    maxDpr: 1.5,
    startDpr: 1,
    reflectionScale: 0.4,
    detail: { dust: 140, smokeEvery: 2 },
  },
}

const DPR_STEP = 0.25
/** Duracion de cada medicion de fps. */
const SAMPLE_MS = 1000

/** El reflejo nunca supera este ancho: es una textura borrosa por diseno. */
const REFLECTION_MAX_WIDTH = 1024

export type TunnelStats = {
  fps: number
  dpr: number
  width: number
  height: number
  progress: number
}

type SceneProps = {
  /** Recorrido que la escena hace avanzar en cada fotograma. */
  journey: JourneyController
  tier: TunnelTier
  /** Contenido 3D del DJ set. Se monta sobre la tarima del final del tunel. */
  djSet?: ReactNode
  /** Dibuja el volumen reservado para el DJ set (solo para revisar el encuadre). */
  showGuide?: boolean
  onReady?: () => void
}

function usePointerParallax() {
  const pointer = useRef({ x: 0, y: 0 })
  useEffect(() => {
    // Solo con raton: en tactil el dedo ya esta ocupado haciendo scroll.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [])
  return pointer
}

/**
 * Resolucion adaptativa: prioriza la fluidez. Si el dispositivo no llega a
 * ~45 fps durante dos mediciones seguidas baja un paso la resolucion, y ya no
 * vuelve a subir por encima de ese punto (sin oscilaciones). Solo sube cuando
 * lleva varios segundos sobrado.
 */
function AdaptiveResolution({
  dpr,
  min,
  max,
  onChange,
}: {
  dpr: number
  min: number
  max: number
  onChange: (dpr: number) => void
}) {
  const sample = useRef({ start: 0, last: 0, frames: 0, slow: 0, fast: 0, skip: 2, ceiling: max })

  useFrame(() => {
    const now = performance.now()
    const s = sample.current
    // Tras una pausa (hero fuera de pantalla, pestana oculta) se empieza de cero.
    if (!s.start || now - s.last > 250) {
      s.start = now
      s.frames = 0
      s.skip = Math.max(s.skip, 1)
    }
    s.last = now
    s.frames++
    const elapsed = now - s.start
    if (elapsed < SAMPLE_MS) return

    const fps = ((s.frames - 1) * 1000) / elapsed
    s.start = now
    s.frames = 0
    // Las primeras mediciones incluyen compilacion de shaders: no cuentan.
    if (s.skip > 0) {
      s.skip--
      return
    }

    if (fps < 45) {
      s.slow++
      s.fast = 0
    } else if (fps > 56) {
      s.fast++
      s.slow = 0
    } else {
      s.slow = 0
      s.fast = 0
    }

    if (s.slow >= 2 && dpr > min) {
      const next = Math.max(min, dpr - DPR_STEP)
      s.ceiling = next
      s.slow = 0
      s.skip = 1
      onChange(next)
    } else if (s.fast >= 4 && dpr < Math.min(max, s.ceiling)) {
      s.fast = 0
      s.skip = 1
      onChange(Math.min(max, s.ceiling, dpr + DPR_STEP))
    }
  })

  return null
}

/** Medidor para revisar el rendimiento en un dispositivo real (`?fps=1`). */
function StatsProbe({ journey, onStats }: { journey: JourneyController; onStats: (stats: TunnelStats) => void }) {
  const gl = useThree((state) => state.gl)
  const sample = useRef({ start: 0, frames: 0 })
  const buffer = useMemo(() => new THREE.Vector2(), [])

  useFrame(() => {
    const now = performance.now()
    const s = sample.current
    if (!s.start) s.start = now
    s.frames++
    if (now - s.start < 500) return
    gl.getDrawingBufferSize(buffer)
    onStats({
      fps: (s.frames * 1000) / (now - s.start),
      dpr: gl.getPixelRatio(),
      width: buffer.x,
      height: buffer.y,
      progress: journey.getFrame().progress,
    })
    s.start = now
    s.frames = 0
  })

  return null
}

function DjSetGuide({ size }: { size: readonly [number, number, number] }) {
  const [width, height, depth] = size
  const volume = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth)),
    [width, height, depth],
  )
  const booth = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(width * 0.82, 1.05, depth * 0.6)),
    [width, depth],
  )
  useEffect(() => () => volume.dispose(), [volume])
  useEffect(() => () => booth.dispose(), [booth])
  return (
    <group>
      <lineSegments geometry={volume} position={[0, height / 2, 0]}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.45} />
      </lineSegments>
      <lineSegments geometry={booth} position={[0, 0.525, depth * 0.15]}>
        <lineBasicMaterial color="#ffd166" transparent opacity={0.8} />
      </lineSegments>
    </group>
  )
}

function TunnelScene({ journey, tier, djSet, showGuide, onReady }: SceneProps) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const size = useThree((state) => state.size)

  const orientation = layoutFor(size.width, size.height)
  const settings = TIERS[tier]
  const world = useMemo(
    () => createTunnelWorld(TUNNEL_LAYOUTS[orientation], settings.detail),
    [orientation, settings],
  )
  useEffect(() => () => world.dispose(), [world])

  // Reflejo del suelo: la escena luminosa espejada, a baja resolucion y con
  // mipmaps (el desenfoque del asfalto mojado sale de leer niveles bajos).
  const reflection = useMemo(
    () =>
      new THREE.WebGLRenderTarget(2, 2, {
        depthBuffer: true,
        stencilBuffer: false,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
      }),
    [],
  )
  useEffect(() => () => reflection.dispose(), [reflection])

  const mirrored = useRef<THREE.Group>(null)
  const pointer = usePointerParallax()
  const rig = useRef({ time: 0, kick: 0, bob: 1, lift: -1, viewWidth: 0, viewHeight: 0, px: 0, py: 0, frames: 0, ready: false })
  const scratch = useMemo(() => ({ buffer: new THREE.Vector2(), look: new THREE.Vector3() }), [])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1)
    const state = rig.current
    state.time += dt

    // El recorrido avanza con el mismo reloj que el render: camara e imagen
    // van siempre en el mismo fotograma, y si el lienzo se detiene (pestana
    // oculta) el paseo se queda en pausa.
    const frame = journey.advance(dt)
    const travel = frame.progress
    const speed = Math.abs(frame.speed) * travelLength(world.metrics)
    const walk = walkSpeed(world.layout)

    // A ritmo de paseo la camara "pisa"; si el visitante acelera, planea.
    state.bob = damp(state.bob, 1 - progressIn(walk * 1.7, walk * 3.6, speed), 4, dt)
    const pose = cameraPose(world.layout, world.metrics, travel, state.bob)

    // Empuje de campo de vision con la velocidad: sensacion de avance.
    state.kick = damp(state.kick, clamp((speed - walk * 1.5) / 70) * 7, 5, dt)
    state.px = damp(state.px, pointer.current.x, 3, dt)
    state.py = damp(state.py, pointer.current.y, 3, dt)

    const t = state.time
    camera.position.set(
      pose.x + Math.sin(t * 0.31) * 0.018,
      pose.y + Math.sin(t * 0.43 + 1) * 0.01,
      pose.z,
    )
    scratch.look.set(pose.lookX + state.px * 0.7, pose.lookY - state.py * 0.35, pose.lookZ)
    camera.up.set(0, 1, 0)
    camera.lookAt(scratch.look)
    camera.rotateZ(pose.roll)

    const baseFov = fovFor(size.width, size.height)
    const fov = baseFov + state.kick
    // Al llegar, la imagen sube lo justo para que el escenario quede por
    // encima de los accesos (desplazamiento de lente: no inclina las lineas).
    const lift =
      arrivalFactor(travel) * stageLift(world.layout, world.metrics, baseFov, size.height, frame.clearBottom)
    if (
      Math.abs(lift - state.lift) > 0.2 ||
      state.viewWidth !== size.width ||
      state.viewHeight !== size.height ||
      Math.abs(camera.fov - fov) > 0.01
    ) {
      state.lift = lift
      state.viewWidth = size.width
      state.viewHeight = size.height
      camera.fov = fov
      camera.setViewOffset(size.width, size.height, 0, lift, size.width, size.height)
    }

    gl.getDrawingBufferSize(scratch.buffer)
    const { x: bufferWidth, y: bufferHeight } = scratch.buffer
    const uniforms = world.uniforms
    uniforms.time.value = t
    uniforms.resolution.value.set(bufferWidth, bufferHeight)
    uniforms.pixelWorld.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / bufferHeight
    uniforms.dustSize.value = bufferHeight * 0.014

    // Pasada de reflejo: misma camara, luces espejadas en el plano del suelo.
    const group = mirrored.current
    if (group) {
      const scale = Math.min(settings.reflectionScale, REFLECTION_MAX_WIDTH / bufferWidth)
      const width = Math.max(2, Math.round(bufferWidth * scale))
      const height = Math.max(2, Math.round(bufferHeight * scale))
      if (reflection.width !== width || reflection.height !== height) reflection.setSize(width, height)

      const previous = gl.getRenderTarget()
      world.scenery.visible = false
      group.scale.y = -1
      gl.setRenderTarget(reflection)
      gl.clear()
      gl.render(scene, camera)
      gl.setRenderTarget(previous)
      group.scale.y = 1
      world.scenery.visible = true
      uniforms.reflection.value = reflection.texture
    }

    if (!state.ready && ++state.frames >= 2) {
      state.ready = true
      onReady?.()
    }
  })

  return (
    <>
      <primitive object={world.scenery} />
      <group ref={mirrored}>
        <primitive object={world.lights} />
        {/*
          ANCLA DEL DJ SET. Origen a ras de tarima, centrado y mirando a la
          camara. Lo que se monte aqui (plano con video/foto recortada de John,
          o un modelo GLB de la cabina) queda iluminado a contraluz por la barra
          del fondo y se refleja solo en el suelo mojado.
        */}
        <group position={world.metrics.djSet.position as [number, number, number]}>
          {djSet}
          {showGuide ? <DjSetGuide size={world.metrics.djSet.size} /> : null}
        </group>
      </group>
    </>
  )
}

export type TunnelCanvasProps = SceneProps & {
  /** false = bucle de render detenido (pestana oculta): el recorrido se pausa. */
  active: boolean
  /** Fija la resolucion y desactiva el ajuste automatico (capturas y pruebas). */
  fixedDpr?: number
  onStats?: (stats: TunnelStats) => void
}

export default function TunnelCanvas({ active, fixedDpr, tier, onStats, ...scene }: TunnelCanvasProps) {
  const settings = TIERS[tier]
  // Nunca se renderiza por encima de la densidad real de la pantalla.
  const [limits] = useState(() => {
    const device = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1
    const max = Math.max(settings.minDpr, Math.min(settings.maxDpr, device))
    return { min: settings.minDpr, max, start: Math.min(settings.startDpr, max) }
  })
  const [dpr, setDpr] = useState(fixedDpr ?? limits.start)

  return (
    <Canvas
      aria-hidden
      flat
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: false, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 60, near: 0.1, far: 260, position: [0, 1.65, 1.5] }}
      // Sin medir en cada scroll: el stage es sticky y su tamano no cambia.
      resize={{ scroll: false, debounce: { scroll: 0, resize: 120 } }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 1)}
    >
      {fixedDpr === undefined ? (
        <AdaptiveResolution dpr={dpr} min={limits.min} max={limits.max} onChange={setDpr} />
      ) : null}
      {onStats ? <StatsProbe journey={scene.journey} onStats={onStats} /> : null}
      <TunnelScene tier={tier} {...scene} />
    </Canvas>
  )
}
