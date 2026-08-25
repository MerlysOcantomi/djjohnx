"use client"

import { FormEvent, useEffect, useState, useTransition } from "react"
import { CheckCircle2, Loader2, Music2, Search, Send } from "lucide-react"
import { submitFreeSongRequest } from "@/app/actions/song-requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type SpotifyTrack = {
  id: string
  uri: string
  name: string
  artist: string
  artworkUrl: string | null
  spotifyUrl: string
}

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
  const [searching, setSearching] = useState(false)
  const [spotifyUnavailable, setSpotifyUnavailable] = useState(false)
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)

  useEffect(() => {
    setDeviceId(getDeviceId())
  }, [])

  useEffect(() => {
    const query = songTitle.trim()
    if (selectedTrack || query.length < 2) {
      setResults([])
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        if (response.status === 503) {
          setSpotifyUnavailable(true)
          setResults([])
          return
        }
        if (!response.ok) throw new Error("search failed")
        const data = await response.json() as { tracks?: SpotifyTrack[] }
        setSpotifyUnavailable(false)
        setResults(data.tracks || [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [songTitle, selectedTrack])

  function selectTrack(track: SpotifyTrack) {
    setSelectedTrack(track)
    setSongTitle(track.name)
    setArtistName(track.artist)
    setResults([])
  }

  function changeSongTitle(value: string) {
    setSongTitle(value)
    if (selectedTrack && value !== selectedTrack.name) setSelectedTrack(null)
  }

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
          spotifyTrackId: selectedTrack?.id,
          spotifyTrackUri: selectedTrack?.uri,
          spotifyTrackUrl: selectedTrack?.spotifyUrl,
          spotifyArtworkUrl: selectedTrack?.artworkUrl || undefined,
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
        setSelectedTrack(null)
        setResults([])
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
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="songTitle"
            value={songTitle}
            onChange={(e) => changeSongTitle(e.target.value)}
            placeholder="Busca una cancion en Spotify"
            maxLength={160}
            className="pl-9"
            autoComplete="off"
            required
          />
          {searching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {selectedTrack && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            {selectedTrack.artworkUrl ? (
              <img src={selectedTrack.artworkUrl} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-white/5"><Music2 className="h-5 w-5" /></div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{selectedTrack.name}</p>
              <p className="truncate text-xs text-muted-foreground">{selectedTrack.artist} · Spotify</p>
            </div>
          </div>
        )}

        {!selectedTrack && results.length > 0 && (
          <div className="max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-background shadow-2xl">
            {results.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => selectTrack(track)}
                className="flex w-full items-center gap-3 border-b border-white/5 p-3 text-left transition hover:bg-white/5 last:border-b-0"
              >
                {track.artworkUrl ? (
                  <img src={track.artworkUrl} alt="" className="h-12 w-12 rounded object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-white/5"><Music2 className="h-5 w-5" /></div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{track.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {spotifyUnavailable && (
          <p className="text-xs text-muted-foreground">La busqueda de Spotify aun no esta conectada. Puedes escribir la cancion manualmente.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="artistName">Artista <span className="text-muted-foreground">(opcional)</span></Label>
        <Input
          id="artistName"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          placeholder="Nombre del artista"
          maxLength={160}
          readOnly={Boolean(selectedTrack)}
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
