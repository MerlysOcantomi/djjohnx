"use client"

import { useEffect, useRef, useState } from "react"
import { upload } from "@vercel/blob/client"
import { useRouter } from "next/navigation"
import { saveEventPoster } from "@/app/actions/poster"
import type { EventRow } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Download, ImagePlus, Loader2, Sparkles, UploadCloud } from "lucide-react"
import { toast } from "sonner"

type Style = "neon" | "minimal" | "smoke"
const PALETTES: Record<Style, { light: string; accent: string; bg1: string; bg2: string }> = {
  neon: { light: "#87beff", accent: "#b66bff", bg1: "#070b20", bg2: "#2a154f" },
  minimal: { light: "#ffffff", accent: "#93c5fd", bg1: "#080808", bg2: "#1e293b" },
  smoke: { light: "#b8aaff", accent: "#a855f7", bg1: "#070716", bg2: "#192b48" },
}
const W = 1080
const H = 1350

function lines(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, limit: number) {
  const words = value.trim().split(/\s+/).filter(Boolean)
  const result: string[] = []
  let line = ""
  for (const word of words) {
    if (!line || ctx.measureText(line + " " + word).width <= maxWidth) {
      line = line ? line + " " + word : word
    } else {
      result.push(line)
      line = word
    }
  }
  if (line) result.push(line)
  return result.slice(0, limit)
}
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

