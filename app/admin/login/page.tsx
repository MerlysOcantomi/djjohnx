import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { LoginForm } from "@/components/admin/login-form"

export const metadata: Metadata = {
  title: "Acceso | DJ JOHNX",
  robots: { index: false, follow: false },
}

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/admin")

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <LoginForm />
    </main>
  )
}
