"use client"

import { useState, useTransition } from "react"
import type { Service } from "@/lib/data"
import {
  saveService,
  setServicePublished,
  reorderServices,
  deleteService,
} from "@/app/actions/catalog"
import { formatEurFromMinor } from "@/lib/format"
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
  DialogTrigger,
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
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Draft = {
  id?: number
  title: string
  description: string
  imageUrl: string
  priceEuros: string
  priceNote: string
  buttonText: string
  buttonLink: string
  isPublished: boolean
}

function toDraft(s?: Service): Draft {
  return {
    id: s?.id,
    title: s?.title ?? "",
    description: s?.description ?? "",
    imageUrl: s?.image_url ?? "",
    priceEuros: s?.price_minor != null ? String(s.price_minor / 100).replace(".", ",") : "",
    priceNote: s?.price_note ?? "",
    buttonText: s?.button_text ?? "",
    buttonLink: s?.button_link ?? "",
    isPublished: s?.is_published ?? true,
  }
}

export function ServicesManager({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<Service | null>(null)
  const [isPending, startTransition] = useTransition()

  function openNew() {
    setDraft(toDraft())
    setOpen(true)
  }
  function openEdit(s: Service) {
    setDraft(toDraft(s))
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
        await saveService(draft)
        toast.success("Servicio guardado")
        setOpen(false)
        location.reload()
      } catch {
        toast.error("No se pudo guardar")
      }
    })
  }

  function togglePublished(s: Service) {
    startTransition(async () => {
      await setServicePublished(s.id, !s.is_published)
      setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_published: !s.is_published } : x)))
    })
  }

  function move(index: number, dir: -1 | 1) {
    const t = index + dir
    if (t < 0 || t >= services.length) return
    const next = [...services]
    ;[next[index], next[t]] = [next[t], next[index]]
    setServices(next)
    startTransition(async () => {
      await reorderServices(next.map((s) => s.id))
    })
  }

  function confirmDelete() {
    if (!deleting) return
    const id = deleting.id
    startTransition(async () => {
      await deleteService(id)
      setServices((prev) => prev.filter((x) => x.id !== id))
      setDeleting(null)
      toast.success("Servicio eliminado")
    })
  }

  return (
    <div className="space-y-4">
      <Button onClick={openNew}>
        <Plus className="mr-2 h-4 w-4" />
        Nuevo servicio
      </Button>

      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aun no hay servicios.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s, i) => (
            <div key={s.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
              {s.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image_url || "/placeholder.svg"} alt={s.title} className="h-16 w-16 shrink-0 rounded object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                  Sin foto
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium text-foreground">{s.title}</p>
                  {!s.is_published && <Badge variant="secondary">Oculto</Badge>}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                {s.price_minor != null && (
                  <p className="mt-1 text-xs font-medium text-primary">{formatEurFromMinor(s.price_minor)}</p>
                )}
                <div className="mt-2 flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} aria-label="Subir">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} aria-label="Bajar">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => togglePublished(s)} aria-label="Publicar">
                    {s.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)} aria-label="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleting(s)} aria-label="Eliminar">
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
            <DialogTitle>{draft?.id ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Titulo</Label>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Descripcion</Label>
                <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Precio orientativo (€)</Label>
                  <Input placeholder="150,00" value={draft.priceEuros} onChange={(e) => setDraft({ ...draft, priceEuros: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Nota de precio</Label>
                  <Input placeholder="desde / por sesion" value={draft.priceNote} onChange={(e) => setDraft({ ...draft, priceNote: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Texto del boton</Label>
                  <Input value={draft.buttonText} onChange={(e) => setDraft({ ...draft, buttonText: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Enlace del boton</Label>
                  <Input value={draft.buttonLink} onChange={(e) => setDraft({ ...draft, buttonLink: e.target.value })} />
                </div>
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
            <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
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
