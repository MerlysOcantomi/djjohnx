"use client"

import Image from "next/image"
import { useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel"

const defaultGalleryImages = [
  {
    id: 1,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/JOHN%20DCUBA%20BANDERA%20CUBANA-x0zTrh2CEB6AM14BtZ5x3l1X6xcj1v.jpg",
    alt: "DJ JOHNX frente al restaurante D'Cuba con la bandera cubana",
    category: "D'Cuba",
  },
  {
    id: 2,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/JOHN%20Y%20MERLYS%20EN%20LA%20EMBAJADA%20DE%20CUBA%20ANTIGUA-x8SBXGCB5QuW9PstSYljA1UzMB4bOU.jpg",
    alt: "DJ JOHNX y Merlys en la Embajada de Cuba en Antigua",
    category: "Viajes",
  },
  {
    id: 3,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/DJ%20JOHN%20Y%20YOMIL-y30PojjvcDWick3STWBV1rEZGf2CNq.jpg",
    alt: "DJ JOHNX con Yomil en sesion nocturna",
    category: "Artistas",
  },
  {
    id: 4,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/facebook_1778951869128_7461464940495022770-zB1r4yIazjXJjULMBGCScAy2LPyCbt.jpg",
    alt: "DJ JOHNX en escenario tropical",
    category: "Fiestas",
  },
  {
    id: 5,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-05-17%20at%2012.45.27%20AM%20%282%29-REAmCnhS7U6FdU82Aca5GQAZsuPY95.jpeg",
    alt: "DJ JOHNX frente a Que Cache Disco Pub",
    category: "Clubs",
  },
  {
    id: 6,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-05-16%20at%209.48.18%20PM-gHycCemBw0RK0BrybLqeQ15fiHTjf0.jpeg",
    alt: "DJ JOHNX en club con luces azules",
    category: "Sessions",
  },
  {
    id: 7,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-05-17%20at%2012.45.26%20AM-6zhDqXNuxBcY9Lmc7LRGwII8qjmpBD.jpeg",
    alt: "DJ JOHNX selfie con gorra X",
    category: "Sessions",
  },
  {
    id: 8,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-05-17%20at%2012.45.25%20AM-p7vVRhAUfzyNEISKXI5XdDFJewxgHK.jpeg",
    alt: "Concierto Un Titico en Parole Club - DJ JOHNX invitado",
    category: "Eventos",
  },
  {
    id: 9,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-05-17%20at%2012.45.26%20AM%20%283%29-PqhQl0bwLkeBMJBdoIzjGQp9TcIWxt.jpeg",
    alt: "DJ JOHNX mezclando con bandera cubana",
    category: "D'Cuba",
  },
  {
    id: 10,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-05-17%20at%2012.45.27%20AM%20%283%29-xNvwmePsuVkOlB08sD6h7OYXkG7WfF.jpeg",
    alt: "DJ JOHNX en Culture Music Club",
    category: "Clubs",
  },
  {
    id: 11,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-05-17%20at%2012.45.27%20AM-jFNM8o1dYNsR8GDADorkgg6yW02v14.jpeg",
    alt: "DJ JOHNX en La Ceiba restaurante cubano",
    category: "D'Cuba",
  },
]

interface GalleryImage {
  id: number
  src: string
  alt: string
  category: string
}

export function GallerySection({ data }: { data?: GalleryImage[] }) {
  const galleryImages = data && data.length > 0 ? data : defaultGalleryImages
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  const onApiChange = (emblaApi: CarouselApi) => {
    setApi(emblaApi)
    if (!emblaApi) return
    setCurrent(emblaApi.selectedScrollSnap())
    emblaApi.on("select", () => {
      setCurrent(emblaApi.selectedScrollSnap())
    })
  }

  const handlePrevious = () => {
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === 0 ? galleryImages.length - 1 : selectedImage - 1)
    }
  }

  const handleNext = () => {
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === galleryImages.length - 1 ? 0 : selectedImage + 1)
    }
  }

  return (
    <section id="galeria" className="relative py-24 md:py-32">
      {/* Background Decoration */}
      <div className="absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-accent/10 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block text-sm font-medium uppercase tracking-[0.3em] text-primary">
            Momentos inolvidables
          </span>
          <h2 className="text-4xl font-black uppercase tracking-tight md:text-5xl lg:text-6xl">
            <span className="text-gradient-gold">GALERIA</span>
          </h2>
        </div>

        {/* Carousel Slider */}
        <Carousel
          setApi={onApiChange}
          opts={{
            align: "start",
            loop: true,
          }}
          className="mx-auto w-full max-w-5xl"
        >
          <CarouselContent className="-ml-4">
            {galleryImages.map((image, index) => (
              <CarouselItem
                key={image.id}
                className="pl-4 basis-full sm:basis-1/2 lg:basis-1/2"
              >
                <div
                  className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-xl"
                  onClick={() => setSelectedImage(index)}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="text-xs font-medium uppercase tracking-wide text-primary">
                      {image.category}
                    </span>
                  </div>
                  <div className="absolute inset-0 rounded-xl border-2 border-primary/0 transition-all duration-300 group-hover:border-primary/50" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="-left-4 md:-left-14 h-10 w-10 border-white/15 bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 hover:border-white/30" />
          <CarouselNext className="-right-4 md:-right-14 h-10 w-10 border-white/15 bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 hover:border-white/30" />
        </Carousel>

        {/* Dot Indicators */}
        <div className="mt-8 flex items-center justify-center gap-2">
          {galleryImages.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                current === index
                  ? "w-8 bg-primary"
                  : "w-2 bg-foreground/20 hover:bg-foreground/40"
              }`}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-foreground hover:bg-foreground/10"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground hover:bg-foreground/10"
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          <div className="relative mx-16 aspect-[3/4] w-full max-w-2xl overflow-hidden rounded-xl">
            <Image
              src={galleryImages[selectedImage].src}
              alt={galleryImages[selectedImage].alt}
              fill
              className="object-contain"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground hover:bg-foreground/10"
            onClick={handleNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
            <p className="text-sm text-foreground/70">
              {galleryImages[selectedImage].category} - {selectedImage + 1} / {galleryImages.length}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
