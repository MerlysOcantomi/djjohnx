import Link from "next/link"
import { Music2 } from "lucide-react"
import { SongRequestForm } from "@/components/song-request-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Pide tu cancion",
  description: "Pide una cancion a DJ JOHNX durante el evento.",
}

export default function PideTuCancionPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block text-2xl font-black tracking-wider text-gradient-gold">
            DJ JOHNX
          </Link>
          <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <Music2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">Pide tu cancion</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            Dinos que quieres escuchar. La peticion llega directamente al panel de DJ JOHNX.
          </p>
          <p className="mt-3 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Peticiones gratuitas por tiempo limitado
          </p>
        </div>

        <SongRequestForm />

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Enviar una peticion no garantiza que la cancion pueda reproducirse. El DJ decide segun el momento, el estilo del evento y la disponibilidad de la pista.
        </p>
      </div>
    </main>
  )
}
