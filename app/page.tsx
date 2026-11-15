import { TunnelHome } from "@/components/tunnel-hero/tunnel-home"
import { IAM_PROSOUND_URL, JOHNX_PATH } from "@/lib/site-links"

/**
 * Home de entrada: unicamente el tunel y, al terminar el recorrido, los dos
 * accesos. Sin cabecera, textos ni reproductor. Todo el sitio de John esta en
 * /john.
 */
export default function Home() {
  return (
    <main>
      <TunnelHome johnxHref={JOHNX_PATH} prosoundHref={IAM_PROSOUND_URL} />
    </main>
  )
}
