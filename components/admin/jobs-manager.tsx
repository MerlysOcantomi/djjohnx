"use client"

import { useEffect, useState, useMemo, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { Job } from "@/lib/data"
import {
  saveJob,
  setJobStatus,
  registerPayment,
  markFullyPaid,
  deleteJob,
} from "@/app/actions/jobs"
import { formatEurFromMinor, formatDateEs } from "@/lib/format"
// Las constantes y tipos vienen de lib/status.ts, no de las Server Actions:
// en un modulo "use server" cualquier export se convierte en una referencia
// de servidor, asi que en el cliente no llegaria el array.
import { JOB_STATUS_KEYS, type JobStatus, jobStatusLabel, paymentStatusLabel } from "@/lib/status"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Pencil,
  Trash2,
  Euro,
  CheckCircle2,
  FileText,
  Loader2,
  CalendarDays,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/20 text-primary",
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-destructive/20 text-destructive",
}
const PAY_STYLE: Record<string, string> = {
  not_invoiced: "bg-muted text-muted-foreground",
  pending: "bg-destructive/20 text-destructive",
  partially_paid: "bg-amber-500/20 text-amber-400",
  paid: "bg-emerald-500/20 text-emerald-400",
}

type Draft = {
  id?: number
  jobDate: string
  clientName: string
  company: string
  venue: string
  address: string
  concept: string
  description: string
  startTime: string
  endTime: string
  amountEuros: string
  paidEuros: string
  jobStatus: JobStatus
  notes: string
}

function minorToEurStr(minor: number): string {
  return minor ? String(minor / 100).replace(".", ",") : ""
}

function toDraft(j?: Job): Draft {
  return {
    id: j?.id,
    jobDate: j?.job_date ? j.job_date.slice(0, 10) : "",
    clientName: j?.client_name ?? "",
    company: j?.company ?? "",
    venue: j?.venue ?? "",
    address: j?.address ?? "",
    concept: j?.concept ?? "",
    description: j?.description ?? "",
    startTime: j?.start_time ?? "",
    endTime: j?.end_time ?? "",
    amountEuros: minorToEurStr(j?.amount_minor ?? 0),
    paidEuros: minorToEurStr(j?.paid_minor ?? 0),
    jobStatus: (j?.job_status as Draft["jobStatus"]) ?? "pending",
    notes: j?.notes ?? "",
  }
}

