"use server";

import { redirect } from "next/navigation";

import { getDefaultDashboardPath } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators/auth";

export interface LoginActionState {
  error?: string;
}

function translateSupabaseAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Correo o contrasena incorrectos.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Tu correo aun no ha sido confirmado en Supabase Auth.";
  }

  if (normalized.includes("signup is disabled")) {
    return "El proveedor de autenticacion del proyecto no esta configurado correctamente.";
  }

  return message;
}

export async function loginAction(
  _state: LoginActionState | undefined,
  formData: FormData,
): Promise<LoginActionState | undefined> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Credenciales invalidas." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    console.error("Supabase login error:", error.message);
    return { error: translateSupabaseAuthError(error.message) };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "No se pudo resolver el perfil del usuario autenticado." };
  }

  redirect(getDefaultDashboardPath());
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
