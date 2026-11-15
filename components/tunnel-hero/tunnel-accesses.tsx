"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { useJourney, useSequenceFrame } from "@/components/cinematic/sequence-context"

/**
 * Los accesos aparecen cuando la camara esta frenando ante el escenario y, una
 * vez visibles, no se esconden por un pequeno gesto hacia atras: solo si el
 * visitante retrocede de verdad por el tunel.
 */
const OPEN_AT = 0.975
const CLOSE_AT = 0.9

type Tone = "johnx" | "prosound"

type AccessProps = {
  tone: Tone
  /** Nombre que acompana a "IAM". */
  name: string
  cta: string
  /** null = todavia sin destino: se muestra, pero no enlaza. */
  href: string | null
}

function Access({ tone, name, cta, href }: AccessProps) {
  const label = `IAM ${name} — ${cta}`
  const external = href !== null && !href.startsWith("/")
  const Arrow = external ? ArrowUpRight : ArrowRight

  const content = (
    <>
      <span className="tunnel-access__label">
        <span className="tunnel-access__iam">IAM</span>
        <span className="tunnel-access__name">{name}</span>
      </span>
      <span className="tunnel-access__cta">
        <span>{cta}</span>
        {href === null ? (
          <span className="tunnel-access__soon">Próximamente</span>
        ) : (
          <span className="tunnel-access__arrow" aria-hidden>
            <Arrow className="h-[45%] w-[45%]" />
          </span>
        )}
      </span>
    </>
  )

  if (href === null) {
    return (
      <div className="tunnel-access" data-tone={tone} data-pending role="group" aria-label={`${label} (próximamente)`}>
        {content}
      </div>
    )
  }

  if (external) {
    return (
      <a className="tunnel-access" data-tone={tone} href={href} aria-label={label}>
        {content}
      </a>
    )
  }

  // Sin precarga automatica: durante el paseo la red es para el tunel. La
  // pagina de destino se precarga cuando los accesos aparecen.
  return (
    <Link className="tunnel-access" data-tone={tone} href={href} aria-label={label} prefetch={false}>
      {content}
    </Link>
  )
}

type TunnelAccessesProps = {
  johnxHref: string
  prosoundHref: string | null
}

/**
 * Los dos accesos que aparecen al terminar el recorrido, en la franja
 * inferior de la pantalla: el escenario del fondo queda siempre despejado.
 */
export function TunnelAccesses({ johnxHref, prosoundHref }: TunnelAccessesProps) {
  const journey = useJourney()
  const router = useRouter()
  const dock = useRef<HTMLElement>(null)
  const open = useRef(false)
  const prefetched = useRef(false)

  useSequenceFrame((frame) => {
    const next = open.current ? frame.progress >= CLOSE_AT : frame.progress >= OPEN_AT
    if (next === open.current) return
    open.current = next
    dock.current?.toggleAttribute("data-open", next)
    if (next && !prefetched.current) {
      prefetched.current = true
      router.prefetch(johnxHref)
    }
  })

  // La camara necesita saber cuanto ocupa la franja para encuadrar por encima.
  useEffect(() => {
    const element = dock.current
    if (!element) return
    const measure = () => journey.setClearBottom(element.offsetHeight)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [journey])

  return (
    <nav
      ref={dock}
      aria-label="Accesos"
      className="tunnel-accesses"
      // Con teclado o lector de pantalla no hay que esperar al paseo: al
      // enfocar un acceso, la camara llega al final.
      onFocus={() => journey.skip()}
    >
      <Access tone="johnx" name="DJ JOHNX" cta="ENTER" href={johnxHref} />
      <Access tone="prosound" name="PROSOUND" cta="DISCOVER" href={prosoundHref} />
    </nav>
  )
}
