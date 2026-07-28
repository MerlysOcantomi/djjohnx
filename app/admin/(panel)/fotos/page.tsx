import { getGalleryImages, GALLERY_CATEGORIES } from "@/lib/data"
import { PhotosManager } from "@/components/admin/photos-manager"

export const dynamic = "force-dynamic"

export default async function FotosPage() {
  const photos = await getGalleryImages(false)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fotos</h1>
        <p className="text-sm text-muted-foreground">
          Sube, organiza y publica las fotografias de la galeria.
        </p>
      </div>
      <PhotosManager initialPhotos={photos} categories={[...GALLERY_CATEGORIES]} />
    </div>
  )
}
