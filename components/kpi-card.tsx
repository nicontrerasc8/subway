import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

const toneMap = {
  default: "bg-secondary text-secondary-foreground",
  primary: "bg-primary text-primary-foreground",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
} as const;

export function KpiCard({
  title,
  value,
  icon: Icon,
  tone = "default",
  format = "currency",
  valueFormatter,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  tone?: keyof typeof toneMap;
  format?: "currency" | "number";
  valueFormatter?: (value: number) => string;
}) {
  const formattedValue = valueFormatter
    ? valueFormatter(value)
    : format === "currency"
      ? formatCurrency(value)
      : formatNumber(value);

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {formattedValue}
          </p>
        </div>
        <div className={`rounded-2xl p-3 ${toneMap[tone]}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
