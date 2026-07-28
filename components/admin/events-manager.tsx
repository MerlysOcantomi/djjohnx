"use client"

import { useState, useTransition } from "react"
import type { EventRow } from "@/lib/data"
import {
  saveEvent,
  setEventPublished,
  duplicateEvent,
  deleteEvent,
} from "@/app/actions/catalog"
import { formatDateEs } from "@/lib/format"
import { ImageUpload } from "@/components/admin/image-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Copy, Eye, EyeOff, Loader2, MapPin, CalendarDays } from "lucide-react"
import { toast } from "sonner"

type Draft = {
  id?: number
  title: string
  eventDate: string
  eventTime: string
  venue: string
  city: string
  description: string
  imageUrl: string
  ticketsLink: string
  isPublished: boolean
}

function toDraft(e?: EventRow): Draft {
  return {
    id: e?.id,
    title: e?.title ?? "",
    eventDate: e?.event_date ? e.event_date.slice(0, 10) : "",
    eventTime: e?.event_time ?? "",
    venue: e?.venue ?? "",
    city: e?.city ?? "",
    description: e?.description ?? "",
    imageUrl: e?.image_url ?? "",
    ticketsLink: e?.tickets_link ?? "",
    isPublished: e?.is_published ?? true,
  }
}

export function EventsManager({ initialEvents }: { initialEvents: EventRow[] }) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<EventRow | null>(null)
  const [isPending, startTransition] = useTransition()

  function openNew() {
    setDraft(toDraft())
    setOpen(true)
  }
  function openEdit(e: EventRow) {
    setDraft(toDraft(e))
    setOpen(true)
  }

  function save() {
    if (!draft) return
    if (!draft.title.trim()) {
      toast.error("El titulo es obligatorio")
      return
    }
    startTransition(async () => {
      try {
        await saveEvent(draft)
        toast.success("Evento guardado")
        setOpen(false)
        location.reload()
      } catch {
        toast.error("No se pudo guardar")
      }
    })
  }

  function togglePublished(e: EventRow) {
    startTransition(async () => {
      await setEventPublished(e.id, !e.is_published)
      setEvents((prev) => prev.map((x) => (x.id === e.id ? { ...x, is_published: !e.is_published } : x)))
    })
  }

  function handleDuplicate(e: EventRow) {
    startTransition(async () => {
      await duplicateEvent(e.id)
      toast.success("Evento duplicado")
      location.reload()
    })
  }

  function confirmDelete() {
    if (!deleting) return
    const id = deleting.id
    startTransition(async () => {
      await deleteEvent(id)
      setEvents((prev) => prev.filter((x) => x.id !== id))
      setDeleting(null)
      toast.success("Evento eliminado")
    })
  }

  return (
    <div className="space-y-4">
      <Button onClick={openNew}>
        <Plus className="mr-2 h-4 w-4" />
        Nuevo evento
      </Button>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aun no hay eventos.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {events.map((e) => (
            <div key={e.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
              {e.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.image_url || "/placeholder.svg"} alt={e.title} className="h-20 w-20 shrink-0 rounded object-cover" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                  Sin foto
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium text-foreground">{e.title}</p>
                  {!e.is_published && <Badge variant="secondary">Oculto</Badge>}
                </div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {e.event_date ? formatDateEs(e.event_date) : e.event_time || "Sin fecha"}
                </p>
                {(e.venue || e.city) && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {[e.venue, e.city].filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => togglePublished(e)} aria-label="Publicar">
                    {e.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(e)} aria-label="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDuplicate(e)} aria-label="Duplicar">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleting(e)} aria-label="Eliminar">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar evento" : "Nuevo evento"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Titulo</Label>
                <Input value={draft.title} onChange={(ev) => setDraft({ ...draft, title: ev.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input type="date" value={draft.eventDate} onChange={(ev) => setDraft({ ...draft, eventDate: ev.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Hora / texto</Label>
                  <Input placeholder="23:00 o Todos los jueves" value={draft.eventTime} onChange={(ev) => setDraft({ ...draft, eventTime: ev.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Lugar</Label>
                  <Input value={draft.venue} onChange={(ev) => setDraft({ ...draft, venue: ev.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Ciudad</Label>
                  <Input value={draft.city} onChange={(ev) => setDraft({ ...draft, city: ev.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Descripcion</Label>
                <Textarea value={draft.description} onChange={(ev) => setDraft({ ...draft, description: ev.target.value })} rows={2} />
              </div>
              <div className="space-y-1">
                <Label>Enlace de entradas</Label>
                <Input value={draft.ticketsLink} onChange={(ev) => setDraft({ ...draft, ticketsLink: ev.target.value })} />
              </div>
              <ImageUpload label="Imagen" value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label>Publicado</Label>
                <Switch checked={draft.isPublished} onCheckedChange={(v) => setDraft({ ...draft, isPublished: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={save} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar evento</AlertDialogTitle>
            <AlertDialogDescription>Esta accion no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
