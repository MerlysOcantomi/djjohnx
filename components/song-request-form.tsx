"use client"

import { FormEvent, useEffect, useState, useTransition } from "react"
import { Loader2, Music2, Send, CheckCircle2 } from "lucide-react"
import { submitFreeSongRequest } from "@/app/actions/song-requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function getDeviceId() {
  const key = "djjohnx-song-device"
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.localStorage.setItem(key, created)
  return created
}

export function SongRequestForm() {
  const [requesterName, setRequesterName] = useState("")
  const [songTitle, setSongTitle] = useState("")
  const [artistName, setArtistName] = useState("")
  const [note, setNote] = useState("")
  const [website, setWebsite] = useState("")
  const [deviceId, setDeviceId] = useState("")
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setDeviceId(getDeviceId())
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    setSuccess(false)

    startTransition(async () => {
      try {
        const result = await submitFreeSongRequest({
          requesterName,
          songTitle,
          artistName,
          note,
          deviceId: deviceId || crypto.randomUUID(),
          website,
        })

        if (!result.ok) {
          setMessage(result.message)
          return
        }

        setSuccess(true)
        setMessage("Peticion enviada. DJ JOHNX ya puede verla en su panel.")
        setSongTitle("")
        setArtistName("")
        setNote("")
      } catch {
        setMessage("No se pudo enviar la peticion. Intentalo de nuevo.")
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-5 shadow-2xl backdrop-blur sm:p-7">
      <div className="space-y-2">
        <Label htmlFor="requesterName">Tu nombre o apodo</Label>
        <Input
          id="requesterName"
          value={requesterName}
          onChange={(e) => setRequesterName(e.target.value)}
          placeholder="Ej. Laura"
          maxLength={80}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="songTitle">Cancion</Label>
        <Input
          id="songTitle"
          value={songTitle}
          onChange={(e) => setSongTitle(e.target.value)}
          placeholder="Nombre de la cancion"
          maxLength={160}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="artistName">Artista <span className="text-muted-foreground">(opcional)</span></Label>
        <Input
          id="artistName"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          placeholder="Nombre del artista"
          maxLength={160}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Nota <span className="text-muted-foreground">(opcional)</span></Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Dedicatoria, version concreta, remix..."
          maxLength={240}
          rows={3}
          aiCorrection={false}
        />
      </div>

      <div className="hidden" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending || !deviceId}>
        {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
        {pending ? "Enviando..." : "Pedir esta cancion"}
      </Button>

      {message && (
        <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${success ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
          {success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <Music2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <p>{message}</p>
        </div>
      )}
    </form>
  )
}
