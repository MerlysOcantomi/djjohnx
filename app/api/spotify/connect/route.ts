import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { spotifyAuthorizeUrl } from "@/lib/spotify"

function redirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.djjohnx.com"
  return new URL("/api/spotify/callback", base).toString()
}

export async function GET() {
  await requireAdmin()
  const state = randomBytes(24).toString("base64url")
  const response = NextResponse.redirect(spotifyAuthorizeUrl(state, redirectUri()))
  response.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  })
  return response
}
