import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { AboutSection } from "@/components/about-section"
import { EventsSection } from "@/components/events-section"
import { MoreEvents } from "@/components/more-events"
import { ServicesSection } from "@/components/services-section"
import { GallerySection } from "@/components/gallery-section"
import { VideoSection } from "@/components/video-section"
import { ContactSection } from "@/components/contact-section"
import { SpotifyPlayer } from "@/components/spotify-player"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"
import { getSiteContent } from "@/lib/get-content"
import { JOHNX_PATH } from "@/lib/site-links"

export const dynamic = "force-dynamic"

/**
 * El sitio de DJ JOHNX: portada, biografia, eventos, servicios, galeria,
 * video, contacto y musica. Es la pagina que antes estaba en "/" ; la Home es
 * ahora la entrada del tunel y se llega aqui con "IAM DJ JOHNX - ENTER".
 */
export const metadata: Metadata = {
  title: { absolute: "DJ JOHNX | Fusión Latina - DJ Cubano en Alicante" },
  alternates: { canonical: JOHNX_PATH },
  // Next sustituye el bloque openGraph entero, asi que se repite completo.
  openGraph: {
    title: "DJ JOHNX | Fusión Latina",
    description: "DJ Cubano en Alicante - Latin House, Afrobeats, Reggaeton, Salsa",
    type: "website",
    url: JOHNX_PATH,
    siteName: "DJ JOHNX",
    locale: "es_ES",
  },
}

export default async function JohnPage() {
  const content = await getSiteContent()

  return (
    // overflow-x-clip: los adornos de 500px de algunas secciones provocaban
    // scroll lateral en movil.
    <main className="john-prosound min-h-screen overflow-x-clip bg-background">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      {content?.hero?.visible !== false && <Hero data={content?.hero} />}

      {/* Marquee Banner */}
      <div className="overflow-hidden border-y border-border/30 bg-muted/30 py-4">
        <div className="animate-marquee flex whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-8 px-4">
              <span className="text-sm font-bold uppercase tracking-widest text-primary">
                Latin House
              </span>
              <span className="text-primary/30">•</span>
              <span className="text-sm font-bold uppercase tracking-widest text-secondary">
                Afrobeats
              </span>
              <span className="text-secondary/30">•</span>
              <span className="text-sm font-bold uppercase tracking-widest text-accent">
                Reggaeton
              </span>
              <span className="text-accent/30">•</span>
              <span className="text-sm font-bold uppercase tracking-widest text-primary">
                Salsa
              </span>
              <span className="text-primary/30">•</span>
              <span className="text-sm font-bold uppercase tracking-widest text-secondary">
                Bachata
              </span>
              <span className="text-secondary/30">•</span>
              <span className="text-sm font-bold uppercase tracking-widest text-accent">
                Merengue
              </span>
              <span className="text-accent/30">•</span>
              <span className="text-sm font-bold uppercase tracking-widest text-primary">
                Cubano
              </span>
              <span className="text-primary/30">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* About Section */}
      {content?.about?.visible !== false && <AboutSection data={content?.about} />}

      {/* Events Section */}
      {content?.events && <EventsSection data={content?.events} />}

      {/* Resto de eventos publicados */}
      <MoreEvents data={content?.moreEvents} />

      {/* Services Section */}
      <ServicesSection data={content?.services} />

      {/* Gallery Section */}
      <GallerySection data={content?.gallery} />

      {/* Video Section */}
      {content?.video?.visible !== false && <VideoSection data={content?.video} />}

      {/* Contact Section */}
      <ContactSection data={content?.contact} />

      {/* Footer */}
      <Footer data={content?.contact} />

      {/* Floating Spotify Player */}
      <SpotifyPlayer />
    </main>
  )
}
