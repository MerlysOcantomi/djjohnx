"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { ImageUpload } from "@/components/admin/image-upload"
import { saveHeroAction, saveAboutAction, saveVideoAction, saveContactAction } from "@/app/actions/content"

type Hero = {
  title: string
  subtitle: string
  description: string
  image_url: string
  backgroundPosition: string
  button_text: string
  button_link: string
  visible: boolean
}
type About = {
  title: string
  description: string
  image_url: string
  visible: boolean
  stats: { number: string; label: string }[]
}
type Video = { title: string; description: string; youtubeId: string; imageUrl: string; visible: boolean }
type Contact = {
  email: string
  phone: string
  whatsappNumber: string
  location: string
  instagram: string
  facebook: string
  tiktok: string
  youtube: string
}

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending} className="font-bold">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Guardar cambios
    </Button>
  )
}

export function PageEditor(props: { hero: Hero; about: About; video: Video; contact: Contact }) {
  const [hero, setHero] = useState(props.hero)
  const [about, setAbout] = useState(props.about)
  const [video, setVideo] = useState(props.video)
  const [contact, setContact] = useState(props.contact)
  const [pending, startTransition] = useTransition()

  function run(fn: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      try {
        await fn()
        toast.success("Cambios guardados")
      } catch {
        toast.error("No se pudo guardar")
      }
    })
  }

  return (
    <Tabs defaultValue="hero">
      <TabsList className="flex w-full flex-wrap">
        <TabsTrigger value="hero">Portada</TabsTrigger>
        <TabsTrigger value="about">Sobre mi</TabsTrigger>
        <TabsTrigger value="video">Video</TabsTrigger>
        <TabsTrigger value="contact">Contacto</TabsTrigger>
      </TabsList>

      {/* PORTADA */}
      <TabsContent value="hero">
        <Card className="space-y-4 p-4">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => saveHeroAction(hero))
            }}
          >
            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
              <Label htmlFor="hero-visible">Seccion visible</Label>
              <Switch
                id="hero-visible"
                checked={hero.visible}
                onCheckedChange={(v) => setHero({ ...hero, visible: v })}
              />
            </div>
            <div>
              <Label className="mb-1 block">Titulo</Label>
              <Input value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Subtitulo</Label>
              <Input value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Descripcion</Label>
              <Textarea
                rows={3}
                value={hero.description}
                onChange={(e) => setHero({ ...hero, description: e.target.value })}
              />
            </div>
            <ImageUpload
              label="Imagen principal"
              value={hero.image_url}
              onChange={(url) => setHero({ ...hero, image_url: url })}
            />
            <div>
              <Label className="mb-1 block">Posicion de la imagen (ej. center 55%)</Label>
              <Input
                value={hero.backgroundPosition}
                onChange={(e) => setHero({ ...hero, backgroundPosition: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block">Texto del boton</Label>
                <Input value={hero.button_text} onChange={(e) => setHero({ ...hero, button_text: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">Enlace del boton</Label>
                <Input value={hero.button_link} onChange={(e) => setHero({ ...hero, button_link: e.target.value })} />
              </div>
            </div>
            <SaveButton pending={pending} />
          </form>
        </Card>
      </TabsContent>

      {/* SOBRE MI */}
      <TabsContent value="about">
        <Card className="space-y-4 p-4">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => saveAboutAction(about))
            }}
          >
            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
              <Label htmlFor="about-visible">Seccion visible</Label>
              <Switch
                id="about-visible"
                checked={about.visible}
                onCheckedChange={(v) => setAbout({ ...about, visible: v })}
              />
            </div>
            <div>
              <Label className="mb-1 block">Titulo</Label>
              <Input value={about.title} onChange={(e) => setAbout({ ...about, title: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Biografia</Label>
              <Textarea
                rows={6}
                value={about.description}
                onChange={(e) => setAbout({ ...about, description: e.target.value })}
              />
            </div>
            <ImageUpload
              label="Fotografia"
              aspect="aspect-[4/5]"
              value={about.image_url}
              onChange={(url) => setAbout({ ...about, image_url: url })}
            />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Estadisticas</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setAbout({ ...about, stats: [...about.stats, { number: "", label: "" }] })}
                >
                  <Plus className="mr-1 h-4 w-4" /> Anadir
                </Button>
              </div>
              <div className="space-y-2">
                {about.stats.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="10+"
                      className="w-24"
                      value={s.number}
                      onChange={(e) => {
                        const next = [...about.stats]
                        next[i] = { ...next[i], number: e.target.value }
                        setAbout({ ...about, stats: next })
                      }}
                    />
                    <Input
                      placeholder="Anos de experiencia"
                      value={s.label}
                      onChange={(e) => {
                        const next = [...about.stats]
                        next[i] = { ...next[i], label: e.target.value }
                        setAbout({ ...about, stats: next })
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setAbout({ ...about, stats: about.stats.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <SaveButton pending={pending} />
          </form>
        </Card>
      </TabsContent>

      {/* VIDEO */}
      <TabsContent value="video">
        <Card className="space-y-4 p-4">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => saveVideoAction(video))
            }}
          >
            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
              <Label htmlFor="video-visible">Seccion visible</Label>
              <Switch
                id="video-visible"
                checked={video.visible}
                onCheckedChange={(v) => setVideo({ ...video, visible: v })}
              />
            </div>
            <div>
              <Label className="mb-1 block">Titulo</Label>
              <Input value={video.title} onChange={(e) => setVideo({ ...video, title: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Descripcion</Label>
              <Textarea
                rows={2}
                value={video.description}
                onChange={(e) => setVideo({ ...video, description: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block">ID o URL de YouTube</Label>
              <Input
                placeholder="Mo1ri6aCWCA"
                value={video.youtubeId}
                onChange={(e) => setVideo({ ...video, youtubeId: e.target.value })}
              />
            </div>
            <ImageUpload
              label="Imagen de portada (opcional; si no, se usa la miniatura de YouTube)"
              value={video.imageUrl}
              onChange={(url) => setVideo({ ...video, imageUrl: url })}
            />
            <SaveButton pending={pending} />
          </form>
        </Card>
      </TabsContent>

      {/* CONTACTO */}
      <TabsContent value="contact">
        <Card className="space-y-4 p-4">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => saveContactAction(contact))
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block">Correo</Label>
                <Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">Telefono</Label>
                <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">WhatsApp (solo numeros)</Label>
                <Input
                  value={contact.whatsappNumber}
                  onChange={(e) => setContact({ ...contact, whatsappNumber: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1 block">Ubicacion</Label>
                <Input
                  value={contact.location}
                  onChange={(e) => setContact({ ...contact, location: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1 block">Instagram</Label>
                <Input
                  value={contact.instagram}
                  onChange={(e) => setContact({ ...contact, instagram: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1 block">Facebook</Label>
                <Input
                  value={contact.facebook}
                  onChange={(e) => setContact({ ...contact, facebook: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1 block">TikTok</Label>
                <Input value={contact.tiktok} onChange={(e) => setContact({ ...contact, tiktok: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">YouTube</Label>
                <Input value={contact.youtube} onChange={(e) => setContact({ ...contact, youtube: e.target.value })} />
              </div>
            </div>
            <SaveButton pending={pending} />
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
