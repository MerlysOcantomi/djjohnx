import { notFound } from "next/navigation"
import { getSettings, getInvoice, getInvoiceItems } from "@/lib/data"
import { InvoiceEditor } from "@/components/admin/invoice-editor"

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

  return <InvoiceEditor mode="edit" settings={settings} invoice={invoice} items={items} />
}
