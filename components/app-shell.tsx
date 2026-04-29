"use client";

import { useState } from "react";
import {
  Building2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { canAccessSidebarPath, roleLabels } from "@/lib/auth/roles";
import type { CurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/modules/auth/server/actions";

const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/imports",
    label: "Importaciones",
    icon: UploadCloud,
  },
  {
    href: "/dashboard/subway/historico",
    label: "Historico",
    icon: History,
  },
];

const sidebarShellClass =
  "bg-[linear-gradient(180deg,#008938_0%,#007a33_48%,#005f27_100%)] text-white shadow-2xl";

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href !== "/dashboard" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

function SidebarContent({
  user,
  pathname,
  onNavigate,
}: {
  user: CurrentUser;
  pathname: string;
  onNavigate?: () => void;
}) {
  const visibleNavigation = navigation.filter((item) => canAccessSidebarPath(user.role, item.href));

  return (
    <div className="flex h-full min-h-0 flex-col justify-between gap-5">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 px-1">
      
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white">Subway</p>
          </div>
        </div>

        <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {visibleNavigation.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={[
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-[#ffc600] text-[#004c1f] shadow-lg shadow-black/20"
                    : "text-white/85 hover:bg-white/12 hover:text-white",
                ].join(" ")}
              >
                <Icon className={active ? "size-4 text-[#004c1f]" : "size-4 text-[#ffc600] group-hover:text-white"} />
                <span className="min-w-0 break-words font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{user.fullName ?? user.email}</p>
          <p className="mt-1 text-sm text-[#ffc600]">{roleLabels[user.role]}</p>
        </div>
        <form action={logoutAction} className="mt-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#ffc600]/35 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[#ffc600] hover:text-[#004c1f]">
            <LogOut className="size-4" />
            Cerrar sesion
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: Readonly<{
  user: CurrentUser;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-black/5 bg-background/92 backdrop-blur lg:hidden">
        <div className="flex min-h-18 items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl bg-primary p-2.5 text-primary-foreground shadow-lg shadow-primary/20">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Subway</p>
              <p className="truncate text-sm font-semibold text-foreground">{roleLabels[user.role]}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-2xl border border-border bg-card p-3 text-foreground shadow-sm"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Cerrar menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className={`absolute inset-y-0 left-0 flex h-[100dvh] w-[min(92vw,24rem)] flex-col px-4 py-4 sm:px-5 sm:py-5 ${sidebarShellClass}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ffc600]">Navegacion</p>
                <p className="mt-1 truncate text-sm font-medium text-white">{user.fullName ?? user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl border border-[#ffc600]/35 bg-white/10 p-3 text-white hover:bg-[#ffc600] hover:text-[#004c1f]"
                aria-label="Cerrar menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <SidebarContent user={user} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      <aside className={`fixed inset-y-0 left-0 z-30 hidden h-[100dvh] w-[260px] overflow-hidden border-r border-[#ffc600]/25 px-5 py-6 lg:block ${sidebarShellClass}`}>
        <SidebarContent user={user} pathname={pathname} />
      </aside>

      <main className="min-w-0 px-3 pb-5 pt-20 sm:px-5 lg:ml-[260px] lg:min-h-screen lg:px-6 lg:py-6">
        {children}
      </main>
    </div>
  );
}
