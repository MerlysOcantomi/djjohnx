"use client"

import { useState, useRef, useTransition } from "react"
import { upload } from "@vercel/blob/client"
import type { GalleryImage } from "@/lib/data"
import {
  createPhoto,
  updatePhoto,
  deletePhoto,
  setPhotoPublished,
  setPhotoFeatured,
  reorderPhotos,
  replacePhoto,
} from "@/app/actions/photos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  Star,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/avif"
const MAX_BYTES = 15 * 1024 * 1024 // 15 MB

export function PhotosManager({
  initialPhotos,
  categories,
}: {
  initialPhotos: GalleryImage[]
  categories: string[]
}) {
  const [photos, setPhotos] = useState<GalleryImage[]>(initialPhotos)
  const [uploading, setUploading] = useState<{ name: string; pct: number }[]>([])
  const [editing, setEditing] = useState<GalleryImage | null>(null)
  const [deleting, setDeleting] = useState<GalleryImage | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const replaceTarget = useRef<number | null>(null)

  function validate(file: File): string | null {
    if (!ACCEPT.split(",").includes(file.type)) return "Formato no permitido"
    if (file.size === 0) return "Archivo vacio"
    if (file.size > MAX_BYTES) return "La imagen supera 15 MB"
    return null
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const list = Array.from(files)

    for (const file of list) {
      const err = validate(file)
      if (err) {
        toast.error(`${file.name}: ${err}`)
        continue
      }
      const key = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^\w.\-]/g, "_")}`
      setUploading((u) => [...u, { name: file.name, pct: 0 }])
      try {
        const blob = await upload(key, file, {
          access: "public",
          handleUploadUrl: "/api/admin/blob-upload",
          onUploadProgress: (p) => {
            setUploading((u) => u.map((x) => (x.name === file.name ? { ...x, pct: p.percentage } : x)))
          },
        })
        await createPhoto({
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          title: file.name.replace(/\.[^.]+$/, ""),
          altText: "",
          category: "Otros",
        })
      } catch {
        toast.error(`No se pudo subir ${file.name}`)
      } finally {
        setUploading((u) => u.filter((x) => x.name !== file.name))
      }
    }
    // refresca desde el server
    location.reload()
  }

  function togglePublished(p: GalleryImage) {
    startTransition(async () => {
      await setPhotoPublished(p.id, !p.is_published)
      setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_published: !p.is_published } : x)))
      toast.success(p.is_published ? "Foto ocultada" : "Foto publicada")
    })
  }

  function toggleFeatured(p: GalleryImage) {
    startTransition(async () => {
      await setPhotoFeatured(p.id, !p.is_featured)
      setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_featured: !p.is_featured } : x)))
      toast.success(p.is_featured ? "Quitada de portada" : "Marcada como portada")
    })
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= photos.length) return
    const next = [...photos]
    ;[next[index], next[target]] = [next[target], next[index]]
    setPhotos(next)
    startTransition(async () => {
      await reorderPhotos(next.map((p) => p.id))
    })
  }

  async function handleReplaceFile(files: FileList | null) {
    const id = replaceTarget.current
    if (!files || files.length === 0 || id == null) return
    const file = files[0]
    const err = validate(file)
    if (err) {
      toast.error(err)
      return
    }
    const key = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^\w.\-]/g, "_")}`
    setUploading((u) => [...u, { name: file.name, pct: 0 }])
    try {
      const blob = await upload(key, file, {
        access: "public",
        handleUploadUrl: "/api/admin/blob-upload",
        onUploadProgress: (p) =>
          setUploading((u) => u.map((x) => (x.name === file.name ? { ...x, pct: p.percentage } : x))),
      })
      await replacePhoto({ id, newBlobUrl: blob.url, newBlobPathname: blob.pathname })
      toast.success("Imagen reemplazada")
      location.reload()
    } catch {
      toast.error("No se pudo reemplazar")
    } finally {
      setUploading((u) => u.filter((x) => x.name !== file.name))
      replaceTarget.current = null
    }
  }

  function saveEdit(form: FormData) {
    if (!editing) return
    const payload = {
      id: editing.id,
      title: String(form.get("title") || ""),
      description: String(form.get("description") || ""),
      altText: String(form.get("altText") || ""),
      category: String(form.get("category") || "Otros"),
    }
    startTransition(async () => {
      await updatePhoto(payload)
      setPhotos((prev) => prev.map((x) => (x.id === editing.id ? { ...x, ...payload, alt_text: payload.altText } : x)))
      setEditing(null)
      toast.success("Foto actualizada")
    })
  }

  function confirmDelete() {
    if (!deleting) return
    const id = deleting.id
    startTransition(async () => {
      await deletePhoto(id)
      setPhotos((prev) => prev.filter((x) => x.id !== id))
      setDeleting(null)
      toast.success("Foto eliminada")
    })
  }

  return (
    <div className="space-y-6">
      {/* Zona de subida */}
      <div className="rounded-lg border border-border bg-card p-4">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={replaceRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleReplaceFile(e.target.files)}
        />
        <Button onClick={() => fileRef.current?.click()} className="w-full sm:w-auto">
          <Upload className="mr-2 h-4 w-4" />
          Subir fotografias
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          JPG, PNG, WebP o AVIF. Maximo 15 MB por imagen. Puedes seleccionar varias.
        </p>
        {uploading.length > 0 && (
          <div className="mt-3 space-y-2">
            {uploading.map((u) => (
              <div key={u.name} className="text-xs">
                <div className="mb-1 flex justify-between">
                  <span className="truncate">{u.name}</span>
                  <span>{Math.round(u.pct)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${u.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejilla de fotos */}
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aun no hay fotografias. Sube la primera.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.id} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="relative aspect-square bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.blob_url || "/placeholder.svg"}
                  alt={p.alt_text || p.title || "Foto"}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-1 top-1 flex gap-1">
                  {p.is_featured && (
                    <Badge className="bg-primary text-primary-foreground">Portada</Badge>
                  )}
                  {!p.is_published && <Badge variant="secondary">Oculta</Badge>}
                </div>
              </div>
              <div className="space-y-2 p-2">
                <p className="truncate text-xs font-medium text-foreground">{p.title || "Sin titulo"}</p>
                <p className="text-[10px] text-muted-foreground">{p.category}</p>
                <div className="flex flex-wrap gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} aria-label="Subir">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} aria-label="Bajar">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => togglePublished(p)}
                    aria-label={p.is_published ? "Ocultar" : "Publicar"}
                  >
                    {p.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => toggleFeatured(p)}
                    aria-label="Portada"
                  >
                    <Star className={`h-3.5 w-3.5 ${p.is_featured ? "fill-primary text-primary" : ""}`} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(p)} aria-label="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      replaceTarget.current = p.id
                      replaceRef.current?.click()
                    }}
                    aria-label="Reemplazar"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setDeleting(p)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editar */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar fotografia</DialogTitle>
          </DialogHeader>
          {editing && (
            <form action={saveEdit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="title">Titulo</Label>
                <Input id="title" name="title" defaultValue={editing.title ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Descripcion</Label>
                <Textarea id="description" name="description" defaultValue={editing.description ?? ""} rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="altText">Texto alternativo</Label>
                <Input id="altText" name="altText" defaultValue={editing.alt_text ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="category">Categoria</Label>
                <Select name="category" defaultValue={editing.category}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Eliminar */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar fotografia</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara la imagen de la galeria y el archivo de almacenamiento. Esta accion no se puede deshacer.
            </AlertDialogDescription>
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
