"use client"

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"))

  await Promise.all(
    images.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          const done = () => resolve()
          img.addEventListener("load", done, { once: true })
          img.addEventListener("error", done, { once: true })
        })
      }

      if (typeof img.decode === "function") {
        try {
          await img.decode()
        } catch {
          // Si el navegador no puede decodificarla aqui, html2canvas intentara
          // renderizarla igualmente. No bloqueamos la generacion del PDF.
        }
      }
    }),
  )
}

/**
 * Crea una copia de la hoja A4 fuera del arbol visual de la vista previa.
 *
 * En movil la vista previa se muestra con CSS transform: scale(...). Aunque
 * el transform viva en un ancestro, html2canvas puede incorporarlo al calculo
 * de posiciones y comprimir las coordenadas sin escalar igual las fuentes.
 * El resultado son textos superpuestos y un PDF de varias paginas.
 *
 * Capturamos una copia sin transforms, con el ancho A4 real, para que el PDF
 * sea identico independientemente del tamano de pantalla desde el que se
 * genera o comparte.
 */
function createUnscaledInvoiceClone(el: HTMLElement) {
  const source =
    (el.matches("[data-invoice-sheet]") ? el : el.querySelector<HTMLElement>("[data-invoice-sheet]")) || el

  const host = document.createElement("div")
  host.setAttribute("data-pdf-capture-host", "")
  Object.assign(host.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "210mm",
    minHeight: "297mm",
    margin: "0",
    padding: "0",
    overflow: "visible",
    pointerEvents: "none",
    zIndex: "-2147483647",
    background: "#ffffff",
    transform: "none",
  })

  const clone = source.cloneNode(true) as HTMLElement
  Object.assign(clone.style, {
    width: "210mm",
    minHeight: "297mm",
    maxWidth: "none",
    margin: "0",
    transform: "none",
    transformOrigin: "top left",
    boxShadow: "none",
    background: "#ffffff",
  })

  host.appendChild(clone)
  document.body.appendChild(host)

  return { host, clone }
}

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

  // Espera a las fuentes web antes de medir/renderizar. En movil es frecuente
  // que el usuario pulse Compartir antes de que terminen de cargar.
  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const { host, clone } = createUnscaledInvoiceClone(el)

  try {
    await waitForImages(clone)

    const captureWidth = Math.ceil(clone.scrollWidth)
    const captureHeight = Math.ceil(clone.scrollHeight)

    if (captureWidth <= 0 || captureHeight <= 0) {
      throw new Error("La hoja de factura no tiene dimensiones validas para generar el PDF")
    }

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: captureWidth,
      height: captureHeight,
      windowWidth: captureWidth,
      windowHeight: captureHeight,
      scrollX: 0,
      scrollY: 0,
    })

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
    const pageWidth = 210
    const pageHeight = 297
    const imgWidth = pageWidth
    const rawImgHeight = (canvas.height * imgWidth) / canvas.width

    const imgData = canvas.toDataURL("image/jpeg", 0.94)

    // Una hoja A4 renderizada en pixeles puede diferir unas decimas por
    // redondeo. Evitamos crear una pagina vacia por esa diferencia.
    const singlePageToleranceMm = 1
    if (rawImgHeight <= pageHeight + singlePageToleranceMm) {
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, pageHeight)
    } else {
      const pageCount = Math.ceil(rawImgHeight / pageHeight)

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        if (pageIndex > 0) pdf.addPage()
        pdf.addImage(imgData, "JPEG", 0, -(pageIndex * pageHeight), imgWidth, rawImgHeight)
      }
    }

    return pdf.output("blob")
  } finally {
    host.remove()
  }
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
