"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Invoice, InvoiceItem, SiteSettings } from "@/lib/data"
import { calculateInvoice, type DiscountType } from "@/lib/invoice-calc"
import { formatMoneyMinor, eurosToMinor, minorToNumber, parseEsNumber } from "@/lib/format"
import { saveInvoice, issueInvoice, type InvoiceInput } from "@/app/actions/invoices"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, Save, FileCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"

type EditorLine = {
  id?: number
  serviceDate: string
  concept: string
  description: string
  quantity: string
  unitPrice: string // euros en texto es-ES
}

type Prefill = {
  jobId?: number
  clientName?: string | null
  clientAddress?: string | null
  issueDate?: string | null
  lines?: { serviceDate: string | null; concept: string; description: string; quantity: number; unitPriceMinor: number }[]
} | null

function today() {
  return new Date().toISOString().slice(0, 10)
}

function emptyLine(): EditorLine {
  return { serviceDate: "", concept: "", description: "", quantity: "1", unitPrice: "" }
}

export function InvoiceEditor({
  mode,
  settings,
  invoice,
  items,
  prefill,
  initialValues,
}: {
  mode: "create" | "edit"
  settings: SiteSettings
  invoice?: Invoice
  items?: InvoiceItem[]
  prefill?: Prefill
  initialValues?: { vatPercent: number; irpfPercent: number; currency: string }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [issueDate, setIssueDate] = useState(invoice?.issue_date ?? prefill?.issueDate ?? today())
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? "")
  const [jobId] = useState<number | null>(invoice?.job_id ?? prefill?.jobId ?? null)
  const currency = invoice?.currency ?? initialValues?.currency ?? "EUR"

  const [client, setClient] = useState({
    name: invoice?.client_name ?? prefill?.clientName ?? "",
    taxId: invoice?.client_tax_id ?? "",
    address: invoice?.client_address ?? prefill?.clientAddress ?? "",
    postalCode: invoice?.client_postal_code ?? "",
    city: invoice?.client_city ?? "",
    province: invoice?.client_province ?? "",
    country: invoice?.client_country ?? "",
    email: invoice?.client_email ?? "",
    phone: invoice?.client_phone ?? "",
  })

  const [lines, setLines] = useState<EditorLine[]>(() => {
    if (items && items.length) {
      return items.map((it) => ({
        id: it.id,
        serviceDate: it.service_date ?? "",
        concept: it.concept,
        description: it.description ?? "",
        quantity: String(it.quantity).replace(".", ","),
        unitPrice: minorToNumber(it.unit_price_minor).toString().replace(".", ","),
      }))
    }
    if (prefill?.lines?.length) {
      return prefill.lines.map((l) => ({
        serviceDate: l.serviceDate ?? "",
        concept: l.concept,
        description: l.description,
        quantity: String(l.quantity).replace(".", ","),
        unitPrice: minorToNumber(l.unitPriceMinor).toString().replace(".", ","),
      }))
    }
    return [emptyLine()]
  })

  const [discountType, setDiscountType] = useState<DiscountType>((invoice?.discount_type as DiscountType) || "none")
  const [discountPercent, setDiscountPercent] = useState(String(invoice?.discount_percent ?? 0).replace(".", ","))
  const [discountFixed, setDiscountFixed] = useState(
    invoice ? minorToNumber(invoice.discount_value_minor).toString().replace(".", ",") : "",
  )

  const [vatEnabled, setVatEnabled] = useState(invoice?.vat_enabled ?? true)
  const [vatPercent, setVatPercent] = useState(String(invoice?.vat_percent ?? initialValues?.vatPercent ?? 21).replace(".", ","))
  const [irpfEnabled, setIrpfEnabled] = useState(invoice?.irpf_enabled ?? false)
  const [irpfPercent, setIrpfPercent] = useState(String(invoice?.irpf_percent ?? initialValues?.irpfPercent ?? 15).replace(".", ","))

  const [payment, setPayment] = useState({
    method: invoice?.payment_method ?? "Transferencia bancaria",
    holder: invoice?.payment_holder ?? settings.billing.bankHolder ?? "",
    iban: invoice?.payment_iban ?? settings.billing.iban ?? "",
    bic: invoice?.payment_bic ?? settings.billing.bic ?? "",
    reference: invoice?.payment_reference ?? "",
    terms: invoice?.payment_terms ?? settings.billing.paymentTerms ?? "",
    clientNotes: invoice?.client_notes ?? settings.billing.notes ?? "",
    internalNotes: invoice?.internal_notes ?? "",
  })

  // Motor de calculo en vivo (misma fuente de verdad que el servidor).
  const calc = useMemo(() => {
    return calculateInvoice({
      lines: lines.map((l) => ({ quantity: parseEsNumber(l.quantity), unitPriceMinor: eurosToMinor(l.unitPrice) })),
      discountType,
      discountPercent: parseEsNumber(discountPercent),
      discountValueMinor: eurosToMinor(discountFixed),
      vatEnabled,
      vatPercent: parseEsNumber(vatPercent),
      irpfEnabled,
      irpfPercent: parseEsNumber(irpfPercent),
    })
  }, [lines, discountType, discountPercent, discountFixed, vatEnabled, vatPercent, irpfEnabled, irpfPercent])

  function updateLine(idx: number, patch: Partial<EditorLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }
  function removeLine(idx: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  function buildInput(status: Invoice["status"]): InvoiceInput {
    return {
      id: invoice?.id,
      status: status as InvoiceInput["status"],
      issueDate,
      dueDate,
      currency,
      jobId,
      client: {
        name: client.name,
        taxId: client.taxId,
        address: client.address,
        postalCode: client.postalCode,
        city: client.city,
        province: client.province,
        country: client.country,
        email: client.email,
        phone: client.phone,
      },
      discountType,
      discountPercent: parseEsNumber(discountPercent),
      discountValueMinor: eurosToMinor(discountFixed),
      vatEnabled,
      vatPercent: parseEsNumber(vatPercent),
      irpfEnabled,
      irpfPercent: parseEsNumber(irpfPercent),
      payment,
      lines: lines
        .filter((l) => l.concept.trim() !== "")
        .map((l) => ({
          id: l.id,
          serviceDate: l.serviceDate || null,
          concept: l.concept.trim(),
          description: l.description || null,
          quantity: parseEsNumber(l.quantity),
          unitPriceMinor: eurosToMinor(l.unitPrice),
        })),
    }
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await saveInvoice(buildInput(invoice?.status ?? "draft"))
        toast.success("Borrador guardado")
        router.push(`/admin/facturas/${res.id}`)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar")
      }
    })
  }

  function handleIssue() {
    if (!client.name.trim()) {
      toast.error("Indica el nombre del cliente para emitir")
      return
    }
    if (lines.filter((l) => l.concept.trim()).length === 0) {
      toast.error("Anade al menos una linea con concepto")
      return
    }
    startTransition(async () => {
      try {
        const res = await issueInvoice(buildInput("issued"))
        toast.success(`Factura emitida: ${res.number}`)
        router.push(`/admin/facturas/${res.id}`)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo emitir")
      }
    })
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/facturas">
            <ArrowLeft className="mr-2 h-4 w-4" /> Facturas
          </Link>
        </Button>
        <h1 className="text-lg font-bold">
          {mode === "create" ? "Nueva factura" : `Editar ${invoice?.number}`}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Datos de factura */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos de la factura</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Fecha de emision</Label>
                <Input type="date" value={issueDate ?? ""} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Vencimiento</Label>
                <Input type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Nombre o razon social</Label>
                <Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>NIF / CIF</Label>
                <Input value={client.taxId} onChange={(e) => setClient({ ...client, taxId: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Telefono</Label>
                <Input value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Direccion</Label>
                <Input value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Codigo postal</Label>
                <Input value={client.postalCode} onChange={(e) => setClient({ ...client, postalCode: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Ciudad</Label>
                <Input value={client.city} onChange={(e) => setClient({ ...client, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Provincia</Label>
                <Input value={client.province} onChange={(e) => setClient({ ...client, province: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Pais</Label>
                <Input value={client.country} onChange={(e) => setClient({ ...client, country: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Correo</Label>
                <Input type="email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          {/* Lineas */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Conceptos</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addLine}>
                <Plus className="mr-1 h-4 w-4" /> Anadir dia o concepto
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {lines.map((line, idx) => {
                const lineTotal = calc.lineTotalsMinor[idx] ?? 0
                return (
                  <div key={idx} className="rounded-lg border p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Fecha del servicio</Label>
                        <Input
                          type="date"
                          value={line.serviceDate}
                          onChange={(e) => updateLine(idx, { serviceDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Concepto</Label>
                        <Input
                          value={line.concept}
                          placeholder="Sesion DJ, alquiler equipo..."
                          onChange={(e) => updateLine(idx, { concept: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Descripcion (opcional)</Label>
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(idx, { description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          inputMode="decimal"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Precio unitario (€)</Label>
                        <Input
                          inputMode="decimal"
                          value={line.unitPrice}
                          placeholder="0,00"
                          onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total linea: <span className="font-semibold text-foreground">{formatMoneyMinor(lineTotal, currency)}</span>
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeLine(idx)}
                        aria-label="Eliminar linea"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Impuestos y descuento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impuestos y descuento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Descuento</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin descuento</SelectItem>
                    <SelectItem value="percent">Porcentaje</SelectItem>
                    <SelectItem value="fixed">Importe fijo</SelectItem>
                  </SelectContent>
                </Select>
                {discountType === "percent" && (
                  <Input inputMode="decimal" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="% descuento" />
                )}
                {discountType === "fixed" && (
                  <Input inputMode="decimal" value={discountFixed} onChange={(e) => setDiscountFixed(e.target.value)} placeholder="Importe en €" />
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Incluir IVA</Label>
                  <p className="text-xs text-muted-foreground">Se suma a la base imponible</p>
                </div>
                <Switch checked={vatEnabled} onCheckedChange={setVatEnabled} />
              </div>
              {vatEnabled && (
                <Input inputMode="decimal" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} placeholder="% IVA (21)" />
              )}

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Aplicar retencion de IRPF</Label>
                  <p className="text-xs text-muted-foreground">Se resta del total a cobrar</p>
                </div>
                <Switch checked={irpfEnabled} onCheckedChange={setIrpfEnabled} />
              </div>
              {irpfEnabled && (
                <div className="flex gap-2">
                  {["15", "7"].map((p) => (
                    <Button key={p} type="button" variant={irpfPercent === p ? "default" : "outline"} size="sm" onClick={() => setIrpfPercent(p)}>
                      {p}%
                    </Button>
                  ))}
                  <Input inputMode="decimal" value={irpfPercent} onChange={(e) => setIrpfPercent(e.target.value)} placeholder="% IRPF" className="w-28" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pago */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informacion de pago</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Metodo de pago</Label>
                <Select value={payment.method} onValueChange={(v) => setPayment({ ...payment, method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Transferencia bancaria", "Efectivo", "Bizum", "PayPal", "Otro"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Titular</Label>
                <Input value={payment.holder} onChange={(e) => setPayment({ ...payment, holder: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>IBAN</Label>
                <Input value={payment.iban} onChange={(e) => setPayment({ ...payment, iban: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>BIC / SWIFT</Label>
                <Input value={payment.bic} onChange={(e) => setPayment({ ...payment, bic: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Condiciones</Label>
                <Textarea rows={2} value={payment.terms} onChange={(e) => setPayment({ ...payment, terms: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Notas para el cliente</Label>
                <Textarea rows={2} value={payment.clientNotes} onChange={(e) => setPayment({ ...payment, clientNotes: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Notas internas (no salen en la factura)</Label>
                <Textarea rows={2} value={payment.internalNotes} onChange={(e) => setPayment({ ...payment, internalNotes: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumen pegajoso */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatMoneyMinor(calc.subtotalMinor, currency)} />
              {calc.discountMinor > 0 && <Row label="Descuento" value={`- ${formatMoneyMinor(calc.discountMinor, currency)}`} />}
              <Row label="Base imponible" value={formatMoneyMinor(calc.baseMinor, currency)} bold />
              {vatEnabled && <Row label={`IVA (${vatPercent}%)`} value={`+ ${formatMoneyMinor(calc.vatMinor, currency)}`} />}
              {vatEnabled && <Row label="Total antes de retencion" value={formatMoneyMinor(calc.totalBeforeIrpfMinor, currency)} />}
              {irpfEnabled && <Row label={`IRPF (${irpfPercent}%)`} value={`- ${formatMoneyMinor(calc.irpfMinor, currency)}`} />}
              <div className="mt-3 flex items-center justify-between border-t pt-3 text-base font-bold">
                <span>Total a cobrar</span>
                <span className="tabular-nums">{formatMoneyMinor(calc.totalMinor, currency)}</span>
              </div>

              <div className="space-y-2 pt-4">
                <Button type="button" variant="outline" className="w-full bg-transparent" onClick={handleSave} disabled={pending}>
                  {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar borrador
                </Button>
                <Button type="button" className="w-full" onClick={handleIssue} disabled={pending}>
                  {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                  Emitir factura
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
