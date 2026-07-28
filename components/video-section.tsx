"use client"

import { Play } from "lucide-react"
import { useState } from "react"

interface VideoData {
  title?: string
  youtubeId?: string
  description?: string
}

export function VideoSection({ data }: { data?: VideoData }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const ytId = data?.youtubeId || "Mo1ri6aCWCA"
  const videoTitle = data?.title || "MUSICO, POETA Y LOCO"
  const videoDesc = data?.description || "Una mirada a mi pasion por la musica y los ritmos que mueven mi alma"

  return (
    <section className="relative py-24 md:py-32">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <span className="mb-4 inline-block text-sm font-medium uppercase tracking-[0.3em] text-primary">
            Video destacado
          </span>
          <h2 className="text-4xl font-black uppercase tracking-tight md:text-5xl lg:text-6xl">
            <span className="text-gradient-violet">{videoTitle}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-foreground/70">
            {videoDesc}
          </p>
        </div>

        {/* Video Container */}
        <div className="relative mx-auto aspect-video max-w-4xl overflow-hidden rounded-2xl glass-card">
          {!isPlaying ? (
            <>
              {/* Thumbnail */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url('https://img.youtube.com/vi/${ytId}/maxresdefault.jpg')`,
                }}
              />
              <div className="absolute inset-0 bg-background/60" />
              
              {/* Play Button */}
              <button
                onClick={() => setIsPlaying(true)}
                className="group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <div className="relative">
                  {/* Pulse Effect */}
                  <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary transition-all group-hover:scale-110 group-hover:glow-gold md:h-24 md:w-24">
                    <Play className="h-8 w-8 text-primary-foreground md:h-10 md:w-10" fill="currentColor" />
                  </div>
                </div>
              </button>
              
              {/* Video Title */}
              <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8">
                <h3 className="text-lg font-bold text-foreground md:text-xl">
                  DJ JOHNX - Live Session at D&apos;Cuba Bar
                </h3>
                <p className="mt-1 text-sm text-foreground/60">
                  Alicante, España
                </p>
              </div>
            </>
          ) : (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
              title="DJ JOHNX Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </section>
  )
}
