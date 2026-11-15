/**
 * Regenera las imagenes fijas del tunel (public/tunnel/poster-*.webp).
 *
 * Son un fotograma real de la escena 3D en la posicion inicial. Se usan como
 * primera imagen mientras carga WebGL y como version fija para "reducir
 * movimiento" o navegadores sin WebGL. Hay que regenerarlas cuando cambie el
 * aspecto del tunel.
 *
 * Uso (con la web arrancada en local y Playwright + ffmpeg disponibles):
 *   node scripts/tunnel-poster.mjs http://localhost:3000
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"

// Playwright no es dependencia del proyecto: se resuelve tambien si esta
// instalado de forma global (NODE_PATH).
const { chromium } = createRequire(import.meta.url)("playwright")

const base = process.argv[2] ?? "http://localhost:3000"
const outDir = new URL("../public/tunnel/", import.meta.url).pathname

const SHOTS = [
  { name: "poster-landscape", width: 1920, height: 1080, scale: 1 },
  { name: "poster-portrait", width: 450, height: 975, scale: 2 },
]

// Solo el lienzo: sin cabecera, textos ni botones flotantes.
const HIDE_UI = `
  nav, .fixed, nextjs-portal { display: none !important; }
  .cine-stage > *:not(:has(canvas)) { display: none !important; }
`

const work = mkdtempSync(join(tmpdir(), "tunnel-poster-"))
const browser = await chromium.launch()
try {
  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: shot.scale,
    })
    const page = await context.newPage()
    // auto=0: la camara se queda en la posicion inicial en vez de echar a andar.
    await page.goto(`${base}/?tunnel=live&auto=0&dpr=${shot.scale}`, { waitUntil: "domcontentloaded" })
    await page.addStyleTag({ content: HIDE_UI })
    await page.waitForSelector(".cine-stage canvas", { timeout: 60_000 })
    await page.waitForTimeout(6000)
    const png = join(work, `${shot.name}.png`)
    await page.screenshot({ path: png })
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", png, "-c:v", "libwebp", "-q:v", "80", join(outDir, `${shot.name}.webp`)])
    console.log(`${shot.name}.webp`)
    await context.close()
  }
} finally {
  await browser.close()
  rmSync(work, { recursive: true, force: true })
}
