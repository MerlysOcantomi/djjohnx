import { getServices } from "@/lib/data"
import { ServicesManager } from "@/components/admin/services-manager"

export const dynamic = "force-dynamic"

export default async function ServiciosPage() {
  const services = await getServices(false)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Servicios</h1>
        <p className="text-sm text-muted-foreground">
          Crea y ordena los servicios que se muestran en tu web.
        </p>
      </div>
      <ServicesManager initialServices={services} />
    </div>
  )
}
