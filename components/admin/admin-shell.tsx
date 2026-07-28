"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { logoutAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Globe,
  ImageIcon,
  Sparkles,
  CalendarDays,
  Briefcase,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react"

const NAV = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/pagina", label: "Pagina web", icon: Globe },
  { href: "/admin/fotos", label: "Fotos", icon: ImageIcon },
  { href: "/admin/servicios", label: "Servicios", icon: Sparkles },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/admin/trabajos", label: "Trabajos", icon: Briefcase },
  { href: "/admin/facturas", label: "Facturas", icon: FileText },
  { href: "/admin/configuracion", label: "Configuracion", icon: Settings },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href, item.exact)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/40 bg-card/40 p-4 lg:flex">
        <Link href="/admin" className="mb-8 block px-3 pt-2">
          <span className="text-2xl font-black tracking-wider text-gradient-gold">DJ JOHNX</span>
          <span className="mt-1 block text-xs text-foreground/50">Panel de administracion</span>
        </Link>
        <NavLinks pathname={pathname} />
        <form action={logoutAction} className="mt-auto pt-4">
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-foreground/70 hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesion
          </Button>
        </form>
      </aside>

      {/* Cabecera movil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/40 bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" className="text-xl font-black tracking-wider text-gradient-gold">
          DJ JOHNX
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      {/* Menu movil deslizante */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col border-r border-border/40 bg-card p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xl font-black tracking-wider text-gradient-gold">DJ JOHNX</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menu"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <form action={logoutAction} className="mt-auto pt-4">
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start gap-3 text-foreground/70 hover:text-foreground"
              >
                <LogOut className="h-5 w-5" />
                Cerrar sesion
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </div>
    </div>
  )
}
