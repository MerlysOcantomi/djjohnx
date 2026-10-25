export type ClientKind = "person" | "company"

export type Client = {
  id: number
  kind: ClientKind
  display_name: string
  legal_name: string | null
  contact_name: string | null
  tax_id: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  province: string | null
  country: string | null
  email: string | null
  phone: string | null
  bank_holder: string | null
  bank_iban: string | null
  bank_bic: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Los formularios de trabajos y facturas nunca reciben los IBAN de los clientes.
export type ClientLookup = Pick<
  Client,
  "id" | "kind" | "display_name" | "legal_name" | "contact_name" | "tax_id" |
  "address" | "postal_code" | "city" | "province" | "country" | "email" | "phone"
>

export type ClientDraft = {
  id?: number
  kind: ClientKind
  displayName: string
  legalName: string
  contactName: string
  taxId: string
  address: string
  postalCode: string
  city: string
  province: string
  country: string
  email: string
  phone: string
  bankHolder: string
  bankIban: string
  bankBic: string
  notes: string
}

export function emptyClientDraft(): ClientDraft {
  return {
    kind: "person", displayName: "", legalName: "", contactName: "",
    taxId: "", address: "", postalCode: "", city: "", province: "",
    country: "España", email: "", phone: "", bankHolder: "",
    bankIban: "", bankBic: "", notes: "",
  }
}

export function clientToDraft(c: Client): ClientDraft {
  return {
    id: c.id, kind: c.kind, displayName: c.display_name,
    legalName: c.legal_name ?? "", contactName: c.contact_name ?? "",
    taxId: c.tax_id ?? "", address: c.address ?? "",
    postalCode: c.postal_code ?? "", city: c.city ?? "",
    province: c.province ?? "", country: c.country ?? "",
    email: c.email ?? "", phone: c.phone ?? "",
    bankHolder: c.bank_holder ?? "", bankIban: c.bank_iban ?? "",
    bankBic: c.bank_bic ?? "", notes: c.notes ?? "",
  }
}

export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

export function searchClientLookups<T extends ClientLookup>(clients: T[], term: string): T[] {
  const needle = normalizeSearch(term)
  if (!needle) return []
  return clients.filter((client) =>
    [client.display_name, client.legal_name, client.contact_name, client.tax_id, client.city, client.phone]
      .some((value) => normalizeSearch(value ?? "").includes(needle))
  ).slice(0, 8)
}
