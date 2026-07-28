"use client"

import { useRef, useState, useTransition } from "react"
import type { SiteSettings } from "@/lib/data"
import {
  saveProfileAction,
  saveBillingAction,
  saveAppearanceAction,
  exportBackupAction,
  inspectBackupAction,
  importBackupAction,
  type BackupSummary,
} from "@/app/actions/settings"
import { ImageUpload } from "@/components/admin/image-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Loader2, Download, Upload, Save } from "lucide-react"
import { toast } from "sonner"

const LOGO_SIZE_CLASS = { small: "h-10", medium: "h-16", large: "h-24" } as const

function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message
  return "No se pudo guardar. Revisa los datos e intentalo de nuevo."
}

export function SettingsManager({ initial }: { initial: SiteSettings }) {
  const [profile, setProfile] = useState(initial.profile)
  const [billing, setBilling] = useState({
    ...initial.billing,
    nextNumberText: String(initial.billing.nextNumber ?? 1),
    vatText: String(initial.billing.vatPercent ?? 21),
    irpfText: String(initial.billing.irpfPercent ?? 15),
  })
  const [logo, setLogo] = useState(initial.logo)
  const [accentColor, setAccentColor] = useState(initial.appearance.accentColor ?? "")
  const [pending, startTransition] = useTransition()

  // Respaldo
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<{ raw: unknown; summary: BackupSummary } | null>(null)

  function run(fn: () => Promise<unknown>, okMsg: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(okMsg)
      } catch (e) {
        toast.error(errorMessage(e))
      }
    })
  }

  /* ----------------------------- Respaldo ----------------------------- */

  function exportBackup() {
    startTransition(async () => {
      try {
        const data = await exportBackupAction()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `djjohnx-copia-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
        toast.success("Copia de seguridad descargada")
      } catch (e) {
        toast.error(errorMessage(e))
      }
    })
  }

  function pickFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      startTransition(async () => {
        try {
          const raw = JSON.parse(String(reader.result))
          const summary = await inspectBackupAction(raw)
          setPendingImport({ raw, summary })
        } catch {
          toast.error("El archivo no es una copia de seguridad valida de DJ JOHNX.")
        }
      })
    }
    reader.readAsText(file)
  }

  function confirmImport() {
    if (!pendingImport) return
    const raw = pendingImport.raw
    setPendingImport(null)
    startTransition(async () => {
      try {
        const added = await importBackupAction(raw)
        toast.success(
          `Importado: ${added.sections} secciones, ${added.services} servicios, ${added.events} eventos, ${added.gallery_images} fotos.`,
        )
      } catch (e) {
        toast.error(errorMessage(e))
      }
    })
  }

  return (
    <Tabs defaultValue="perfil" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
        <TabsTrigger value="perfil">Perfil</TabsTrigger>
        <TabsTrigger value="facturacion">Facturación</TabsTrigger>
        <TabsTrigger value="apariencia">Apariencia</TabsTrigger>
        <TabsTrigger value="respaldo">Respaldo</TabsTrigger>
      </TabsList>

      {/* ============================ PERFIL ============================ */}
      <TabsContent value="perfil" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre artístico" required>
            <Input
              value={profile.artistName}
              onChange={(e) => setProfile({ ...profile, artistName: e.target.value })}
            />
          </Field>
          <Field label="Nombre legal">
            <Input
              value={profile.legalName}
              onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
            />
          </Field>
          <Field label="NIF/CIF">
            <Input value={profile.taxId} onChange={(e) => setProfile({ ...profile, taxId: e.target.value })} />
          </Field>
          <Field label="Teléfono">
            <Input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </Field>
          <Field label="Correo electrónico">
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </Field>
          <Field label="Dirección">
            <Input
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
          </Field>
          <Field label="Código postal">
            <Input
              inputMode="numeric"
              value={profile.postalCode}
              onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
            />
          </Field>
          <Field label="Ciudad">
            <Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
          </Field>
          <Field label="Provincia">
            <Input
              value={profile.province}
              onChange={(e) => setProfile({ ...profile, province: e.target.value })}
            />
          </Field>
          <Field label="País">
            <Input
              value={profile.country}
              onChange={(e) => setProfile({ ...profile, country: e.target.value })}
            />
          </Field>
        </div>
        <SaveBar pending={pending} onClick={() => run(() => saveProfileAction(profile), "Perfil guardado")} />
      </TabsContent>

      {/* ========================= FACTURACIÓN ========================= */}
      <TabsContent value="facturacion" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prefijo de factura" hint="Solo letras y números. Ejemplo: DJ → DJ-2026-001">
            <Input
              value={billing.prefix}
              onChange={(e) => setBilling({ ...billing, prefix: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Siguiente número" hint="Solo se aplica si aún no se ha emitido ninguna factura este año.">
            <Input
              inputMode="numeric"
              value={billing.nextNumberText}
              onChange={(e) => setBilling({ ...billing, nextNumberText: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
          <Field label="Moneda">
            <Input value={billing.currency} disabled />
          </Field>
          <Field label="Plazo de pago">
            <Input
              value={billing.paymentTerms}
              placeholder="Ej.: 30 días desde la emisión"
              onChange={(e) => setBilling({ ...billing, paymentTerms: e.target.value })}
            />
          </Field>
          <Field label="IVA por defecto (%)">
            <Input
              inputMode="decimal"
              value={billing.vatText}
              onChange={(e) => setBilling({ ...billing, vatText: e.target.value })}
            />
          </Field>
          <Field label="IRPF por defecto (%)">
            <Input
              inputMode="decimal"
              value={billing.irpfText}
              onChange={(e) => setBilling({ ...billing, irpfText: e.target.value })}
            />
          </Field>
          <Field label="Titular de la cuenta">
            <Input
              value={billing.bankHolder}
              onChange={(e) => setBilling({ ...billing, bankHolder: e.target.value })}
            />
          </Field>
          <Field label="IBAN">
            <Input value={billing.iban} onChange={(e) => setBilling({ ...billing, iban: e.target.value })} />
          </Field>
          <Field label="BIC/SWIFT">
            <Input value={billing.bic} onChange={(e) => setBilling({ ...billing, bic: e.target.value })} />
          </Field>
        </div>
        <Field label="Condiciones">
          <Textarea
            rows={3}
            value={billing.conditions}
            onChange={(e) => setBilling({ ...billing, conditions: e.target.value })}
          />
        </Field>
        <Field label="Notas">
          <Textarea
            rows={3}
            value={billing.notes}
            onChange={(e) => setBilling({ ...billing, notes: e.target.value })}
          />
        </Field>
        <SaveBar
          pending={pending}
          onClick={() =>
            run(
              () =>
                saveBillingAction({
                  prefix: billing.prefix,
                  nextNumber: Number(billing.nextNumberText || "1"),
                  currency: billing.currency || "EUR",
                  vatPercent: Number(String(billing.vatText).replace(",", ".") || "0"),
                  irpfPercent: Number(String(billing.irpfText).replace(",", ".") || "0"),
                  paymentTerms: billing.paymentTerms,
                  conditions: billing.conditions,
                  notes: billing.notes,
                  bankHolder: billing.bankHolder,
                  iban: billing.iban,
                  bic: billing.bic,
                }),
              "Datos de facturación guardados",
            )
          }
        />
      </TabsContent>

      {/* ========================== APARIENCIA ========================== */}
      <TabsContent value="apariencia" className="space-y-6">
        <ImageUpload
          label="Logo (se usa en las facturas y en el PDF)"
          value={logo.url}
          aspect="aspect-[3/1]"
          onChange={(url) => setLogo({ ...logo, url })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Posición del logo">
            <Select
              value={logo.position}
              onValueChange={(v) => setLogo({ ...logo, position: v as typeof logo.position })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Derecha</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tamaño del logo">
            <Select value={logo.size} onValueChange={(v) => setLogo({ ...logo, size: v as typeof logo.size })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Pequeño</SelectItem>
                <SelectItem value="medium">Mediano</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Color de acento" hint="Formato hexadecimal, por ejemplo #d4af37. Vacío usa el color por defecto.">
            <div className="flex gap-2">
              <Input
                value={accentColor}
                placeholder="#d4af37"
                onChange={(e) => setAccentColor(e.target.value)}
              />
              <input
                type="color"
                aria-label="Selector de color de acento"
                className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                value={/^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : "#d4af37"}
                onChange={(e) => setAccentColor(e.target.value)}
              />
            </div>
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="watermark">Marca de agua</Label>
              <p className="text-xs text-muted-foreground">Logo centrado y tenue detrás de la factura.</p>
            </div>
            <Switch
              id="watermark"
              checked={logo.watermark}
              onCheckedChange={(v) => setLogo({ ...logo, watermark: v })}
            />
          </div>
        </div>

        {/* Vista previa */}
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">Vista previa</p>
          <div
            className={`flex ${
              logo.position === "center" ? "justify-center" : logo.position === "right" ? "justify-end" : "justify-start"
            }`}
          >
            {logo.url ? (

              <img
                src={logo.url}
                alt="Logo de DJ JOHNX"
                className={`${LOGO_SIZE_CLASS[logo.size]} w-auto object-contain`}
              />
            ) : (
              <span className="text-sm text-neutral-400">Sin logo</span>
            )}
          </div>
          <p
            className={`mt-4 text-2xl font-bold tracking-wide text-neutral-900 ${
              logo.position === "center" ? "text-center" : logo.position === "right" ? "text-left" : "text-right"
            }`}
          >
            FACTURA
          </p>
        </div>

        <SaveBar
          pending={pending}
          onClick={() =>
            run(
              () =>
                saveAppearanceAction({
                  logoUrl: logo.url,
                  logoPosition: logo.position,
                  logoSize: logo.size,
                  watermark: logo.watermark,
                  accentColor,
                }),
              "Apariencia guardada",
            )
          }
        />
      </TabsContent>

      {/* =========================== RESPALDO =========================== */}
      <TabsContent value="respaldo" className="space-y-4">
        <div className="rounded-lg border border-border p-4">
          <h3 className="font-semibold">Exportar copia de seguridad</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Descarga un archivo JSON con la configuración, secciones, servicios, eventos, trabajos, facturas y
            los datos de las fotografías. No incluye los archivos de imagen, solo sus URL.
          </p>
          <Button className="mt-3" onClick={exportBackup} disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exportar copia de seguridad
          </Button>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h3 className="font-semibold">Importar copia de seguridad</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Se añade únicamente lo que falte. No se sobrescribe ni se borra nada de lo que ya tienes, así que
            puedes importar el mismo archivo dos veces sin duplicar contenido.
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
          >
            <Upload className="mr-2 h-4 w-4" />
            Seleccionar archivo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) pickFile(f)
              e.target.value = ""
            }}
          />
        </div>
      </TabsContent>

      <AlertDialog open={Boolean(pendingImport)} onOpenChange={(o) => !o && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Importar esta copia de seguridad?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>El archivo contiene:</p>
                <ul className="list-inside list-disc">
                  <li>{pendingImport?.summary.sections ?? 0} secciones</li>
                  <li>{pendingImport?.summary.services ?? 0} servicios</li>
                  <li>{pendingImport?.summary.events ?? 0} eventos</li>
                  <li>{pendingImport?.summary.gallery_images ?? 0} fotografías</li>
                  <li>{pendingImport?.summary.jobs ?? 0} trabajos</li>
                  <li>{pendingImport?.summary.invoices ?? 0} facturas</li>
                </ul>
                <p>Solo se añadirá lo que no exista todavía. No se borrará nada.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>Importar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function SaveBar({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <Button onClick={onClick} disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Guardar cambios
      </Button>
    </div>
  )
}
