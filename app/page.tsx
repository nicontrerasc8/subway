import { redirect } from "next/navigation";

import { getDefaultDashboardPath } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDefaultDashboardPath());
  }

  redirect("/login");
}
