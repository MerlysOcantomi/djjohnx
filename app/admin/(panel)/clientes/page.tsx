import { getClients } from "@/lib/clients-data"
import { ClientsManager } from "@/components/admin/clients-manager"
export const dynamic = "force-dynamic"
export default async function ClientesPage() {
 const clients=await getClients()
 return <div className="space-y-6">
   <div><h1 className="text-2xl font-bold">Clientes</h1><p className="text-sm text-muted-foreground">Fichas reutilizables para trabajos y facturas</p></div>
   <ClientsManager initialClients={clients} />
 </div>
}