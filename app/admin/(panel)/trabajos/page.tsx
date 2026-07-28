import { getJobs } from "@/lib/data"
import { JobsManager } from "@/components/admin/jobs-manager"

export const dynamic = "force-dynamic"

export default async function TrabajosPage() {
  const jobs = await getJobs()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Trabajos</h1>
        <p className="text-sm text-muted-foreground">
          Registra tus bolos, controla cobros y genera facturas.
        </p>
      </div>
      <JobsManager initialJobs={jobs} />
    </div>
  )
}
