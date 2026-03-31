import { redirect } from "next/navigation";

import { getOptionalSession } from "@/lib/auth/session";
import { LoginForm } from "@/modules/auth/components/login-form";

export default async function LoginPage() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#edf4fb] px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(18,95,168,0.20),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(119,176,221,0.34),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(11,56,95,0.12),transparent_38%),linear-gradient(135deg,#edf4fb_0%,#dbe9f6_48%,#f7fbff_100%)]" />
      <div className="absolute -left-24 top-16 h-64 w-64 rounded-full border border-white/60 bg-white/20 blur-3xl" />
      <div className="absolute bottom-[-6rem] right-[-3rem] h-80 w-80 rounded-full bg-[#7fb3dc]/18 blur-3xl" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(16,36,58,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,36,58,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />

      <section className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white/88 p-8 shadow-[0_30px_100px_rgba(15,61,94,0.18)] backdrop-blur-md">
        <div className="mb-8">
          <div className="inline-flex rounded-full border border-[#bfd2e6] bg-[#eff6fc] px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.28em] text-[#4f6b88]">
            Cidelsa
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#10243a]">
            Login
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#5e748d]">
            Ingresa con tu usuario registrado.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
