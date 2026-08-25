import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import {
  createRequestsPlaylist,
  exchangeSpotifyCode,
  getSpotifyProfile,
  saveSpotifyConnection,
} from "@/lib/spotify"

function redirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.djjohnx.com"
  return new URL("/api/spotify/callback", base).toString()
}

function adminUrl(path = "/admin/peticiones") {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.djjohnx.com"
  return new URL(path, base)
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const code = request.nextUrl.searchParams.get("code")
    const state = request.nextUrl.searchParams.get("state")
    const error = request.nextUrl.searchParams.get("error")
    const cookieStore = await cookies()
    const expectedState = cookieStore.get("spotify_oauth_state")?.value
    cookieStore.delete("spotify_oauth_state")

    if (error || !code || !state || !expectedState || state !== expectedState) {
      return NextResponse.redirect(adminUrl("/admin/peticiones?spotify=error"))
    }

    const tokens = await exchangeSpotifyCode(code, redirectUri())
    if (!tokens.refresh_token) {
      return NextResponse.redirect(adminUrl("/admin/peticiones?spotify=no_refresh_token"))
    }

    const profile = await getSpotifyProfile(tokens.access_token!)
    const playlist = await createRequestsPlaylist(tokens.access_token!)

    await saveSpotifyConnection({
      spotifyUserId: profile.id,
      displayName: profile.displayName,
      refreshToken: tokens.refresh_token,
      playlistId: playlist.id,
      playlistUrl: playlist.url,
    })

    return NextResponse.redirect(adminUrl("/admin/peticiones?spotify=connected"))
  } catch {
    return NextResponse.redirect(adminUrl("/admin/peticiones?spotify=error"))
  }
}
