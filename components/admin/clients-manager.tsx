"use client"
import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { saveClient } from "@/app/actions/clients"
import { emptyClientDraft, clientToDraft, normalizeSearch, type Client, type ClientDraft } from "@/lib/client-model"

const fields: {key: keyof ClientDraft; label: string}[] = [
  {key:"displayName",label:"Nombre comercial o nombre completo"},
  {key:"legalName",label:"Razón social fiscal"},
  {key:"contactName",label:"Persona de contacto"},
  {key:"taxId",label:"NIF / CIF"},
  {key:"phone",label:"Teléfono"},
  {key:"email",label:"Correo electrónico"},
  {key:"address",label:"Dirección fiscal"},
  {key:"postalCode",label:"Código postal"},
  {key:"city",label:"Ciudad"},
  {key:"province",label:"Provincia"},
  {key:"country",label:"País"},
  {key:"bankHolder",label:"Titular de la cuenta DEL CLIENTE (privado)"},
  {key:"bankIban",label:"IBAN DEL CLIENTE (no se utiliza para cobrar facturas)"},
  {key:"bankBic",label:"BIC / SWIFT del cliente"},
]
export function ClientsManager({initialClients}:{initialClients:Client[]}) {
  const router = useRouter()
  const [selected,setSelected] = useState<ClientDraft|null>(null)
  const [query,setQuery] = useState("")
  const [mode,setMode] = useState<"manual"|"text"|"file">("manual")
  const [source,setSource] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending,start] = useTransition()
  const visible = useMemo(()=>initialClients.filter(c=>normalizeSearch([c.display_name,c.legal_name,c.tax_id,c.city].join(" ")).includes(normalizeSearch(query))),[initialClients,query])
  function extract() {
    start(async()=>{
      try {
        const form = new FormData()
        if(mode==="text") form.set("text",source)
        else if(fileRef.current?.files?.[0]) form.set("file",fileRef.current.files[0])
        else throw new Error("Selecciona un documento")
        const res=await fetch("/api/admin/client-extract",{method:"POST",body:form})
        const data=await res.json()
        if(!res.ok) throw new Error(data.error || "No se pudo leer")
        setSelected(prev => {
          const base = prev ?? emptyClientDraft()
          const detected = Object.fromEntries(Object.entries(data.client as Record<string, unknown>).filter(([, value]) => typeof value === "string" && value.trim() !== ""))
          return { ...base, ...detected, id: base.id }
        })
        toast.success("Datos detectados: revisa todos los campos antes de guardar")
      } catch(e) {toast.error(e instanceof Error?e.message:"No se pudo extraer")}
    })
  }
  function save() {
    if(!selected)return
    start(async()=>{
      try {
        await saveClient(selected)
        toast.success("Ficha guardada")
        setSelected(null); router.refresh()
      } catch(e) {toast.error(e instanceof Error?e.message:"Error al guardar")}
    })
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      <Input className="max-w-sm" placeholder="Buscar clientes" value={query} onChange={e=>setQuery(e.target.value)}/>
      <Button onClick={()=>{setSelected(emptyClientDraft());setMode("manual")}}>Nuevo cliente</Button>
    </div>
    {selected ? <Card>
      <CardHeader><CardTitle>{selected.id?"Editar cliente":"Nueva ficha de cliente"}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["manual","text","file"] as const).map(m=><Button key={m} variant={mode===m?"default":"outline"} size="sm" onClick={()=>setMode(m)}>{m==="manual"?"Manual":m==="text"?"Pegar texto":"PDF o foto"}</Button>)}
        </div>
        {mode==="text"&&<div className="space-y-2"><Label>Texto del cliente</Label>
          <Textarea value={source} onChange={e=>setSource(e.target.value)} rows={4} placeholder="Pega un mensaje, correo o datos de contrato"/>
          <Button type="button" disabled={pending||!source.trim()} onClick={extract}>Extraer datos del texto</Button></div>}
        {mode==="file"&&<div className="space-y-2"><Label>PDF, JPG, PNG o WebP (máximo 5 MB)</Label>
          <Input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" />
          <Button type="button" disabled={pending} onClick={extract}>Leer documento</Button></div>}
        <p className="text-xs text-muted-foreground">Los datos extraídos son propuestas. Verifica NIF, dirección e IBAN. Los archivos no se guardan en DJJOHNX.</p>
        <div className="space-y-1"><Label>Tipo</Label>
          <select className="w-full rounded-md border bg-background p-2" value={selected.kind} onChange={e=>setSelected({...selected,kind:e.target.value as ClientDraft["kind"]})}>
            <option value="person">Particular</option><option value="company">Empresa</option>
          </select></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(f=><div key={f.key} className="space-y-1"><Label>{f.label}</Label>
            <Input value={String(selected[f.key]??"")} onChange={e=>setSelected({...selected,[f.key]:e.target.value})}/></div>)}
        </div>
        <div className="space-y-1"><Label>Notas internas</Label>
          <Textarea value={selected.notes} onChange={e=>setSelected({...selected,notes:e.target.value})}/></div>
        <div className="flex gap-2"><Button disabled={pending||!selected.displayName.trim()} onClick={save}>Guardar ficha</Button>
          <Button variant="outline" onClick={()=>setSelected(null)}>Cancelar</Button></div>
      </CardContent>
    </Card>:<div className="grid gap-2">
      {visible.map(c=><button type="button" key={c.id} onClick={()=>setSelected(clientToDraft(c))}
        className="rounded-lg border p-4 text-left hover:bg-accent">
        <span className="block font-semibold">{c.display_name}</span>
        <span className="text-xs text-muted-foreground">{[c.legal_name,c.city,c.phone].filter(Boolean).join(" · ")}</span>
      </button>)}
      {!visible.length&&<p className="text-sm text-muted-foreground">No hay clientes en esta vista.</p>}
    </div>}
  </div>
}