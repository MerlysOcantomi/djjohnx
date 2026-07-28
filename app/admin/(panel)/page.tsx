import Link from "next/link"
import { getDashboardStats, getUpcomingJobs, getGalleryImages } from "@/lib/data"
import { formatEurFromMinor, formatDateEs } from "@/lib/format"
import { jobStatusLabel } from "@/lib/status"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, FileText, ImageIcon, Globe, CalendarClock, Wallet } from "lucide-react"

export const dynamic = "force-dynamic"

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-foreground/60">{label}</p>
      <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-foreground/50">{hint}</p>}
    </Card>
  )
}

export default async function DashboardPage() {
  const [stats, upcoming, latestPhotos] = await Promise.all([
    getDashboardStats(),
    getUpcomingJobs(5),
    getGalleryImages(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-foreground">Resumen</h1>
        <p className="text-sm text-foreground/60">Panel de control de DJ JOHNX</p>
      </div>

      {/* Accesos rapidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button asChild className="h-auto flex-col gap-2 py-4">
          <Link href="/admin/trabajos/nuevo">
            <Briefcase className="h-5 w-5" />
            <span className="text-xs">Nuevo trabajo</span>
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-auto flex-col gap-2 py-4">
          <Link href="/admin/facturas/nueva">
            <FileText className="h-5 w-5" />
            <span className="text-xs">Nueva factura</span>
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-auto flex-col gap-2 py-4">
          <Link href="/admin/fotos">
            <ImageIcon className="h-5 w-5" />
            <span className="text-xs">Subir fotos</span>
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-auto flex-col gap-2 py-4">
          <Link href="/admin/pagina">
            <Globe className="h-5 w-5" />
            <span className="text-xs">Editar pagina</span>
          </Link>
        </Button>
      </div>

      {/* Estadisticas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total cobrado" value={formatEurFromMinor(stats.collectedMinor)} />
        <StatCard label="Pendiente de cobrar" value={formatEurFromMinor(stats.pendingMinor)} />
        <StatCard label="Trabajos pendientes" value={String(stats.jobsPending)} />
        <StatCard label="Trabajos realizados" value={String(stats.jobsCompleted)} />
        <StatCard label="Confirmados" value={String(stats.jobsConfirmed)} />
        <StatCard label="Trabajos totales" value={String(stats.jobsTotal)} />
        <StatCard label="Facturas borrador" value={String(stats.invoicesDraft)} />
        <StatCard label="Facturas pendientes" value={String(stats.invoicesPending)} />
      </div>

      {/* Proximos trabajos */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Proximos trabajos</h2>
        </div>
        {upcoming.length === 0 ? (
          <Card className="p-6 text-center text-sm text-foreground/60">
            No hay trabajos proximos.{" "}
            <Link href="/admin/trabajos/nuevo" className="text-primary underline">
              Crear uno
            </Link>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((job) => (
              <Link key={job.id} href={`/admin/trabajos/${job.id}`}>
                <Card className="flex items-center justify-between p-4 transition-colors hover:bg-foreground/5">
                  <div>
                    <p className="font-semibold text-foreground">{job.client_name}</p>
                    <p className="text-sm text-foreground/60">
                      {formatDateEs(job.job_date)} {job.venue ? `· ${job.venue}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{formatEurFromMinor(job.amount_minor)}</p>
                    <p className="text-xs text-foreground/50">{jobStatusLabel(job.job_status)}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Ultimas fotos */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Ultimas fotografias</h2>
        </div>
        {latestPhotos.length === 0 ? (
          <Card className="p-6 text-center text-sm text-foreground/60">Aun no hay fotos.</Card>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {latestPhotos.slice(0, 6).map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.blob_url || "/placeholder.svg"}
                alt={img.alt_text || "Foto"}
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