export function JobsManager({ initialJobs }: { initialJobs: Job[] }) {
  const router = useRouter()
  // Los trabajos vienen del Server Component y se refrescan con router.refresh().
  // No se guardan en useState: eso congelaria la lista con los props iniciales
  // y los cambios no se verian hasta recargar la pagina a mano.
  const jobs = initialJobs
  const [filter, setFilter] = useState<string>("todos")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [open, setOpen] = useState(false)
  const [payFor, setPayFor] = useState<Job | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [deleting, setDeleting] = useState<Job | null>(null)
  const [isPending, startTransition] = useTransition()

  // El resumen enlaza aqui con ?nuevo=1 o ?editar=<id> para abrir el
  // formulario directamente, ya que los trabajos no tienen pagina propia.
  // El parametro se limpia nada mas consumirlo: si no, cada router.refresh()
  // posterior volveria a abrir el dialogo.
  const searchParams = useSearchParams()
  const nuevo = searchParams.get("nuevo")
  const editar = searchParams.get("editar")
  useEffect(() => {
    if (!nuevo && !editar) return

    if (nuevo) {
      setDraft(toDraft())
      setOpen(true)
    } else {
      const job = initialJobs.find((j) => j.id === Number(editar))
      if (job) {
        setDraft(toDraft(job))
        setOpen(true)
      }
    }
    // Al limpiar el parametro, la siguiente ejecucion del efecto sale por el
    // return de arriba. Por eso puede depender de initialJobs sin que cada
    // router.refresh() reabra el dialogo.
    router.replace("/admin/trabajos", { scroll: false })
  }, [nuevo, editar, router, initialJobs])

  const kpis = useMemo(() => {
    let collected = 0
    let pending = 0
    for (const j of jobs) {
      if (j.job_status === "cancelled") continue
      collected += j.paid_minor
      pending += Math.max(0, j.amount_minor - j.paid_minor)
    }
    return { collected, pending }
  }, [jobs])

  const visible = useMemo(() => {
    if (filter === "todos") return jobs
    if (filter === "por-cobrar") {
      return jobs.filter((j) => j.payment_status !== "paid" && j.job_status !== "cancelled")
    }
    return jobs.filter((j) => j.job_status === filter)
  }, [jobs, filter])

  function openNew() {
    setDraft(toDraft())
    setOpen(true)
  }
  function openEdit(j: Job) {
    setDraft(toDraft(j))
    setOpen(true)
  }

  function save() {
    if (!draft) return
    if (!draft.clientName.trim()) {
      toast.error("El cliente es obligatorio")
      return
    }
    startTransition(async () => {
      try {
        await saveJob(draft)
        toast.success("Trabajo guardado")
        setOpen(false)
        router.refresh()
      } catch {
        toast.error("No se pudo guardar")
      }
    })
  }

  function changeStatus(j: Job, status: JobStatus) {
    startTransition(async () => {
      await setJobStatus(j.id, status)
      router.refresh()
    })
  }

  function submitPayment() {
    if (!payFor || !payAmount.trim()) return
    const id = payFor.id
    startTransition(async () => {
      await registerPayment(id, payAmount)
      toast.success("Cobro registrado")
      setPayFor(null)
      setPayAmount("")
      router.refresh()
    })
  }

  function fullyPaid(j: Job) {
    startTransition(async () => {
      await markFullyPaid(j.id)
      toast.success("Marcado como cobrado")
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!deleting) return
    const id = deleting.id
    startTransition(async () => {
      await deleteJob(id)
      setDeleting(null)
      toast.success("Trabajo eliminado")
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Cobrado</p>
          <p className="text-xl font-bold text-emerald-400">{formatEurFromMinor(kpis.collected)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pendiente de cobro</p>
          <p className="text-xl font-bold text-primary">{formatEurFromMinor(kpis.pending)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo trabajo
        </Button>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="por-cobrar">Por cobrar</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
            <SelectItem value="completed">Realizados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay trabajos en esta vista.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((j) => {
            const outstanding = Math.max(0, j.amount_minor - j.paid_minor)
            return (
              <div key={j.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{j.client_name}</p>
                      <Badge className={STATUS_STYLE[(j.job_status || "").toLowerCase()] || ""}>
                        {jobStatusLabel(j.job_status)}
                      </Badge>
                      <Badge className={PAY_STYLE[j.payment_status] || ""}>{paymentStatusLabel(j.payment_status)}</Badge>
                    </div>
                    {j.concept && <p className="text-sm text-muted-foreground">{j.concept}</p>}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {j.job_date && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDateEs(j.job_date)}
                        </span>
                      )}
                      {(j.venue || j.address) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[j.venue, j.address].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatEurFromMinor(j.amount_minor)}</p>
                    {outstanding > 0 ? (
                      <p className="text-xs text-primary">Faltan {formatEurFromMinor(outstanding)}</p>
                    ) : (
                      <p className="text-xs text-emerald-400">Cobrado</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Select value={(j.job_status || "").toLowerCase()} onValueChange={(v) => changeStatus(j, v as JobStatus)}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_STATUS_KEYS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {jobStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {outstanding > 0 && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setPayFor(j)}>
                        <Euro className="mr-1 h-3.5 w-3.5" />
                        Registrar cobro
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => fullyPaid(j)}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Cobrado
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/admin/facturas/nueva?job=${j.id}`)}
                  >
                    <FileText className="mr-1 h-3.5 w-3.5" />
                    Facturar
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(j)} aria-label="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleting(j)} aria-label="Eliminar">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Crear / editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar trabajo" : "Nuevo trabajo"}</DialogTitle>
            <DialogDescription>
              Datos del bolo: cliente, lugar, horario, importe y estado. Solo el cliente es obligatorio.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Cliente</Label>
                  <Input value={draft.clientName} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Empresa</Label>
                  <Input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input type="date" value={draft.jobDate} onChange={(e) => setDraft({ ...draft, jobDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Estado</Label>
                  <Select value={draft.jobStatus} onValueChange={(v) => setDraft({ ...draft, jobStatus: v as Draft["jobStatus"] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_STATUS_KEYS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {jobStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Hora inicio</Label>
                  <Input value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} placeholder="23:00" />
                </div>
                <div className="space-y-1">
                  <Label>Hora fin</Label>
                  <Input value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} placeholder="04:00" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Concepto</Label>
                <Input value={draft.concept} onChange={(e) => setDraft({ ...draft, concept: e.target.value })} placeholder="Sesion DJ boda" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Lugar</Label>
                  <Input value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Direccion</Label>
                  <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Importe (€)</Label>
                  <Input value={draft.amountEuros} onChange={(e) => setDraft({ ...draft, amountEuros: e.target.value })} placeholder="500,00" />
                </div>
                <div className="space-y-1">
                  <Label>Ya cobrado (€)</Label>
                  <Input value={draft.paidEuros} onChange={(e) => setDraft({ ...draft, paidEuros: e.target.value })} placeholder="0,00" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notas</Label>
                <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={save} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar cobro */}
      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar cobro</DialogTitle>
            <DialogDescription>
              El importe se suma a lo ya cobrado y actualiza el estado de pago.
            </DialogDescription>
          </DialogHeader>
          {payFor && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Faltan por cobrar {formatEurFromMinor(Math.max(0, payFor.amount_minor - payFor.paid_minor))}.
              </p>
              <div className="space-y-1">
                <Label>Importe recibido (€)</Label>
                <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="200,00" autoFocus />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={submitPayment} disabled={isPending || !payAmount.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar trabajo</AlertDialogTitle>
            <AlertDialogDescription>Esta accion no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
