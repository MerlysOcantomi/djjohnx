"use client"

import Image from "next/image"
import { Calendar, Music, Globe, Award } from "lucide-react"

/** Biografia por defecto. Se usa mientras no se haya escrito una en /admin/pagina. */
const DEFAULT_BIO = [
  "Amo la música, y no podía ser de otra manera. Crecí en una familia de músicos, en una casa donde la música nunca faltó y donde cada celebración, cada historia y cada recuerdo tenían su propio ritmo.",
  "Soy el nieto de Virginia González, hijo de Charité y sobrino de Armando Aguiar González, “Papaíto”, percusionista y rumbero. Con esa raíz, con esa sangre y con esa herencia, no podía ser de otra manera: la música tenía que formar parte de mi vida.",
  "Crecí rodeado de son, salsa y rumba en las calles de La Habana, donde el ritmo forma parte de la vida desde que naces. Esa herencia musical me forjó como artista y me enseñó que la música no solo se escucha: se vive, se siente y se comparte.",
  "Hoy, desde Alicante, fusiono lo mejor de la música latina con los sonidos más actuales: reggaetón, salsa, bachata, timba, Latin house, afrobeats y mucho más. Mi objetivo es crear experiencias musicales que hagan vibrar a cada persona en la pista de baile.",
  "Con más de una década de experiencia entre Europa y el Caribe, he tenido el privilegio de encender pistas de baile en España, Francia, Italia y, por supuesto, en mi querida Cuba. Cada actuación es única, adaptada al público y al momento.",
]

const defaultStats = [
  { icon: Calendar, value: "10+", label: "A\u00f1os de Experiencia" },
  { icon: Music, value: "300+", label: "Eventos Realizados" },
  { icon: Award, value: "20+", label: "G\u00e9neros Musicales" },
  { icon: Globe, value: "2", label: "Europa y Caribe" },
]

interface AboutData {
  image?: string
  title?: string
  description?: string
  stats?: { number: string; label: string }[]
}

export function AboutSection({ data }: { data?: AboutData }) {
  const image = data?.image || "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/DJ%20JOHN%20X%20SOBRE%20MI%20-CACbHeXBaQUErfIPp0NsY2TyUs5JYi.png"
  // La biografia se escribe en /admin/pagina; los parrafos se separan con una linea en blanco.
  const paragraphs = (() => {
    const raw = (data?.description || "").trim()
    if (!raw) return DEFAULT_BIO
    const parts = raw
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
    return parts.length ? parts : DEFAULT_BIO
  })()
  const statsData = data?.stats?.length ? data.stats : defaultStats.map((s) => ({ number: s.value, label: s.label }))
  return (
    <section id="sobre-mi" className="relative py-24 md:py-32">
      {/* Background Decoration */}
      <div className="absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-secondary/10 blur-[150px]" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block text-sm font-medium uppercase tracking-[0.3em] text-primary">
            Conoce al artista
          </span>
          <h2 className="text-4xl font-black uppercase tracking-tight md:text-5xl lg:text-6xl">
            <span className="text-gradient-gold">SOBRE MÍ</span>
          </h2>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Image */}
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
              <Image
                src={image}
                alt="DJ JOHNX en las calles de La Habana"
                fill
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>
            {/* Decorative Border */}
            <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-2xl border-2 border-primary/30" />
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center">
            <div className="space-y-4 text-foreground/70">
              {paragraphs.map((text, i) => (
                <p key={i} className="leading-relaxed">
                  {text}
                </p>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
              {statsData.map((stat, index) => {
                const Icon = defaultStats[index]?.icon || Music
                return (
                  <div
                    key={index}
                    className="glass-card rounded-xl p-4 text-center transition-all hover:scale-105 hover:glow-gold"
                  >
                    <Icon className="mx-auto mb-2 h-6 w-6 text-primary" />
                    <div className="text-2xl font-black text-gradient-gold">{stat.number}</div>
                    <div className="text-xs uppercase tracking-wide text-foreground/60">
                      {stat.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
