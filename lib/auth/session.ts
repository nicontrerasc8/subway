import "server-only";

import { cache } from "react";

import type { AppRole } from "@/lib/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  isActive: boolean;
}

export const getOptionalSession = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const authUser = await getOptionalSession();

  if (!authUser) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles_subway")
    .select("id, email, full_name, role, is_active")
    .eq("id", authUser.id)
    .single();

  if (error || !data || !data.is_active) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
    isActive: data.is_active,
  };
});
