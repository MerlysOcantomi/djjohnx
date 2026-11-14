import type { CSSProperties } from "react"
import { ArrowRight, ArrowUpRight } from "lucide-react"

type Tone = "johnx" | "prosound"

type BlockProps = {
  tone: Tone
  /** Nombre que acompana a "IAM". */
  name: string
  cta: string
  /** null = todavia sin destino: se muestra, pero no enlaza. */
  href: string | null
  external?: boolean
}

/** Marcos que se alejan hacia el fondo, como una puerta a otro tunel. */
const DEPTH_FRAMES = [1, 2, 3, 4, 5, 6].map((step) => {
  const scale = 1 / (1 + step * 0.42)
  return { inset: `${((1 - scale) / 2) * 100}%`, opacity: 0.95 - step * 0.13 }
})

function GatewayBlock({ tone, name, cta, href, external }: BlockProps) {
  const label = `IAM ${name} — ${cta}`
  const Arrow = external ? ArrowUpRight : ArrowRight

  const content = (
    <>
      <span aria-hidden className="iam-block__depth">
        {DEPTH_FRAMES.map((frame, index) => (
          <span key={index} style={{ inset: frame.inset, opacity: frame.opacity, "--step": index } as CSSProperties} />
        ))}
      </span>
      <span aria-hidden className="iam-block__shade" />
      <span className="iam-block__body">
        <span className="iam-block__title">
          <span className="iam-block__iam">IAM</span>
          <span className="iam-block__name">{name}</span>
        </span>
        <span className="iam-block__cta">
          {cta}
          <Arrow className="h-4 w-4" aria-hidden />
        </span>
      </span>
      {href === null ? <span className="iam-block__soon">Próximamente</span> : null}
    </>
  )

  if (href === null) {
    return (
      <div className="iam-block" data-tone={tone} data-pending role="group" aria-label={`${label} (próximamente)`}>
        {content}
      </div>
    )
  }

  return (
    <a className="iam-block" data-tone={tone} href={href} aria-label={label}>
      {content}
    </a>
  )
}

type IamGatewayProps = {
  /** Destino del bloque de John: un ancla de esta misma pagina. */
  johnxHref: string
  /** Landing de IAM PROSOUND, o null si todavia no hay URL. */
  prosoundHref: string | null
}

/**
 * Los dos grandes bloques que aparecen al terminar el tunel:
 * IAM DJ JOHNX — ENTER e IAM PROSOUND — DISCOVER.
 */
export function IamGateway({ johnxHref, prosoundHref }: IamGatewayProps) {
  return (
    <section id="accesos" aria-labelledby="accesos-title" className="iam-gateway">
      <h2 id="accesos-title" className="sr-only">
        Elige tu camino: DJ JOHNX o IAM PROSOUND
      </h2>
      <div className="iam-gateway__grid">
        <GatewayBlock tone="johnx" name="DJ JOHNX" cta="ENTER" href={johnxHref} />
        <GatewayBlock
          tone="prosound"
          name="PROSOUND"
          cta="DISCOVER"
          href={prosoundHref}
          external={prosoundHref !== null && !prosoundHref.startsWith("/")}
        />
      </div>
    </section>
  )
}
