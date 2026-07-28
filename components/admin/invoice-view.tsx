"use client"

import { useRef, useState } from "react"
import type { Invoice, InvoiceItem, SiteSettings } from "@/lib/data"
import { InvoiceTemplate } from "@/components/admin/invoice-template"
import { Button } from "@/components/ui/button"
import { Printer, Download, Share2, Loader2 } from "lucide-react"
import { invoiceElementToPdfBlob, downloadBlob, shareInvoicePdf, invoicePdfName } from "@/lib/pdf-client"
import { toast } from "sonner"

const SHARE_MESSAGE = "Hola, te envio la factura correspondiente al servicio de DJ. Gracias."

export function InvoiceView({
  invoice,
  items,
  settings,
}: {
  invoice: Invoice
  items: InvoiceItem[]
  settings: SiteSettings
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<"pdf" | "share" | null>(null)

  const filename = invoicePdfName(invoice.number, invoice.status)

  async function handleDownload() {
    if (!sheetRef.current) return
    setBusy("pdf")
    try {
      const blob = await invoiceElementToPdfBlob(sheetRef.current)
      downloadBlob(blob, filename)
      toast.success("PDF generado")
    } catch (e) {
      toast.error("No se pudo generar el PDF")
      console.error("[factura] Error al generar el PDF:", e instanceof Error ? e.message : e)
    } finally {
      setBusy(null)
    }
  }

  async function handleShare() {
    if (!sheetRef.current) return
    setBusy("share")
    try {
      const blob = await invoiceElementToPdfBlob(sheetRef.current)
      const result = await shareInvoicePdf(blob, filename, SHARE_MESSAGE)
      if (result === "shared") {
        toast.success("Factura compartida")
      } else if (result === "cancelled") {
        // El usuario cerro la hoja de compartir: no hay nada que avisar.
      } else if (result === "downloaded-copied") {
        toast.success("Tu navegador no permite compartir archivos. Hemos descargado el PDF y copiado el mensaje.")
      } else {
        toast.success("Tu navegador no permite compartir archivos. Hemos descargado el PDF.")
      }
    } catch (e) {
      toast.error("No se pudo compartir la factura")
      console.error("[factura] Error al compartir:", e instanceof Error ? e.message : e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={busy !== null}>
          {busy === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Descargar PDF
        </Button>
        <Button size="sm" onClick={handleShare} disabled={busy !== null}>
          {busy === "share" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
          Compartir
        </Button>
      </div>

      {/*
        El escalado para movil va en el contenedor, no en el elemento
        referenciado: html2canvas captura los estilos del propio nodo, asi que
        si el ref llevara el transform el PDF saldria reducido desde el movil.
      */}
      <div className="overflow-x-auto rounded-lg bg-neutral-200 p-4 print:overflow-visible print:bg-transparent print:p-0">
        <div className="origin-top scale-[0.55] sm:scale-75 md:scale-90 lg:scale-100 print:scale-100">
          <div ref={sheetRef}>
            <InvoiceTemplate invoice={invoice} items={items} settings={settings} />
          </div>
        </div>
      </div>
    </div>
  )
}
