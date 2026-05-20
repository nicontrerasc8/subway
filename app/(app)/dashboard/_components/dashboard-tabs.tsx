"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DashboardBranchesSection } from "@/app/(app)/dashboard/_components/dashboard-branches-section";
import { DashboardDeliverySection } from "@/app/(app)/dashboard/_components/dashboard-delivery-section";
import { DashboardMixSection } from "@/app/(app)/dashboard/_components/dashboard-mix-section";
import { DashboardPaymentsSection } from "@/app/(app)/dashboard/_components/dashboard-payments-section";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { DashboardBranchesData } from "@/modules/dashboard/services/dashboard-branches";
import type { DashboardMixData } from "@/modules/dashboard/services/dashboard-mix";
import type { DashboardPaymentsData } from "@/modules/dashboard/services/dashboard-payments";

type DashboardTab = "sucursales" | "pagos" | "delivery" | "mix";
type DashboardDataCache = {
  branches?: DashboardBranchesData;
  payments?: DashboardPaymentsData;
  mix?: DashboardMixData;
};

function getCacheKey(tab: DashboardTab): keyof DashboardDataCache {
  if (tab === "sucursales") return "branches";
  if (tab === "mix") return "mix";
  return "payments";
}

function LoadingPanel() {
  return (
    <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
      Cargando datos...
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-card p-8">
      <p className="text-sm font-medium text-foreground">No se pudo cargar esta seccion.</p>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4")}
      >
        Reintentar
      </button>
    </div>
  );
}

export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("sucursales");
  const [cache, setCache] = useState<DashboardDataCache>({});
  const [loadingKey, setLoadingKey] = useState<keyof DashboardDataCache | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof DashboardDataCache, string>>>({});

  const activeCacheKey = getCacheKey(activeTab);
  const activeData = cache[activeCacheKey];
  const isLoadingActive = loadingKey === activeCacheKey;
  const activeError = errors[activeCacheKey];

  const loadSection = useCallback(
    async (tab: DashboardTab, force = false) => {
      const key = getCacheKey(tab);
      if (!force && cache[key]) return;

      setLoadingKey(key);
      setErrors((current) => ({ ...current, [key]: undefined }));

      try {
        const response = await fetch(`/api/dashboard/section?section=${tab}`, {
          credentials: "same-origin",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? "Error al cargar datos.");
        }

        setCache((current) => ({
          ...current,
          [key]: payload.data,
        }));
      } catch (error) {
        setErrors((current) => ({
          ...current,
          [key]: error instanceof Error ? error.message : "Error al cargar datos.",
        }));
      } finally {
        setLoadingKey((current) => (current === key ? null : current));
      }
    },
    [cache],
  );

  useEffect(() => {
    void loadSection(activeTab);
  }, [activeTab, loadSection]);

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardTab)} className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="overflow-x-auto">
          <TabsList className="h-auto min-w-max rounded-2xl p-1.5">
            <TabsTrigger value="sucursales" className="rounded-xl px-4 py-2">
              Ventas totales
            </TabsTrigger>
            <TabsTrigger value="pagos" className="rounded-xl px-4 py-2">
              Ticket promedio y Transacciones
            </TabsTrigger>
            <TabsTrigger value="delivery" className="rounded-xl px-4 py-2">
              Delivery por App
            </TabsTrigger>
            <TabsTrigger value="mix" className="rounded-xl px-4 py-2">
              Mix comercial
            </TabsTrigger>
          </TabsList>
        </div>
        <a
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0")}
          href="/api/dashboard/export?section=all"
        >
          <Download className="size-4" />
          Exportar Excel
        </a>
      </div>

      {isLoadingActive && !activeData ? <LoadingPanel /> : null}
      {activeError && !activeData ? (
        <ErrorPanel message={activeError} onRetry={() => void loadSection(activeTab, true)} />
      ) : null}

      <TabsContent value="sucursales" forceMount className="mt-0 data-[state=inactive]:hidden">
        {cache.branches ? <DashboardBranchesSection branches={cache.branches} /> : null}
      </TabsContent>
      <TabsContent value="pagos" forceMount className="mt-0 data-[state=inactive]:hidden">
        {cache.payments ? <DashboardPaymentsSection payments={cache.payments} /> : null}
      </TabsContent>
      <TabsContent value="delivery" forceMount className="mt-0 data-[state=inactive]:hidden">
        {cache.payments ? <DashboardDeliverySection payments={cache.payments} /> : null}
      </TabsContent>
      <TabsContent value="mix" forceMount className="mt-0 data-[state=inactive]:hidden">
        {cache.mix ? <DashboardMixSection mix={cache.mix} /> : null}
      </TabsContent>
    </Tabs>
  );
}
