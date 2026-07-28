"use client"

import { useState } from "react"
import { Menu, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Image from "next/image"

const navLinks = [
  { href: "#inicio", label: "Inicio" },
  { href: "#sobre-mi", label: "Sobre Mí" },
  { href: "#eventos", label: "Eventos" },
  { href: "#galeria", label: "Galería" },
  { href: "#contacto", label: "Contacto" },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "DJ JOHNX - Fusión Latina",
          text: "Descubre la mejor música latina con DJ JOHNX",
          url: window.location.href,
        })
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <a href="#inicio" className="flex items-center gap-3">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/16bbcb4e-6118-4da7-9534-c1a3bc9b0dc8-54HK5CBPBKS1VbLlplZM01fMRX7DA6.png"
              alt="JOHNX DJ Logo"
              width={48}
              height={48}
              className="h-10 w-10 object-contain md:h-12 md:w-12"
            />
            <span className="text-xl font-black tracking-wider text-gradient-gold md:text-2xl">
              DJ JOHNX
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Share Button & Mobile Menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-foreground/80 backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/10 hover:text-foreground md:flex"
            >
              <Share2 className="h-4 w-4" />
              Compartir
            </button>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-foreground">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] border-border bg-background/95 backdrop-blur-xl">
                <div className="flex flex-col gap-6 pt-8">
                  <div className="flex items-center gap-3">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/16bbcb4e-6118-4da7-9534-c1a3bc9b0dc8-54HK5CBPBKS1VbLlplZM01fMRX7DA6.png"
                      alt="JOHNX DJ Logo"
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain"
                    />
                    <span className="text-2xl font-black tracking-wider text-gradient-gold">
                      DJ JOHNX
                    </span>
                  </div>
                  <nav className="flex flex-col gap-4">
                    {navLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className="text-lg font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:text-primary"
                      >
                        {link.label}
                      </a>
                    ))}
                  </nav>
                  <button
                    onClick={handleShare}
                    className="mt-4 flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-foreground/80 transition-all hover:border-white/30 hover:bg-white/10 hover:text-foreground"
                  >
                    <Share2 className="h-4 w-4" />
                    Compartir
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
