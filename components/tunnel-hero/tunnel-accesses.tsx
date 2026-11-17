"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useJourney, useSequenceFrame } from "@/components/cinematic/sequence-context"

/**
 * Los logotipos aparecen cuando la camara llega al escenario; el recorrido
 * sigue siendo el mismo y puede retrocederse con rueda, dedo o teclado.
 */
const OPEN_AT = 0.975
const CLOSE_AT = 0.9

function EntranceLogo({
  href,
  label,
  image,
  tone,
  external = false,
}: {
  href: string
  label: string
  image: string
  tone: "johnx" | "prosound"
  external?: boolean
}) {
  const content = (
    <>
      <Image
        src={image}
        alt={label}
        width={480}
        height={280}
        className="tunnel-brand-link__image"
        sizes="(max-width: 640px) 70vw, 42vw"
        priority
        unoptimized
      />
      <span aria-hidden className="tunnel-brand-link__glint" />
    </>
  )

  if (external)
    return (
      <a className="tunnel-brand-link" data-tone={tone} href={href} aria-label={label}>
        {content}
      </a>
    )

  return (
    <Link className="tunnel-brand-link" data-tone={tone} href={href} aria-label={label} prefetch={false}>
      {content}
    </Link>
  )
}

export function TunnelAccesses({ johnxHref, prosoundHref }: { johnxHref: string; prosoundHref: string | null }) {
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
      className="tunnel-accesses tunnel-logo-accesses"
      aria-label="Elige tu experiencia"
      onFocus={() => journey.skip()}
    >
      <EntranceLogo href={johnxHref} tone="johnx" label="IAM DJ JOHNX, entrar en la web de John" image="/brand/iam-djjohnx.svg" />
      <EntranceLogo
        href={prosoundHref ?? "https://www.iam-prosound.com"}
        tone="prosound"
        label="IAM PROSOUND, descubrir la plataforma"
        image="/brand/iam-prosound.svg"
        external
      />
    </nav>
  )
}
