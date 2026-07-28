import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { AdminShell } from "@/components/admin/admin-shell"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Panel | DJ JOHNX",
  robots: { index: false, follow: false },
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/admin/login")

  return (
    <>
      <AdminShell>{children}</AdminShell>
      <Toaster position="top-center" richColors />
    </>
  )
}
