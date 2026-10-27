import { describe, expect, it } from "vitest"
import { emptyClientDraft, searchClientLookups, type ClientLookup } from "@/lib/client-model"

const clients: ClientLookup[] = [
  {
    id: 1, kind: "company", display_name: "Hotel Águilas",
    legal_name: "Costa Azul SL", contact_name: "María", tax_id: "B12345678",
    address: "Calle del Mar 1", postal_code: "30880", city: "Águilas",
    province: "Murcia", country: "España", email: null, phone: "600123456",
  },
  {
    id: 2, kind: "person", display_name: "Pedro Sánchez",
    legal_name: null, contact_name: null, tax_id: null, address: null,
    postal_code: null, city: "Alicante", province: null, country: null,
    email: null, phone: null,
  },
]

describe("buscador de clientes", () => {
  it("busca nombres sin tildes", () => {
    expect(searchClientLookups(clients, "AGUILAS").map((c) => c.id)).toEqual([1])
  })
  it("busca empresa, contacto y CIF", () => {
    expect(searchClientLookups(clients, "costa azul").map((c) => c.id)).toEqual([1])
    expect(searchClientLookups(clients, "maria").map((c) => c.id)).toEqual([1])
    expect(searchClientLookups(clients, "B12345678").map((c) => c.id)).toEqual([1])
  })
  it("no autoselecciona una ficha ni crea IBAN imaginarios", () => {
    expect(searchClientLookups(clients, "")).toEqual([])
    expect(emptyClientDraft().bankIban).toBe("")
  })
})
