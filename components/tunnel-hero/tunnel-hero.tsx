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
import { ChevronDown } from "lucide-react"
import { ScrollSequence } from "@/components/cinematic/scroll-sequence"
import { useSequenceFrame, useSequenceStore } from "@/components/cinematic/sequence-context"
import { EASINGS, progressIn } from "@/lib/cinematic/math"
import { splitProgress } from "./tunnel-config"
import type { TunnelTier } from "./tunnel-canvas"

// three.js solo se descarga en el navegador y solo si el tunel va a animarse.
const TunnelCanvas = dynamic(() => import("./tunnel-canvas"), { ssr: false })

type HeroData = {
  title?: string
  subtitle?: string
  description?: string
}

type TunnelHeroProps = {
  data?: HeroData
  /** Seccion que aparece al terminar el tunel (los dos bloques IAM). */
  gateway?: ReactNode
  /** Contenido 3D del DJ set para el final del tunel. Aun no hay material. */
  djSet?: ReactNode
}

/** `live` = tunel 3D con scroll; `static` = imagen fija sin recorrido. */
type Mode = "pending" | "live" | "static"
type StaticReason = "motion" | "webgl" | null

type Setup = {
  mode: Mode
  reason: StaticReason
  tier: TunnelTier
  fixedDpr?: number
  showGuide: boolean
}

const OPT_IN_KEY = "djjohnx:tunnel-motion"

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
 * Decide como se muestra el hero en este dispositivo. Parametros de revision:
 * `?tunnel=static|live` fuerza el modo, `?dpr=1.5` fija la resolucion y
 * `?djset=guia` dibuja el volumen reservado para el DJ set.
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
  const store = useSequenceStore()
  const holder = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(true)
  const [ready, setReady] = useState(false)

  // El render se detiene cuando el hero no esta en pantalla o la pestana esta
  // oculta: el resto de la pagina no paga GPU ni bateria.
  useEffect(() => {
    const element = holder.current
    if (!element) return
    let inView = true
    const update = () => setActive(inView && document.visibilityState === "visible")
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      update()
    })
    observer.observe(element)
    document.addEventListener("visibilitychange", update)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", update)
    }
  }, [])

  const handleReady = useCallback(() => setReady(true), [])

  return (
    <div
      ref={holder}
      className="absolute inset-0 transition-opacity duration-700 ease-out"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <CanvasBoundary onError={onFail}>
        <TunnelCanvas
          store={store}
          active={active}
          tier={setup.tier}
          fixedDpr={setup.fixedDpr}
          showGuide={setup.showGuide}
          djSet={djSet}
          onReady={handleReady}
        />
      </CanvasBoundary>
    </div>
  )
}

/** Titulo de entrada: se atraviesa y se desvanece al empezar a caminar. */
function IntroOverlay({ title, subtitle, description }: Required<HeroData>) {
  const block = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLDivElement>(null)

  useSequenceFrame((frame) => {
    const { travel } = splitProgress(frame.progress, frame.height, frame.scrollable)
    const t = EASINGS.smooth(progressIn(0.004, 0.1, travel))
    if (block.current) {
      block.current.style.opacity = (1 - t).toFixed(3)
      block.current.style.transform = `translate3d(0, ${(-t * 5).toFixed(2)}vh, 0) scale(${(1 + t * 0.32).toFixed(4)})`
    }
    if (hint.current) hint.current.style.opacity = (1 - progressIn(0.002, 0.03, travel)).toFixed(3)
  })

  return (
    <div className="tunnel-safe pointer-events-none z-20 flex flex-col items-center justify-center px-5 text-center">
      <div ref={block} className="tunnel-intro flex flex-col items-center will-change-transform">
        <p className="mb-4 pl-[0.5em] text-xs font-semibold uppercase tracking-[0.5em] text-white/90 sm:text-sm md:mb-5">
          {subtitle}
        </p>
        <h1 className="tunnel-title text-[clamp(3.4rem,15vw,10.5rem)] font-black uppercase leading-[0.9] tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-white/85 md:mt-7 md:max-w-lg md:text-base">
          {description}
        </p>
      </div>

      <div ref={hint} className="tunnel-hint absolute inset-x-0 bottom-20 flex flex-col items-center gap-2 md:bottom-9">
        <span className="pl-[0.42em] text-[0.68rem] font-medium uppercase tracking-[0.42em] text-white/80">
          Entra en el túnel
        </span>
        <ChevronDown className="tunnel-hint__arrow h-5 w-5 text-white/80" aria-hidden />
      </div>
    </div>
  )
}

/** Oscurece el final del tunel mientras los dos bloques suben por encima. */
function EndVeil() {
  const veil = useRef<HTMLDivElement>(null)
  useSequenceFrame((frame) => {
    const { tail } = splitProgress(frame.progress, frame.height, frame.scrollable)
    if (veil.current) veil.current.style.opacity = (EASINGS.smooth(tail) * 0.74).toFixed(3)
  })
  return <div ref={veil} aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-[#05030d] opacity-0" />
}

function SkipLink({ href }: { href: string }) {
  const link = useRef<HTMLAnchorElement>(null)
  useSequenceFrame((frame) => {
    const { tail } = splitProgress(frame.progress, frame.height, frame.scrollable)
    if (!link.current) return
    link.current.style.opacity = (1 - progressIn(0, 0.35, tail)).toFixed(3)
    link.current.style.pointerEvents = tail > 0.35 ? "none" : "auto"
  })
  return (
    <div className="tunnel-safe tunnel-skip pointer-events-none z-40">
      <a
        ref={link}
        href={href}
        className="pointer-events-auto absolute bottom-6 left-4 rounded-full border border-white/20 bg-black/35 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/75 transition-colors hover:border-white/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:bottom-8 md:left-8"
      >
        Saltar intro
      </a>
    </div>
  )
}

export function TunnelHero({ data, gateway, djSet }: TunnelHeroProps) {
  const [setup, setSetup] = useState<Setup>({ mode: "pending", reason: null, tier: "high", showGuide: false })

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

  const intro = {
    title: data?.title || "DJ JOHNX",
    subtitle: data?.subtitle || "FUSION LATINA",
    description:
      data?.description ||
      "Latin House, Afrobeats, Reggaeton, Salsa y la mejor musica cubana. Mas de 10 anos creando experiencias musicales inolvidables.",
  }

  return (
    <div className="tunnel-root" data-mode={setup.mode === "pending" ? undefined : setup.mode}>
      <noscript>
        <style>{`.tunnel-root .cine-track{height:100vh!important}.tunnel-gateway{margin-top:0!important}.tunnel-hint,.tunnel-skip{display:none!important}`}</style>
      </noscript>

      <ScrollSequence id="inicio" ariaLabel="Portada: el túnel de DJ JOHNX" smoothing={10}>
        <TunnelPoster />
        {setup.mode === "live" ? <LiveCanvas setup={setup} djSet={djSet} onFail={fallBackToStatic} /> : null}
        <div aria-hidden className="tunnel-vignette pointer-events-none absolute inset-0 z-10" />
        <IntroOverlay {...intro} />
        <EndVeil />
        <SkipLink href="#accesos" />

        {setup.mode === "static" && setup.reason === "motion" ? (
          <div className="tunnel-safe pointer-events-none z-40">
            <button
              type="button"
              onClick={enableMotion}
              className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/25 bg-black/45 px-5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/85 transition-colors hover:border-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Activar recorrido 3D
            </button>
          </div>
        ) : null}
      </ScrollSequence>

      {gateway ? <div className="tunnel-gateway">{gateway}</div> : null}
    </div>
  )
}
