"use client"
import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { searchClientLookups, type ClientLookup } from "@/lib/client-model"

type Props = {
  clients: ClientLookup[]
  value: string
  selectedId: number | null
  onChange: (value: string) => void
  onSelect: (client: ClientLookup) => void
}
export function ClientPicker({ clients, value, selectedId, onChange, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const matches = useMemo(() => searchClientLookups(clients, value), [clients, value])
  return <div className="relative">
    <Input autoComplete="off" role="combobox" aria-autocomplete="list"
      aria-expanded={open && matches.length > 0} value={value}
      onChange={e => { onChange(e.target.value); setOpen(true) }}
      onFocus={() => setOpen(true)}
      onKeyDown={e => {
        if (e.key === "Escape") setOpen(false)
        if (e.key === "Enter" && open && matches.length) {
          e.preventDefault(); onSelect(matches[0]); setOpen(false)
        }
      }}
      placeholder="Nombre, empresa o NIF" />
    {selectedId && <p className="text-xs text-emerald-600">Ficha de cliente vinculada</p>}
    {open && value.trim() && matches.length > 0 &&
      <div role="listbox" className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded border bg-popover p-1 shadow-lg">
        {matches.map(c => <button type="button" role="option" aria-selected={selectedId === c.id}
          key={c.id} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
          onClick={() => { onSelect(c); setOpen(false) }}>
          <span className="block font-medium">{c.display_name}</span>
          <span className="text-xs text-muted-foreground">{[c.legal_name, c.tax_id, c.city].filter(Boolean).join(" · ")}</span>
        </button>)}
      </div>}
  </div>
}