import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { getFreeSongRequests } from "@/lib/song-requests"
import { SongRequestsManager } from "@/components/admin/song-requests-manager"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function PeticionesPage() {
  const requests = await getFreeSongRequests()

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

      <SongRequestsManager initialRequests={requests} />
    </div>
  )
}
