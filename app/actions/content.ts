"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdminSession } from "@/lib/auth"
import { saveSection, getSettings, saveSettings } from "@/lib/data"

function revalidatePublic() {
  revalidatePath("/")
  revalidatePath("/admin/pagina")
}

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https?:\/\//.test(v) || v.startsWith("/") || v.startsWith("#"), {
    message: "URL no valida",
  })
  .optional()

/* ---------------- Portada (hero) ---------------- */

const heroSchema = z.object({
  title: z.string().trim().max(200),
  subtitle: z.string().trim().max(200),
  description: z.string().trim().max(2000),
  image_url: optionalUrl,
  backgroundPosition: z.string().trim().max(60).optional(),
  button_text: z.string().trim().max(60).optional(),
  button_link: optionalUrl,
  visible: z.boolean(),
})

export async function saveHeroAction(input: z.infer<typeof heroSchema>) {
  await requireAdminSession()
  const data = heroSchema.parse(input)
  await saveSection({
    id: "hero",
    title: data.title,
    subtitle: data.subtitle,
    content: data.description,
    image_url: data.image_url || null,
    button_text: data.button_text || null,
    button_link: data.button_link || null,
    extra: { backgroundPosition: data.backgroundPosition || "center 55%" },
    sort_order: 0,
    visible: data.visible,
  })
  revalidatePublic()
  return { ok: true }
}

/* ---------------- Sobre John (about) ---------------- */

const aboutSchema = z.object({
  title: z.string().trim().max(200),
  description: z.string().trim().max(5000),
  image_url: optionalUrl,
  visible: z.boolean(),
  stats: z
    .array(z.object({ number: z.string().trim().max(20), label: z.string().trim().max(60) }))
    .max(8)
    .optional(),
})

export async function saveAboutAction(input: z.infer<typeof aboutSchema>) {
  await requireAdminSession()
  const data = aboutSchema.parse(input)
  await saveSection({
    id: "about",
    title: data.title,
    content: data.description,
    image_url: data.image_url || null,
    extra: { stats: data.stats || [] },
    sort_order: 1,
    visible: data.visible,
  })
  revalidatePublic()
  return { ok: true }
}

/* ---------------- Video ---------------- */

const videoSchema = z.object({
  title: z.string().trim().max(200),
  description: z.string().trim().max(2000),
  youtubeId: z.string().trim().max(40),
  visible: z.boolean(),
})

export async function saveVideoAction(input: z.infer<typeof videoSchema>) {
  await requireAdminSession()
  const data = videoSchema.parse(input)
  // Aceptar tanto ID como URL completa
  let id = data.youtubeId
  const m = id.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/)
  if (m) id = m[1]
  await saveSection({
    id: "video",
    title: data.title,
    content: data.description,
    extra: { youtubeId: id },
    sort_order: 3,
    visible: data.visible,
  })
  revalidatePublic()
  return { ok: true }
}

/* ---------------- Contacto (en settings.contact) ---------------- */

const contactSchema = z.object({
  email: z.string().trim().max(200),
  phone: z.string().trim().max(60),
  whatsappNumber: z.string().trim().max(30),
  location: z.string().trim().max(120),
  instagram: z.string().trim().max(300),
  facebook: z.string().trim().max(300),
  tiktok: z.string().trim().max(300),
  youtube: z.string().trim().max(300),
})

export async function saveContactAction(input: z.infer<typeof contactSchema>) {
  await requireAdminSession()
  const data = contactSchema.parse(input)
  const settings = await getSettings()
  settings.contact = { ...settings.contact, ...data }
  await saveSettings(settings)
  revalidatePublic()
  return { ok: true }
}
