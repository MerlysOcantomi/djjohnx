"use client"

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import dynamic from "next/dynamic"
import { JourneyStage } from "@/components/cinematic/journey-stage"
import { useJourney, useSequenceFrame } from "@/components/cinematic/sequence-context"
import { progressIn } from "@/lib/cinematic/math"
import { MANUAL_SCREENS, TUNNEL_LAYOUTS, layoutFor, tunnelMetrics, walkCruise } from "./tunnel-config"
import { TunnelAccesses } from "./tunnel-accesses"
import type { TunnelStats, TunnelTier } from "./tunnel-canvas"

// three.js solo se descarga en el navegador y solo si el tunel va a animarse.
const TunnelCanvas = dynamic(() => import("./tunnel-canvas"), { ssr: false })

type TunnelHomeProps = {
  /** Destino de "IAM DJ JOHNX - ENTER". */
  johnxHref: string
  /** Landing de IAM PROSOUND, o null si todavia no hay URL. */
  prosoundHref: string | null
  /** Contenido 3D del DJ set para el final del tunel. Aun no hay material. */
  djSet?: ReactNode
}

/** `live` = tunel 3D que se recorre; `static` = imagen fija con los accesos. */
type Mode = "pending" | "live" | "static"
type StaticReason = "motion" | "webgl" | null

type Setup = {
  mode: Mode
  reason: StaticReason
  tier: TunnelTier
  fixedDpr?: number
  showGuide: boolean
  showStats: boolean
  /** false = la camara no camina sola (solo control manual). */
  autoWalk: boolean
}

/** Ritmo de paseo de cada disposicion del tunel (fraccion del recorrido por segundo). */
const CRUISE = {
  landscape: walkCruise(TUNNEL_LAYOUTS.landscape, tunnelMetrics(TUNNEL_LAYOUTS.landscape)),
  portrait: walkCruise(TUNNEL_LAYOUTS.portrait, tunnelMetrics(TUNNEL_LAYOUTS.portrait)),
}
const cruiseFor = (width: number, height: number) => CRUISE[layoutFor(width, height)]
const screensFor = (width: number, height: number) => MANUAL_SCREENS[layoutFor(width, height)]

const OPT_IN_KEY = "djjohnx:tunnel-motion"
/** Si el 3D no ha arrancado en este tiempo, se muestra la version fija. */
const READY_TIMEOUT_MS = 12_000

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas")
    // Si el navegador solo ofrece WebGL por software, mejor la imagen fija.
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true })
    if (!gl) return false
    gl.getExtension("WEBGL_lose_context")?.loseContext()
    return true
  } catch {
    return false
  }
}

function readOptIn() {
  try {
    return window.sessionStorage.getItem(OPT_IN_KEY) === "1"
  } catch {
    return false
  }
}

/**
 * Decide como se muestra la entrada en este dispositivo. Parametros de
 * revision: `?tunnel=static|live` fuerza el modo, `?dpr=1.5` fija la
 * resolucion, `?fps=1` muestra el medidor de rendimiento, `?auto=0` desactiva
 * el avance automatico y `?djset=guia` dibuja el volumen reservado para el DJ
 * set.
 */
function detectSetup(): Setup {
  const params = new URLSearchParams(window.location.search)
  const forced = params.get("tunnel")
  const dpr = Number(params.get("dpr"))
  const nav = navigator as Navigator & { deviceMemory?: number }
  const lowEnd = (nav.hardwareConcurrency || 4) <= 4 || (nav.deviceMemory || 4) < 4

  const base = {
    tier: (lowEnd ? "low" : "high") as TunnelTier,
    fixedDpr: dpr > 0 ? Math.min(dpr, 3) : undefined,
    showGuide: params.get("djset") === "guia",
    showStats: params.has("fps"),
    autoWalk: params.get("auto") !== "0",
  }

  if (forced === "static") return { ...base, mode: "static", reason: null }
  if (forced === "live") return { ...base, mode: "live", reason: null }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (reducedMotion && !readOptIn()) return { ...base, mode: "static", reason: "motion" }
  if (!supportsWebGL()) return { ...base, mode: "static", reason: "webgl" }
  return { ...base, mode: "live", reason: null }
}

/** Si WebGL falla al arrancar o en mitad de la sesion, se queda la imagen fija. */
class CanvasBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function TunnelPoster() {
  return (
    <picture>
      <source media="(orientation: portrait)" srcSet="/tunnel/poster-portrait.webp" />
      <img
        src="/tunnel/poster-landscape.webp"
        alt=""
        aria-hidden
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  )
}