export function PosterStudio({ events, initialEvent }: { events: EventRow[]; initialEvent?: number }) {
  const initial = events.find((event) => event.id === initialEvent)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [style, setStyle] = useState<Style>("neon")
  const [title, setTitle] = useState(initial?.title || "DJ JOHNX")
  const [subtitle, setSubtitle] = useState(initial?.description || "FUSIÓN LATINA")
  const [when, setWhen] = useState([initial?.event_date?.slice(0, 10), initial?.event_time].filter(Boolean).join(" · ") || "SÁBADO · 23:00")
  const [venue, setVenue] = useState([initial?.venue, initial?.city].filter(Boolean).join(" · ") || "ALICANTE")
  const [concept, setConcept] = useState("Luces de un club moderno, público bailando y atmósfera nocturna elegante")
  const [background, setBackground] = useState("")
  const [artistImage, setArtistImage] = useState("")
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(initial ? String(initial.id) : "")
  const [imageError, setImageError] = useState("")
  const router = useRouter()

  useEffect(() => {
    let alive = true
    async function draw() {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return
      const colors = PALETTES[style]
      const grad = ctx.createLinearGradient(0, 0, W, H)
      grad.addColorStop(0, colors.bg1)
      grad.addColorStop(1, colors.bg2)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
      if (background) {
        try {
          const image = await loadImage(background)
          if (!alive) return
          const scale = Math.max(W / image.width, H / image.height)
          ctx.drawImage(image, (W-image.width*scale)/2, (H-image.height*scale)/2, image.width*scale, image.height*scale)
        } catch { /* Imagen invalida: se conserva el fondo de plantilla. */ }
      } else {
        const halo = ctx.createRadialGradient(W*0.72,H*0.2,30,W*0.72,H*0.2,720)
        halo.addColorStop(0, colors.accent + "77")
        halo.addColorStop(1, "#00000000")
        ctx.fillStyle = halo
        ctx.fillRect(0,0,W,H)
        for (let i=0;i<8;i++) {
          ctx.strokeStyle = i%2 ? colors.light+"22" : colors.accent+"24"
          ctx.lineWidth = 2
          ctx.strokeRect(80+i*38, 70+i*43, W-160-i*76, H-140-i*86)
        }
      }
      const shade = ctx.createLinearGradient(0,0,0,H)
      shade.addColorStop(0,"#04040d55")
      shade.addColorStop(0.34,"#04040d22")
      shade.addColorStop(0.65,"#04040d80")
      shade.addColorStop(1,"#04040df5")
      ctx.fillStyle = shade
      ctx.fillRect(0,0,W,H)

      if (artistImage) {
        try {
          const image = await loadImage(artistImage)
          if (!alive) return
          const maxH = 700
          const scale = Math.min(650/image.width, maxH/image.height)
          ctx.drawImage(image,(W-image.width*scale)/2,180,image.width*scale,image.height*scale)
        } catch { /* Conserva cartel sin foto. */ }
      }

      ctx.textAlign = "center"
      ctx.fillStyle = colors.light
      ctx.font = "bold 28px Arial, sans-serif"
      ctx.fillText("I AM PROSOUND  /  PRESENTA",W/2,86)
      ctx.fillStyle = "#ffffff"
      ctx.font = "900 112px Arial, sans-serif"
      const titles = lines(ctx,title.toUpperCase(),W-110,3)
      let y = H-510-(titles.length-1)*94
      ctx.shadowColor = "#04020fcc"
      ctx.shadowBlur = 18
      titles.forEach(t=>{ctx.fillText(t,W/2,y);y+=115})
      ctx.shadowBlur = 0
      ctx.font = "bold 39px Arial, sans-serif"
      ctx.fillStyle = colors.light
      lines(ctx,subtitle.toUpperCase(),W-120,2).forEach((t,i)=>ctx.fillText(t,W/2,H-290+i*47))
      ctx.fillStyle = colors.accent
      ctx.fillRect(175,H-182,W-350,3)
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 34px Arial, sans-serif"
      ctx.fillText(when.toUpperCase().slice(0,72),W/2,H-124)
      ctx.fillStyle = "#d0d8eb"
      ctx.font = "28px Arial, sans-serif"
      ctx.fillText(venue.toUpperCase().slice(0,80),W/2,H-70)
    }
    draw()
    return () => {alive = false}
  }, [style,title,subtitle,when,venue,background,artistImage])

  function readFile(file: File, setter: (value: string) => void) {
    if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size>12*1024*1024) {
      toast.error("Usa JPG, PNG o WebP de hasta 12 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setter(String(reader.result))
    reader.readAsDataURL(file)
  }
  function posterBlob(): Promise<Blob> {
    return new Promise((resolve,reject)=>{
      const canvas=canvasRef.current
      if (!canvas) {reject(new Error("Vista previa no disponible"));return}
      canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("No se pudo exportar")),"image/png")
    })
  }
  async function download() {
    try {
      const blob=await posterBlob()
      const url=URL.createObjectURL(blob)
      const link=document.createElement("a")
      link.href=url; link.download="johnx-cartel.png"; link.click()
      window.setTimeout(()=>URL.revokeObjectURL(url),1000)
    } catch {toast.error("No se pudo descargar el cartel")}
  }
  async function saveToEvent() {
    const id=Number(selectedEvent)
    if (!Number.isInteger(id)||id<=0){toast.error("Selecciona un evento");return}
    setUploading(true)
    try {
      const blob=await posterBlob()
      const file=new File([blob], "cartel-evento-"+id+".png", { type:"image/png" })
      const result=await upload("djjohnx/carteles/"+Date.now()+"-"+file.name,file,{
        access:"public", handleUploadUrl:"/api/admin/blob-upload"
      })
      await saveEventPoster({eventId:id,imageUrl:result.url})
      toast.success("Cartel guardado en el evento")
      router.refresh()
    } catch(e){toast.error(e instanceof Error?e.message:"No se pudo guardar")}
    finally {setUploading(false)}
  }
  async function generate() {
    if (concept.trim().length<4){toast.error("Describe el fondo que quieres crear");return}
    setGenerating(true);setImageError("")
    try {
      const response=await fetch("/api/admin/poster-background",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({concept,style})
      })
      const data=await response.json() as {image?:string;error?:string}
      if(!response.ok||!data.image)throw new Error(data.error||"No se recibió una imagen")
      setBackground(data.image)
      toast.success("Fondo generado. Edita el texto antes de guardar.")
    } catch(e){setImageError(e instanceof Error?e.message:"No se pudo generar")}
    finally{setGenerating(false)}
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111722] p-4">
        <div><h2 className="text-lg font-bold">1. Diseña el cartel</h2><p className="text-sm text-foreground/60">La tipografía es editable y no depende de la IA.</p></div>
        <div className="grid grid-cols-3 gap-2">
          {(["neon","minimal","smoke"] as const).map(id=><button key={id} type="button" onClick={()=>setStyle(id)}
            aria-pressed={style===id} className={"rounded-xl border px-2 py-3 text-sm "+(style===id?"border-sky-400 bg-sky-400/15 text-sky-200":"border-white/10 bg-black/30 text-white/70")}>
            {id==="neon"?"Neón":id==="minimal"?"Editorial":"Humo"}
          </button>)}
        </div>
        <div className="space-y-1"><Label htmlFor="poster-title">Artista o titular</Label><Input id="poster-title" maxLength={65} value={title} onChange={e=>setTitle(e.target.value)}/></div>
        <div className="space-y-1"><Label htmlFor="poster-subtitle">Nombre de la sesión</Label><Input id="poster-subtitle" maxLength={85} value={subtitle} onChange={e=>setSubtitle(e.target.value)}/></div>
        <div className="space-y-1"><Label htmlFor="poster-date">Fecha y hora</Label><Input id="poster-date" maxLength={72} value={when} onChange={e=>setWhen(e.target.value)}/></div>
        <div className="space-y-1"><Label htmlFor="poster-venue">Lugar</Label><Input id="poster-venue" maxLength={80} value={venue} onChange={e=>setVenue(e.target.value)}/></div>
      </section>
      <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111722] p-4">
        <h2 className="text-lg font-bold">2. Imagen de fondo</h2>
        <p className="text-sm text-foreground/60">Usa una foto propia o crea un fondo con IA. La IA nunca escribe los datos del evento.</p>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 p-3 text-sm hover:bg-white/5">
          <ImagePlus className="h-4 w-4"/> Subir fondo o fotografía
          <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)readFile(f,setBackground);e.target.value=""}}/>
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 p-3 text-sm hover:bg-white/5">
          <ImagePlus className="h-4 w-4"/> Añadir foto recortada del DJ (PNG transparente)
          <input className="sr-only" type="file" accept="image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)readFile(f,setArtistImage);e.target.value=""}}/>
        </label>
        <div className="space-y-1"><Label htmlFor="poster-concept">Describe el ambiente del fondo</Label>
          <Textarea id="poster-concept" maxLength={400} value={concept} onChange={e=>setConcept(e.target.value)} rows={3}/>
        </div>
        <Button type="button" variant="outline" className="w-full gap-2" disabled={generating} onClick={generate}>
          {generating?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}
          {generating?"Generando fondo...":"Generar fondo con IA"}
        </Button>
        {imageError&&<p className="text-sm text-red-300" role="alert">{imageError}</p>}
        <p className="text-xs text-foreground/50">La generación con IA tiene coste por imagen y solo se ejecuta al pulsar el botón. Si no está configurada, las plantillas y la subida siguen funcionando.</p>
        {(background||artistImage)&&<Button variant="ghost" size="sm" onClick={()=>{setBackground("");setArtistImage("")}}>Quitar imágenes y usar plantilla</Button>}
      </section>
    </div>
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
        <canvas ref={canvasRef} width={W} height={H} aria-label="Vista previa del cartel"
          className="mx-auto h-auto w-full max-w-[500px] rounded-lg shadow-2xl"/>
      </div>
      <Button variant="outline" className="w-full gap-2" onClick={download}><Download className="h-4 w-4"/> Descargar PNG (1080 × 1350)</Button>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111722] p-4">
        <h2 className="text-lg font-bold">3. Guardar en un evento</h2>
        <p className="text-sm text-foreground/60">Solo se publicará en la web si el evento ya está publicado. No cambia ningún otro dato.</p>
        <Label htmlFor="poster-event">Seleccionar evento</Label>
        <select id="poster-event" value={selectedEvent} onChange={e=>setSelectedEvent(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-[#0a101d] p-3 text-sm text-white">
          <option value="">Seleccionar...</option>
          {events.map(event=><option value={event.id} key={event.id}>{event.title} · {event.venue||"Sin lugar"}</option>)}
        </select>
        <Button className="w-full gap-2" disabled={uploading||!selectedEvent} onClick={saveToEvent}>
          {uploading?<Loader2 className="h-4 w-4 animate-spin"/>:<UploadCloud className="h-4 w-4"/>}
          {uploading?"Guardando...":"Guardar cartel en el evento"}
        </Button>
      </div>
    </div>
  </div>
}
