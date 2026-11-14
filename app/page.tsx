import { Navbar } from "@/components/navbar"
import { TunnelHero } from "@/components/tunnel-hero/tunnel-hero"
import { IamGateway } from "@/components/iam-gateway"
import { AboutSection } from "@/components/about-section"
import { EventsSection } from "@/components/events-section"
import { MoreEvents } from "@/components/more-events"
import { ServicesSection } from "@/components/services-section"
import { GallerySection } from "@/components/gallery-section"
import { VideoSection } from "@/components/video-section"
import { ContactSection } from "@/components/contact-section"
import { SpotifyPlayer } from "@/components/spotify-player"
import { Footer } from "@/components/footer"
import { getSiteContent } from "@/lib/get-content"
import { IAM_PROSOUND_URL, JOHNX_SECTION_ID } from "@/lib/site-links"

export const dynamic = "force-dynamic"

export default async function Home() {
  const content = await getSiteContent()
  const gateway = <IamGateway johnxHref={`#${JOHNX_SECTION_ID}`} prosoundHref={IAM_PROSOUND_URL} />

  return (
    <main className="min-h-screen overflow-x-clip bg-background">
      {/* Navigation */}
      <Navbar />

      {/* Hero: tunel 3D con scroll y, al terminar, los dos bloques IAM */}
      {content?.hero?.visible !== false ? (
        <TunnelHero data={content?.hero} gateway={gateway} />
      ) : (
        gateway
      )}

      {/* Marquee Banner: aqui empieza la seccion de John (destino de "ENTER") */}
      <div
        id={JOHNX_SECTION_ID}
        className="scroll-mt-16 overflow-hidden border-y border-border/30 bg-muted/30 py-4 md:scroll-mt-20"
      >
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
