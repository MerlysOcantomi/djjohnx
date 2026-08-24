"use client"

import { useState, useTransition } from "react"
import { Check, Clock3, Disc3, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { updateFreeSongRequestStatus } from "@/app/actions/song-requests"
import type { FreeSongRequest, FreeSongRequestStatus } from "@/lib/song-requests"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const labels: Record<FreeSongRequestStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  played: "Reproducida",
  rejected: "Rechazada",
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function SongRequestsManager({ initialRequests }: { initialRequests: FreeSongRequest[] }) {
  const [requests, setRequests] = useState(initialRequests)
  const [pending, startTransition] = useTransition()

  function setStatus(id: number, status: FreeSongRequestStatus) {
    startTransition(async () => {
      try {
        await updateFreeSongRequestStatus({ id, status })
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
        toast.success(`Peticion marcada como ${labels[status].toLowerCase()}`)
      } catch {
        toast.error("No se pudo actualizar la peticion")
      }
    })
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Todavia no hay peticiones de canciones.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {pending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Actualizando...
        </div>
      )}

      {requests.map((request) => (
        <article key={request.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">{request.song_title}</h2>
                <Badge variant="secondary">{labels[request.status]}</Badge>
              </div>
              {request.artist_name && <p className="text-sm text-muted-foreground">{request.artist_name}</p>}
              <p className="mt-2 text-sm text-foreground/80">
                Pedido por <span className="font-medium text-foreground">{request.requester_name}</span>
              </p>
              {request.note && <p className="mt-1 text-sm text-muted-foreground">“{request.note}”</p>}
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" /> {formatTime(request.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:max-w-72 sm:justify-end">
              <Button size="sm" variant={request.status === "accepted" ? "default" : "outline"} onClick={() => setStatus(request.id, "accepted")} disabled={pending}>
                <Check className="mr-1 h-4 w-4" /> Aceptar
              </Button>
              <Button size="sm" variant={request.status === "played" ? "default" : "outline"} onClick={() => setStatus(request.id, "played")} disabled={pending}>
                <Disc3 className="mr-1 h-4 w-4" /> Reproducida
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setStatus(request.id, "rejected")} disabled={pending}>
                <X className="mr-1 h-4 w-4" /> Rechazar
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
