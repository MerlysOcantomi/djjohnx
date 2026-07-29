"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import type { Invoice } from "@/lib/data"
import { formatMoneyMinor } from "@/lib/format"
import { invoiceStatusLabel } from "@/lib/status"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Plus, MoreVertical, FileText, Search } from "lucide-react"
import { setInvoiceStatus, duplicateInvoice, deleteInvoice } from "@/app/actions/invoices"
import { toast } from "sonner"

const statusVariant: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-primary/15 text-primary",
  sent: "bg-blue-500/15 text-blue-500",
  paid: "bg-emerald-500/15 text-emerald-500",
  cancelled: "bg-destructive/15 text-destructive",
}

export function InvoicesList({ invoices }: { invoices: Invoice[] }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [toDelete, setToDelete] = useState<Invoice | null>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (status !== "all" && inv.status !== status) return false
      if (query) {
        const q = query.toLowerCase()
        const hay = `${inv.number} ${inv.client_name ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [invoices, query, status])

  function runAction(fn: () => Promise<unknown>, okMsg: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(okMsg)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo completar la accion")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por numero o cliente"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="issued">Emitida</SelectItem>
              <SelectItem value="sent">Enviada</SelectItem>
              <SelectItem value="paid">Pagada</SelectItem>
              <SelectItem value="cancelled">Anulada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button asChild>
          <Link href="/admin/facturas/nueva">
            <Plus className="mr-2 h-4 w-4" /> Nueva factura
          </Link>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p>No hay facturas todavia.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link href={`/admin/facturas/${inv.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{inv.number}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusVariant[inv.status] ?? ""}`}>
                    {invoiceStatusLabel(inv.status)}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {inv.client_name || "Sin cliente"}
                  {inv.issue_date ? ` · ${inv.issue_date}` : ""}
                </p>
              </Link>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatMoneyMinor(inv.total_minor, inv.currency)}</p>
                  <p className="text-xs text-muted-foreground">
                    Base {formatMoneyMinor(inv.base_minor, inv.currency)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Acciones">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/facturas/${inv.id}`}>Ver</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/facturas/${inv.id}/editar`}>Editar</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runAction(() => duplicateInvoice(inv.id), "Factura duplicada")}>
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {inv.status !== "sent" && inv.status !== "cancelled" && (
                      <DropdownMenuItem onClick={() => runAction(() => setInvoiceStatus(inv.id, "sent"), "Marcada como enviada")}>
                        Marcar como enviada
                      </DropdownMenuItem>
                    )}
                    {inv.status !== "paid" && inv.status !== "cancelled" && (
                      <DropdownMenuItem onClick={() => runAction(() => setInvoiceStatus(inv.id, "paid"), "Marcada como pagada")}>
                        Marcar como pagada
                      </DropdownMenuItem>
                    )}
                    {inv.status !== "cancelled" && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => runAction(() => setInvoiceStatus(inv.id, "cancelled"), "Factura anulada")}
                      >
                        Anular
                      </DropdownMenuItem>
                    )}
                    {inv.status === "draft" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setToDelete(inv)}>
                          Eliminar borrador
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar borrador</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara el borrador {toDelete?.number}. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => {
                if (toDelete) runAction(() => deleteInvoice(toDelete.id), "Borrador eliminado")
                setToDelete(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
