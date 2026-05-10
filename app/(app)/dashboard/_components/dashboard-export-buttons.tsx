"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardExportOption = {
  label: string;
  view: string;
};

export function DashboardExportButtons({
  section,
  dateFrom,
  dateTo,
  options,
}: {
  section: string;
  dateFrom: string;
  dateTo: string;
  options: DashboardExportOption[];
}) {
  const searchParams = useSearchParams();

  const links = useMemo(
    () =>
      options.map((option) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("section", section);
        params.set("view", option.view);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        return {
          ...option,
          href: `/api/dashboard/export?${params.toString()}`,
        };
      }),
    [dateFrom, dateTo, options, searchParams, section],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map((link) => (
        <a
          key={link.view}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "whitespace-nowrap")}
          download
          href={link.href}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {link.label}
        </a>
      ))}
    </div>
  );
}
