"use client"

import { useActionState } from "react"
import Link from "next/link"
import { loginAction, type LoginState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Loader2 } from "lucide-react"

const initialState: LoginState = {}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <span className="text-3xl font-black tracking-wider text-gradient-gold">DJ JOHNX</span>
        <p className="mt-2 text-sm text-foreground/60">Panel de administracion</p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="password" className="mb-2 block text-sm text-foreground/70">
              Contrasena
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              className="border-border/50 bg-background/50 focus:border-primary"
              placeholder="Introduce tu contrasena"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-primary font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>

          <Button asChild variant="ghost" className="w-full text-foreground/60 hover:text-foreground">
            <Link href="/">Volver a la web</Link>
          </Button>
        </form>
      </div>
    </div>
  )
}
