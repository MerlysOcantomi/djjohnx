"use client"

import { useRef, useState } from "react"
import { upload } from "@vercel/blob/client"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, X } from "lucide-react"

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"]

export function ImageUpload({
  value,
  onChange,
  label = "Imagen",
  aspect = "aspect-video",
}: {
  value?: string
  onChange: (url: string) => void
  label?: string
  aspect?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    if (!ALLOWED.includes(file.type)) {
      setError("Formato no permitido. Usa JPG, PNG, WebP o AVIF.")
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("La imagen supera los 15 MB.")
      return
    }
    setUploading(true)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase()
      const blob = await upload(`djjohnx/${Date.now()}-${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/blob-upload",
      })
      onChange(blob.url)
    } catch (e) {
      setError((e as Error).message || "Error al subir la imagen")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm text-foreground/70">{label}</p>
      <div className={`relative ${aspect} w-full overflow-hidden rounded-lg border border-border/50 bg-muted/30`}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value || "/placeholder.svg"} alt="Vista previa" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-foreground/40">Sin imagen</div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {value ? "Cambiar" : "Subir"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} disabled={uploading}>
            <X className="mr-2 h-4 w-4" />
            Quitar
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ""
        }}
      />
    </div>
  )
}
