import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { COOKIE_NAME, verifySessionToken } from "@/lib/session"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Solo protege /admin, dejando pasar /admin/login
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get(COOKIE_NAME)?.value
    const ok = await verifySessionToken(token, process.env.SESSION_SECRET)
    if (!ok) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      url.search = ""
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
