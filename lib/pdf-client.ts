"use client"

/**
 * Genera un PDF A4 a partir del nodo de la plantilla de factura.
 * Usa html2canvas-pro (soporta colores oklch) + jsPDF. Solo cliente.
 * Devuelve un Blob para compartir/descargar.
 */
export async function invoiceElementToPdfBlob(el: HTMLElement): Promise<Blob> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro"),
  ])

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  })

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
  const pageWidth = 210
  const pageHeight = 297
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  const imgData = canvas.toDataURL("image/jpeg", 0.92)

  if (imgHeight <= pageHeight) {
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight)
  } else {
    // Varias paginas: recortar verticalmente.
    let remaining = imgHeight
    let position = 0
    while (remaining > 0) {
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
      remaining -= pageHeight
      if (remaining > 0) {
        pdf.addPage()
        position -= pageHeight
      }
    }
  }

  return pdf.output("blob")
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export type ShareResult = "shared" | "cancelled" | "downloaded" | "downloaded-copied"

/**
 * Comparte el PDF con la hoja nativa del sistema cuando el navegador lo
 * permite. Si no, descarga el archivo y copia el mensaje al portapapeles
 * para poder pegarlo en WhatsApp o en el correo.
 */
export async function shareInvoicePdf(blob: Blob, filename: string, message: string): Promise<ShareResult> {
  const file = new File([blob], filename, { type: "application/pdf" })
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean
  }

  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename, text: message })
      return "shared"
    } catch (e) {
      // Si el usuario cierra la hoja de compartir no hay que descargar nada.
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled"
    }
  }

  downloadBlob(blob, filename)

  try {
    await navigator.clipboard.writeText(message)
    return "downloaded-copied"
  } catch {
    return "downloaded"
  }
}

// El nombre del archivo vive en lib/invoice-number.ts para poder probarlo
// sin depender del navegador.
export { invoicePdfFilename as invoicePdfName } from "@/lib/invoice-number"
