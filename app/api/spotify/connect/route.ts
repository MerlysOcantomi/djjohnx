import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { spotifyAuthorizeUrl } from "@/lib/spotify"

const SPOTIFY_REDIRECT_URI = "https://www.djjohnx.com/api/spotify/callback"

export async function GET() {
  await requireAdmin()
  const state = randomBytes(24).toString("base64url")
  const response = NextResponse.redirect(spotifyAuthorizeUrl(state, SPOTIFY_REDIRECT_URI))
  response.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  })
  return response
}