function LiveCanvas({ setup, djSet, onFail }: { setup: Setup; djSet?: ReactNode; onFail: () => void }) {
  const journey = useJourney()
  const stats = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(true)
  const [ready, setReady] = useState(false)

  // El render (y con el, el paseo) se detiene con la pestana oculta.
  useEffect(() => {
    const update = () => setActive(document.visibilityState === "visible")
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])

  // Red lenta o equipo que no arranca: no dejar al visitante sin accesos.
  // Solo cuenta el tiempo con la pestana visible (oculta, no se renderiza).
  useEffect(() => {
    if (ready || !active) return
    const timer = window.setTimeout(onFail, READY_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [ready, active, onFail])

  // Solo con el medidor activo: posicion exacta por fotograma, para verificar
  // de forma automatica que no hay saltos de camara.
  useSequenceFrame((frame) => {
    if (stats.current) stats.current.dataset.progress = frame.progress.toFixed(6)
  })

  const handleReady = useCallback(() => setReady(true), [])
  const handleStats = useCallback(
    (sample: TunnelStats) => {
      if (!stats.current) return
      stats.current.textContent =
        `${sample.fps.toFixed(0)} fps · dpr ${sample.dpr.toFixed(2)} · ${sample.width}×${sample.height} · ` +
        `${setup.tier} · t ${sample.progress.toFixed(3)}`
    },
    [setup.tier],
  )

  return (
    <>
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <CanvasBoundary onError={onFail}>
          <TunnelCanvas
            journey={journey}
            active={active}
            tier={setup.tier}
            fixedDpr={setup.fixedDpr}
            showGuide={setup.showGuide}
            djSet={djSet}
            onReady={handleReady}
            onStats={setup.showStats ? handleStats : undefined}
          />
        </CanvasBoundary>
      </div>
      {setup.showStats ? (
        <div
          ref={stats}
          data-tunnel-stats
          className="pointer-events-none absolute left-2 top-2 z-50 rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-white"
        />
      ) : null}
    </>
  )
}

/** Unico control visible durante el recorrido: llegar ya a los accesos. */
function SkipButton() {
  const journey = useJourney()
  const button = useRef<HTMLButtonElement>(null)

  useSequenceFrame((frame) => {
    if (!button.current) return
    const gone = progressIn(0.86, 0.94, frame.progress)
    button.current.style.opacity = (1 - gone).toFixed(3)
    button.current.style.visibility = gone >= 1 ? "hidden" : "visible"
  })

  return (
    <button
      ref={button}
      type="button"
      onClick={() => journey.skip()}
      aria-label="Saltar el recorrido e ir a los accesos"
      className="tunnel-skip"
    >
      Saltar
    </button>
  )
}

/**
 * Home de entrada: el tunel a pantalla completa. La camara empieza a caminar
 * sola hacia el fondo; la rueda, el dedo o el teclado toman el control en
 * cualquier momento. Al llegar al escenario aparecen los dos accesos.
 */
export function TunnelHome({ johnxHref, prosoundHref, djSet }: TunnelHomeProps) {
  const [setup, setSetup] = useState<Setup>({
    mode: "pending",
    reason: null,
    tier: "high",
    showGuide: false,
    showStats: false,
    autoWalk: true,
  })

  useEffect(() => {
    setSetup(detectSetup())
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setSetup(detectSetup())
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  const fallBackToStatic = useCallback(
    () => setSetup((current) => ({ ...current, mode: "static", reason: "webgl" })),
    [],
  )

  // Quien tiene "reducir movimiento" activado ve la imagen fija, pero puede
  // elegir el recorrido completo si quiere.
  const enableMotion = () => {
    try {
      window.sessionStorage.setItem(OPT_IN_KEY, "1")
    } catch {
      // Sin almacenamiento: vale solo para esta carga.
    }
    setSetup((current) =>
      supportsWebGL() ? { ...current, mode: "live", reason: null } : { ...current, mode: "static", reason: "webgl" },
    )
  }

  return (
    <div className="tunnel-home" data-mode={setup.mode === "pending" ? undefined : setup.mode}>
      <noscript>
        <style>{`.tunnel-accesses{opacity:1!important;transform:none!important;pointer-events:auto!important}`}</style>
      </noscript>

      <JourneyStage auto={setup.mode === "live" && setup.autoWalk} cruise={cruiseFor} screens={screensFor}>
        <h1 className="sr-only">DJ JOHNX</h1>
        <TunnelPoster />
        {setup.mode === "live" ? <LiveCanvas setup={setup} djSet={djSet} onFail={fallBackToStatic} /> : null}
        <div aria-hidden className="tunnel-vignette pointer-events-none absolute inset-0 z-10" />

        <TunnelAccesses johnxHref={johnxHref} prosoundHref={prosoundHref} />
        <SkipButton />

        {setup.mode === "static" && setup.reason === "motion" ? (
          <button type="button" onClick={enableMotion} className="tunnel-optin">
            Activar recorrido 3D
          </button>
        ) : null}
      </JourneyStage>
    </div>
  )
}
