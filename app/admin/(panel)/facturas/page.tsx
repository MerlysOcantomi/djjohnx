import { getInvoices } from "@/lib/data"
import { InvoicesList } from "@/components/admin/invoices-list"

export const dynamic = "force-dynamic"

export default async function FacturasPage() {
  const invoices = await getInvoices()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturas</h1>
          <p className="text-sm text-muted-foreground">Crea, emite, cobra y comparte tus facturas.</p>
        </div>
      </div>
      <InvoicesList invoices={invoices} />
    </div>
  )
}
