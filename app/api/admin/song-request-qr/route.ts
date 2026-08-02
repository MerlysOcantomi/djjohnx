import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/auth"

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg"
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://djjohnx.com").replace(/\/$/, "")
  const publicUrl = `${base}/mi-cancion`
  try {
    const upstream = await fetch(
      `https://quickchart.io/qr?size=${format === "png" ? 1000 : 500}&margin=2&format=${format}&text=${encodeURIComponent(publicUrl)}`,
      { cache: "no-store" },
    )
    if (!upstream.ok) throw new Error("QR_UPSTREAM_FAILED")
    return new NextResponse(await upstream.arrayBuffer(), {
      headers: {
        "content-type": format === "png" ? "image/png" : "image/svg+xml",
        "content-disposition": `attachment; filename="djjohnx-mi-cancion.${format}"`,
        "cache-control": "private, no-store",
      },
    })
  } catch {
    return NextResponse.json({ error: "No se pudo generar el QR" }, { status: 502 })
  }
}
