import { getSections, getSettings } from "@/lib/data"
import { PageEditor } from "@/components/admin/page-editor"

export const dynamic = "force-dynamic"

export default async function PaginaPage() {
  const [sections, settings] = await Promise.all([getSections(), getSettings()])

  const hero = sections["hero"]
  const about = sections["about"]
  const video = sections["video"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Pagina web</h1>
        <p className="text-sm text-foreground/60">Edita el contenido publico de tu web</p>
      </div>

      <PageEditor
        hero={{
          title: hero?.title ?? "DJ JOHNX",
          subtitle: hero?.subtitle ?? "FUSION LATINA",
          description: hero?.content ?? "",
          image_url: hero?.image_url ?? "",
          backgroundPosition: (hero?.extra?.backgroundPosition as string) ?? "center 55%",
          button_text: hero?.button_text ?? "",
          button_link: hero?.button_link ?? "",
          visible: hero?.visible ?? true,
        }}
        about={{
          title: about?.title ?? "SOBRE MI",
          description: about?.content ?? "",
          image_url: about?.image_url ?? "",
          visible: about?.visible ?? true,
          stats: (about?.extra?.stats as { number: string; label: string }[]) ?? [],
        }}
        video={{
          title: video?.title ?? "",
          description: video?.content ?? "",
          youtubeId: (video?.extra?.youtubeId as string) ?? "",
          imageUrl: video?.image_url ?? "",
          visible: video?.visible ?? true,
        }}
        contact={{
          email: settings.contact.email,
          phone: settings.contact.phone,
          whatsappNumber: settings.contact.whatsappNumber,
          location: settings.contact.location,
          instagram: settings.contact.instagram,
          facebook: settings.contact.facebook,
          tiktok: settings.contact.tiktok,
          youtube: settings.contact.youtube,
        }}
      />
    </div>
  )
}
