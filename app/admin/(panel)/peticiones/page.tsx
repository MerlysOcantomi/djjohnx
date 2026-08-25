import Link from "next/link"
import { ExternalLink, Music2 } from "lucide-react"
import { getFreeSongRequests } from "@/lib/song-requests"
import { getSpotifyConnection } from "@/lib/spotify"
import { SongRequestsManager } from "@/components/admin/song-requests-manager"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

export default async function PeticionesPage() {
  const [requests, spotify] = await Promise.all([
    getFreeSongRequests(),
    getSpotifyConnection().catch(() => null),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Peticiones de canciones</h1>
          <p className="text-sm text-muted-foreground">Gestiona las canciones que pide el publico desde el QR.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/pide-tu-cancion" target="_blank">
            Abrir pagina publica
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Music2 className="h-5 w-5" />
              <h2 className="font-semibold">Spotify</h2>
              <Badge variant={spotify ? "default" : "secondary"}>{spotify ? "Conectado" : "Sin conectar"}</Badge>
            </div>
            {spotify ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {spotify.display_name || spotify.spotify_user_id} · Las canciones aceptadas se añaden a la playlist de DJ JOHNX.
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Conecta la cuenta de John una vez para crear la playlist privada y añadir automaticamente las canciones aceptadas.
              </p>
            )}
          </div>

          {spotify ? (
            <div className="flex flex-wrap gap-2">
              {spotify.playlist_url && (
                <Button asChild variant="outline" size="sm">
                  <a href={spotify.playlist_url} target="_blank" rel="noreferrer">
                    Abrir playlist <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button asChild size="sm">
                <Link href="/api/spotify/connect">Reconectar Spotify</Link>
              </Button>
            </div>
          ) : (
            <Button asChild size="lg" className="h-12 w-full px-6 text-base font-semibold sm:w-auto">
              <Link href="/api/spotify/connect">
                <Music2 className="mr-2 h-5 w-5" />
                Conectar cuenta de Spotify
              </Link>
            </Button>
          )}
        </div>
      </section>

      <SongRequestsManager initialRequests={requests} />
    </div>
  )
}
