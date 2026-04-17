"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/modules/auth/server/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <div className="group relative rounded-3xl border border-border bg-card/60 p-1 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-primary/20">
      <div className="p-7">
        <form action={action} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
              Correo Institucional
            </Label>
            <div className="relative group">
              <Input
                className="h-12 border-border bg-background/50 pl-10 ring-offset-background transition-all focus:bg-background focus:ring-2 focus:ring-primary/20"
                id="email"
                name="email"
                type="email"
                placeholder="usuario@subway.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contraseña
              </Label>
              <a href="#" className="text-xs text-primary hover:underline">¿La olvidaste?</a>
            </div>
            <div className="relative group">
              <Input
                className="h-12 border-border bg-background/50 pl-10 ring-offset-background transition-all focus:bg-background focus:ring-2 focus:ring-primary/20"
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {state?.error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              {state.error}
            </div>
          )}

          <Button 
            className="group/btn h-12 w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" 
            type="submit" 
            disabled={pending}
          >
            {pending ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <>
                Acceder al Dashboard
                <ArrowRight className="ml-2 size-4 transition-transform group-hover/btn:translate-x-1" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
