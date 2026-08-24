import type { Invoice, InvoiceItem, SiteSettings } from "@/lib/data"
import { formatMoneyMinor, formatQty, formatDateEs } from "@/lib/format"

/**
 * Plantilla profesional de factura en A4.
 * Se usa tanto en pantalla (vista previa / impresion) como base del PDF.
 * Solo estilos inline + clases utilitarias seguras para impresion.
 */

const LOGO_SIZES: Record<string, number> = { small: 56, medium: 84, large: 120 }

type InvoiceIssuerSnapshot = {
  issuer_artist_name?: string | null
  issuer_legal_name?: string | null
  issuer_tax_id?: string | null
  issuer_address?: string | null
  issuer_postal_code?: string | null
  issuer_city?: string | null
  issuer_province?: string | null
  issuer_country?: string | null
  issuer_phone?: string | null
  issuer_email?: string | null
}

export function InvoiceTemplate({
  invoice,
  items,
  settings,
}: {
  invoice: Invoice
  items: InvoiceItem[]
  settings: SiteSettings
}) {
  const { profile, billing, logo } = settings
  const storedInvoice = invoice as Invoice & InvoiceIssuerSnapshot
  const issuer = {
    artistName: storedInvoice.issuer_artist_name || profile.artistName,
    legalName: storedInvoice.issuer_legal_name || profile.legalName,
    taxId: storedInvoice.issuer_tax_id || profile.taxId,
    address: storedInvoice.issuer_address || profile.address,
    postalCode: storedInvoice.issuer_postal_code || profile.postalCode,
    city: storedInvoice.issuer_city || profile.city,
    province: storedInvoice.issuer_province || profile.province,
    country: storedInvoice.issuer_country || profile.country,
    phone: storedInvoice.issuer_phone || profile.phone,
    email: storedInvoice.issuer_email || profile.email,
  }
  const isDraft = invoice.status === "draft"
  const paymentHolder = isDraft ? invoice.payment_holder || billing.bankHolder : invoice.payment_holder
  const paymentIban = isDraft ? invoice.payment_iban || billing.iban : invoice.payment_iban
  const paymentBic = isDraft ? invoice.payment_bic || billing.bic : invoice.payment_bic
  const paymentTerms = isDraft ? invoice.payment_terms || billing.paymentTerms : invoice.payment_terms
  const clientNotes = isDraft ? invoice.client_notes || billing.notes : invoice.client_notes
  const currency = invoice.currency || billing.currency || "EUR"
  const logoUrl = logo.url
  const logoPosition = logo.position || "left"
  const logoHeight = LOGO_SIZES[logo.size] ?? 84
  const showWatermark = logo.watermark && logoUrl

  const headerAlign =
    logoPosition === "center" ? "items-center text-center flex-col" : logoPosition === "right" ? "flex-row-reverse" : "flex-row"

  return (
    <div className="invoice-sheet relative mx-auto bg-white text-neutral-900" data-invoice-sheet>
      {showWatermark && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0.05 }}
        >
          <img src={logoUrl || "/placeholder.svg"} alt="" style={{ width: "60%", maxWidth: 420 }} />
        </div>
      )}

      <div className="relative" style={{ padding: "24mm 18mm" }}>
        {/* Encabezado */}
        <header className={`flex justify-between gap-6 ${headerAlign}`}>
          <div>
            {logoUrl ? (
              <img
                src={logoUrl || "/placeholder.svg"}
                alt={issuer.artistName || "Logo"}
                style={{ height: logoHeight, width: "auto", objectFit: "contain" }}
              />
            ) : (
              <div className="text-2xl font-black tracking-tight">{issuer.artistName || "DJ JOHNX"}</div>
            )}
          </div>
          <div className={logoPosition === "right" ? "text-left" : "text-right"}>
            <h1 className="text-3xl font-black tracking-tight">FACTURA</h1>
            <p className="mt-1 text-sm font-semibold">{invoice.number}</p>
            {invoice.issue_date && (
              <p className="text-xs text-neutral-600">Fecha: {formatDateEs(invoice.issue_date)}</p>
            )}
            {invoice.due_date && (
              <p className="text-xs text-neutral-600">Vencimiento: {formatDateEs(invoice.due_date)}</p>
            )}
          </div>
        </header>

        {/* Emisor y cliente */}
        <section className="mt-8 grid grid-cols-2 gap-6 text-xs">
          <div>
            <p className="mb-1 font-semibold uppercase tracking-wide text-neutral-500">De</p>
            <p className="font-semibold">{issuer.legalName || issuer.artistName}</p>
            {issuer.taxId && <p>NIF/CIF: {issuer.taxId}</p>}
            {issuer.address && <p>{issuer.address}</p>}
            {(issuer.postalCode || issuer.city) && (
              <p>
                {issuer.postalCode} {issuer.city}
                {issuer.province ? `, ${issuer.province}` : ""}
              </p>
            )}
            {issuer.country && <p>{issuer.country}</p>}
            {issuer.phone && <p>Tel: {issuer.phone}</p>}
            {issuer.email && <p>{issuer.email}</p>}
          </div>
          <div>
            <p className="mb-1 font-semibold uppercase tracking-wide text-neutral-500">Cliente</p>
            <p className="font-semibold">{invoice.client_name || "-"}</p>
            {invoice.client_tax_id && <p>NIF/CIF: {invoice.client_tax_id}</p>}
            {invoice.client_address && <p>{invoice.client_address}</p>}
            {(invoice.client_postal_code || invoice.client_city) && (
              <p>
                {invoice.client_postal_code} {invoice.client_city}
                {invoice.client_province ? `, ${invoice.client_province}` : ""}
              </p>
            )}
            {invoice.client_country && <p>{invoice.client_country}</p>}
            {invoice.client_email && <p>{invoice.client_email}</p>}
            {invoice.client_phone && <p>Tel: {invoice.client_phone}</p>}
          </div>
        </section>

        {/* Lineas */}
        <table className="mt-8 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-neutral-800 text-left">
              <th className="py-2 pr-2 font-semibold">Fecha</th>
              <th className="py-2 pr-2 font-semibold">Concepto</th>
              <th className="py-2 pr-2 text-right font-semibold">Cant.</th>
              <th className="py-2 pr-2 text-right font-semibold">Precio</th>
              <th className="py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-neutral-200 align-top">
                <td className="py-2 pr-2 whitespace-nowrap">{formatDateEs(it.service_date)}</td>
                <td className="py-2 pr-2">
                  <span className="font-medium">{it.concept}</span>
                  {it.description && <span className="block text-neutral-500">{it.description}</span>}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatQty(it.quantity)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatMoneyMinor(it.unit_price_minor, currency)}</td>
                <td className="py-2 text-right tabular-nums">{formatMoneyMinor(it.total_minor, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <section className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-xs totals-block">
            <Row label="Subtotal" value={formatMoneyMinor(invoice.subtotal_minor, currency)} />
            {invoice.discount_minor > 0 && (
              <Row label="Descuento" value={`- ${formatMoneyMinor(invoice.discount_minor, currency)}`} />
            )}
            <Row label="Base imponible" value={formatMoneyMinor(invoice.base_minor, currency)} bold />
            {invoice.vat_enabled && (
              <Row label={`IVA (${invoice.vat_percent}%)`} value={`+ ${formatMoneyMinor(invoice.vat_minor, currency)}`} />
            )}
            {invoice.vat_enabled && (
              <Row label="Total antes de retencion" value={formatMoneyMinor(invoice.base_minor + invoice.vat_minor, currency)} />
            )}
            {invoice.irpf_enabled && (
              <Row label={`IRPF (${invoice.irpf_percent}%)`} value={`- ${formatMoneyMinor(invoice.irpf_minor, currency)}`} />
            )}
            <div className="mt-2 flex items-center justify-between border-t-2 border-neutral-800 pt-2 text-base font-black">
              <span>TOTAL A COBRAR</span>
              <span className="tabular-nums">{formatMoneyMinor(invoice.total_minor, currency)}</span>
            </div>
          </div>
        </section>

        {/* Pago y notas */}
        <footer className="mt-8 grid grid-cols-2 gap-6 text-xs">
          <div>
            {(invoice.payment_method || paymentIban) && (
              <>
                <p className="mb-1 font-semibold uppercase tracking-wide text-neutral-500">Forma de pago</p>
                {invoice.payment_method && <p>{invoice.payment_method}</p>}
                {paymentHolder && <p>Titular: {paymentHolder}</p>}
                {paymentIban && <p>IBAN: {paymentIban}</p>}
                {paymentBic && <p>BIC: {paymentBic}</p>}
                {invoice.payment_reference && <p>Ref: {invoice.payment_reference}</p>}
              </>
            )}
          </div>
          <div>
            {paymentTerms && (
              <>
                <p className="mb-1 font-semibold uppercase tracking-wide text-neutral-500">Condiciones</p>
                <p>{paymentTerms}</p>
              </>
            )}
            {clientNotes && <p className="mt-2 text-neutral-600">{clientNotes}</p>}
          </div>
        </footer>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-neutral-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
