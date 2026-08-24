import { getSettings, getJob } from "@/lib/data"
import { toDateInput } from "@/lib/date-only"
import { InvoiceEditor } from "@/components/admin/invoice-editor"

export const dynamic = "force-dynamic"

export default async function NuevaFacturaPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>
}) {
  const { job: jobParam } = await searchParams
  const settings = await getSettings()

  // Prefill opcional desde un trabajo.
  let prefill = null
  const jobId = jobParam ? Number.parseInt(jobParam, 10) : NaN
  if (Number.isFinite(jobId)) {
    const job = await getJob(jobId)
    if (job) {
      // Se factura a la empresa cuando existe; si no, al cliente particular.
      // El nombre de contacto se conserva en la descripcion de la linea.
      const billTo = job.company?.trim() || job.client_name
      const contact =
        job.company?.trim() && job.client_name ? `Contacto: ${job.client_name}` : ""
      const place = [job.venue, job.address].filter(Boolean).join(" · ")
      const description = [job.description, contact, place].filter(Boolean).join("\n")
      const jobDate = toDateInput(job.job_date)

      prefill = {
        jobId: job.id,
        clientName: billTo,
        clientAddress: job.address,
        issueDate: jobDate,
        lines: [
          {
            serviceDate: jobDate,
            concept: job.concept || "Servicio de DJ",
            description,
            quantity: 1,
            unitPriceMinor: job.amount_minor,
          },
        ],
      }
    }
  }

  return (
    <InvoiceEditor
      mode="create"
      settings={settings}
      prefill={prefill}
      initialValues={{
        vatPercent: settings.billing.vatPercent,
        irpfPercent: settings.billing.irpfPercent,
        currency: settings.billing.currency,
      }}
    />
  )
}
