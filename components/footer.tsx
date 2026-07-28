"use client"

import { Instagram, Facebook, Youtube, Music } from "lucide-react"

interface FooterContactData {
  instagram?: string
  facebook?: string
  youtube?: string
}

const footerLinks = [
  { href: "#inicio", label: "Inicio" },
  { href: "#sobre-mi", label: "Sobre Mi" },
  { href: "#eventos", label: "Eventos" },
  { href: "#galeria", label: "Galeria" },
  { href: "#contacto", label: "Contacto" },
]

export function Footer({ data }: { data?: FooterContactData }) {
  const instagram = data?.instagram || "https://www.instagram.com/dj_john_x/"
  const facebook = data?.facebook || "#"
  const youtube = data?.youtube || "https://youtu.be/Mo1ri6aCWCA"

  const socialLinks = [
    { icon: Instagram, href: instagram, label: "Instagram" },
    { icon: Facebook, href: facebook, label: "Facebook" },
    { icon: Youtube, href: youtube, label: "YouTube" },
    { icon: Music, href: "#", label: "Spotify" },
  ]

  return (
    <footer className="relative border-t border-border/30 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <span className="text-2xl font-black tracking-wider text-gradient-gold">
              DJ JOHNX
            </span>
            <p className="mt-4 text-sm leading-relaxed text-foreground/60">
              DJ Cubano especializado en Fusión Latina. Latin House, Afrobeats, 
              Reggaeton, Salsa y la mejor música para tus eventos.
            </p>
          </div>

          {/* Links */}
          <div className="md:text-center">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground/80">
              Enlaces
            </h4>
            <nav className="flex flex-wrap gap-4 md:justify-center">
              {footerLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-foreground/60 transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Social */}
          <div className="md:text-right">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground/80">
              Redes Sociales
            </h4>
            <div className="flex gap-3 md:justify-end">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 transition-all hover:bg-primary/20 hover:text-primary"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t border-border/30 pt-8 text-center">
          <p className="text-sm text-foreground/50">
            &copy; {new Date().getFullYear()} DJ JOHNX. Todos los derechos reservados.
          </p>
          <p className="mt-2 text-xs text-foreground/30">
            Alicante, España | Música que mueve el mundo
          </p>
        </div>
      </div>

      {/* Decorative Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
    </footer>
  )
}
