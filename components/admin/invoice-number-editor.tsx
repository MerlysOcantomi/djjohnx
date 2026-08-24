"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateInvoiceNumber } from "@/app/actions/invoice-number-edit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function InvoiceNumberEditor({
  invoiceId,
  initialNumber,
  status,
}: {
  invoiceId: number
  initialNumber: string
  status: string
}) {
  const router = useRouter()
  const [number, setNumber] = useState(initialNumber)
  const [pending, startTransition] = useTransition()

  if (status === "draft") return null

  const changed = number.trim() !== initialNumber

  function save() {
    const next = number.trim()
    if (!next) {
      toast.error("El numero de factura es obligatorio")
      return
    }

    startTransition(async () => {
      try {
        const result = await updateInvoiceNumber({ invoiceId, number: next })
        setNumber(result.number)
        toast.success(`Numero de factura actualizado: ${result.number}`)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el numero de factura")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Pencil className="h-4 w-4" /> Numero de factura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="invoice-number">Numero</Label>
          <Input
            id="invoice-number"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            maxLength={64}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Puedes corregir el numero de una factura ya emitida. No se permiten numeros duplicados.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={save} disabled={pending || !changed}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar numero
        </Button>
      </CardContent>
    </Card>
  )
}
