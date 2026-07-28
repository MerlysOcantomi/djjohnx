"use client"

import { useState } from "react"
import { Mail, Phone, MapPin, Instagram, Facebook, Youtube, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface ContactData {
  email?: string
  phone?: string
  whatsappNumber?: string
  location?: string
  instagram?: string
  facebook?: string
  youtube?: string
}

export function ContactSection({ data }: { data?: ContactData }) {
  const email = data?.email || "booking@djjohnx.com"
  const phone = data?.phone || "+34 672 176 890"
  const whatsapp = data?.whatsappNumber || "34672176890"
  const loc = data?.location || "Alicante, Espana"
  const instagram = data?.instagram || "https://www.instagram.com/dj_john_x/"
  const facebook = data?.facebook || "#"
  const youtube = data?.youtube || "https://youtu.be/Mo1ri6aCWCA"

  const socialLinks = [
    { icon: Instagram, href: instagram, label: "Instagram" },
    { icon: Facebook, href: facebook, label: "Facebook" },
    { icon: Youtube, href: youtube, label: "YouTube" },
  ]

  const contactInfo = [
    { icon: Mail, label: "Email", value: email },
    { icon: Phone, label: "WhatsApp", value: phone },
    { icon: MapPin, label: "Ubicacion", value: loc },
  ]
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Form submitted:", formData)
  }

  return (
    <section id="contacto" className="relative py-24 md:py-32">
      {/* Background Decoration */}
      <div className="absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-primary/5 blur-[150px]" />
      <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-secondary/5 blur-[150px]" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block text-sm font-medium uppercase tracking-[0.3em] text-primary">
            Hablemos
          </span>
          <h2 className="text-4xl font-black uppercase tracking-tight md:text-5xl lg:text-6xl">
            <span className="text-gradient-gold">CONTACTO & BOOKING</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-foreground/70">
            ¿Tienes un evento especial? Bodas, fiestas privadas, clubs o festivales. 
            Contáctame y hagamos de tu evento algo inolvidable.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Contact Info */}
          <div className="flex flex-col justify-center">
            {/* Contact Details */}
            <div className="mb-10 space-y-6">
              {contactInfo.map((item, index) => (
                <div
                  key={index}
                  className="glass-card flex items-center gap-4 rounded-xl p-4 transition-all hover:scale-[1.02] hover:glow-gold"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wide text-foreground/60">
                      {item.label}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* WhatsApp Button */}
            <Button
              size="lg"
              className="mb-10 w-fit bg-accent px-8 font-bold uppercase tracking-wide text-accent-foreground transition-all hover:bg-accent/90 hover:scale-105 glow-spotify"
              asChild
            >
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                <Phone className="mr-2 h-5 w-5" />
                Contactar por WhatsApp
              </a>
            </Button>

            {/* Social Links */}
            <div>
              <p className="mb-4 text-sm uppercase tracking-wide text-foreground/60">
                Sígueme en redes
              </p>
              <div className="flex gap-4">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    className="glass flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-primary/10 hover:text-primary"
                    aria-label={social.label}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="glass-card rounded-2xl p-6 md:p-8">
            <h3 className="mb-6 text-xl font-bold uppercase tracking-wide text-foreground">
              Envíame un mensaje
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm text-foreground/60">
                    Nombre *
                  </label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="border-border/50 bg-background/50 focus:border-primary"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm text-foreground/60">
                    Teléfono
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="border-border/50 bg-background/50 focus:border-primary"
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm text-foreground/60">
                  Email *
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-border/50 bg-background/50 focus:border-primary"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label htmlFor="message" className="mb-2 block text-sm text-foreground/60">
                  Mensaje *
                </label>
                <Textarea
                  id="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="border-border/50 bg-background/50 focus:border-primary"
                  placeholder="Cuéntame sobre tu evento..."
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary font-bold uppercase tracking-wide text-primary-foreground transition-all hover:bg-primary/90"
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar Mensaje
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
