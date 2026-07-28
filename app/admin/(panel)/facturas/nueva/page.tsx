import { getSettings, getJob } from "@/lib/data"
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
      prefill = {
        jobId: job.id,
        clientName: job.client_name,
        issueDate: job.job_date,
        lines: [
          {
            serviceDate: job.job_date,
            concept: job.concept || "Servicio de DJ",
            description: job.description || "",
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
