"use client"

import { useState } from "react"
import { Music, X, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function SpotifyPlayer() {
  const [isOpen, setIsOpen] = useState(false)

  const spotifyUrl = "https://open.spotify.com/user/31bjzxuidxbqlteqbrst75gvf5pa"

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-all hover:scale-110 glow-spotify md:h-16 md:w-16"
        aria-label="Abrir Spotify"
      >
        <Music className="h-6 w-6 md:h-7 md:w-7" />
      </button>

      {/* Spotify Mini Card */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-72 overflow-hidden rounded-2xl glass-card shadow-2xl md:w-80">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 bg-accent/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-accent" />
              <span className="font-bold text-accent">Spotify</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/60 hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Profile Card */}
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-accent/50 shadow-lg shadow-accent/20">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/DJ%20JOHN%20X%20SOBRE%20MI%20-CACbHeXBaQUErfIPp0NsY2TyUs5JYi.png"
                alt="DJ JOHNX"
                fill
                className="object-cover object-top"
              />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-foreground">DJ JOHNX</h3>
              <p className="text-sm text-foreground/50">{"Fusi\u00f3n Latina \u2022 Alicante"}</p>
            </div>
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground transition-all hover:scale-105 hover:brightness-110"
            >
              <Music className="h-4 w-4" />
              {"Seguir en Spotify"}
            </a>
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-foreground/40 transition-colors hover:text-accent"
            >
              <ExternalLink className="h-3 w-3" />
              {"Abrir perfil completo"}
            </a>
          </div>
        </div>
      )}
    </>
  )
}
