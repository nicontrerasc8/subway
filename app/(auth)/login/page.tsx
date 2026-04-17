import { redirect } from "next/navigation";
import { getDefaultDashboardPath } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/modules/auth/components/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDefaultDashboardPath());
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10">
      {/* Fondo con Grid moderno y sutil */}
      <div className="absolute inset-0 z-0 opacity-[0.03] [background-image:radial-gradient(var(--foreground)_1px,transparent_1px)] [background-size:24px_24px]" />
      
      {/* Luces de profundidad (Glows) */}
      <div className="absolute -left-[10%] top-[10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute -right-[5%] bottom-[5%] h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />

      <section className="relative z-10 w-full max-w-[420px]">
        {/* Header del Login */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            Subway
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground">
            Bienvenido
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gestiona tus proyectos con precisión técnica.
          </p>
        </div>

        {/* El Formulario */}
        <LoginForm />
        
        <p className="mt-8 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Subway. Todos los derechos reservados.
        </p>
      </section>
    </main>
  );
}
