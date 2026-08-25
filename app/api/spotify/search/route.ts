import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { searchSpotifyTracks } from "@/lib/spotify"

const querySchema = z.string().trim().min(2).max(80)

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q") || ""
  const parsed = querySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ tracks: [] })

  try {
    const tracks = await searchSpotifyTracks(parsed.data)
    return NextResponse.json({ tracks }, {
      headers: { "Cache-Control": "private, max-age=30" },
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : "SPOTIFY_SEARCH_ERROR"
    if (code === "SPOTIFY_NOT_CONFIGURED") {
      return NextResponse.json({ tracks: [], unavailable: true }, { status: 503 })
    }
    return NextResponse.json({ tracks: [] }, { status: 502 })
  }
}
