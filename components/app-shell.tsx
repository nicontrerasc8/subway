"use client";

import { useState } from "react";
import {
  Building2,
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
    label: "Inicio",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/subway/ventas",
    label: "Sucursales",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/subway/pagos",
    label: "Pagos",
    icon: LayoutDashboard,
  },
  // {
  //   href: "/dashboard/subway/auditoria",
  //   label: "Auditoria",
  //   icon: LayoutDashboard,
  // },
  {
    href: "/dashboard/subway/cruce",
    label: "Mix",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/imports",
    label: "Importaciones",
    icon: UploadCloud,
  },
];

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
    <div className="flex h-full min-h-0 flex-col justify-between gap-6">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 px-1">
          <div className="rounded-2xl bg-white/10 p-3 shadow-lg shadow-black/20">
            <Building2 className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Subway</p>
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
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                  active
                    ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                    : "text-slate-200 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <Icon className={active ? "size-4 text-slate-900" : "size-4 text-slate-300 group-hover:text-white"} />
                <span className="min-w-0 break-words font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{user.fullName ?? user.email}</p>
          <p className="mt-1 text-sm text-slate-300">{roleLabels[user.role]}</p>
        </div>
        <form action={logoutAction} className="mt-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10">
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
          <aside className="absolute inset-y-0 left-0 flex h-[100dvh] w-[min(92vw,24rem)] flex-col bg-[linear-gradient(180deg,rgba(6,18,30,0.98)_0%,rgba(10,28,46,0.98)_100%)] px-4 py-4 text-sidebar-foreground shadow-2xl sm:px-5 sm:py-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Navegacion</p>
                <p className="mt-1 truncate text-sm font-medium text-white">{user.fullName ?? user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white"
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

      <aside className="fixed inset-y-0 left-0 z-30 hidden h-[100dvh] w-[290px] overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,rgba(6,18,30,0.98)_0%,rgba(10,28,46,0.98)_100%)] px-6 py-8 text-sidebar-foreground shadow-2xl lg:block">
        <SidebarContent user={user} pathname={pathname} />
      </aside>

      <main className="min-w-0 px-3 pb-6 pt-24 sm:px-6 lg:ml-[290px] lg:min-h-screen lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
