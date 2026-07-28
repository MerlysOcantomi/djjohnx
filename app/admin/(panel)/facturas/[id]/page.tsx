import { notFound } from "next/navigation"
import Link from "next/link"
import { getSettings, getInvoice, getInvoiceItems } from "@/lib/data"
import { InvoiceView } from "@/components/admin/invoice-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function VerFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoiceId = Number.parseInt(id, 10)
  if (!Number.isFinite(invoiceId)) notFound()

  const [invoice, items, settings] = await Promise.all([
    getInvoice(invoiceId),
    getInvoiceItems(invoiceId),
    getSettings(),
  ])
  if (!invoice) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/facturas">
            <ArrowLeft className="mr-2 h-4 w-4" /> Facturas
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/facturas/${invoice.id}/editar`}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Link>
        </Button>
      </div>
      <InvoiceView invoice={invoice} items={items} settings={settings} />
    </div>
  )
}
