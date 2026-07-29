import { getSettings } from "@/lib/data"
import { SettingsManager } from "@/components/admin/settings-manager"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Configuración",
  robots: { index: false, follow: false },
}

export default async function ConfiguracionPage() {
  const settings = await getSettings()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Tus datos, la facturación, el logo y la copia de seguridad.
        </p>
      </div>
      <SettingsManager initial={settings} />
    </div>
  )
}
