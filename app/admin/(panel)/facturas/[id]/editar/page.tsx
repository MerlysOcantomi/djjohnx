import { notFound } from "next/navigation"
import { getSettings, getInvoice, getInvoiceItems } from "@/lib/data"
import { toDateInput } from "@/lib/date-only"
import { InvoiceEditor } from "@/components/admin/invoice-editor"
import { InvoiceNumberEditor } from "@/components/admin/invoice-number-editor"

export const dynamic = "force-dynamic"

export default async function EditarFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoiceId = Number.parseInt(id, 10)
  if (!Number.isFinite(invoiceId)) notFound()

  const [invoice, items, settings] = await Promise.all([
    getInvoice(invoiceId),
    getInvoiceItems(invoiceId),
    getSettings(),
  ])
  if (!invoice) notFound()

  const normalizedInvoice = {
    ...invoice,
    issue_date: toDateInput(invoice.issue_date),
    due_date: toDateInput(invoice.due_date),
  }
  const normalizedItems = items.map((item) => ({
    ...item,
    service_date: toDateInput(item.service_date),
  }))

  return (
    <div className="space-y-6">
      <InvoiceNumberEditor invoiceId={invoice.id} initialNumber={invoice.number} status={invoice.status} />
      <InvoiceEditor mode="edit" settings={settings} invoice={normalizedInvoice} items={normalizedItems} />
    </div>
  )
}
