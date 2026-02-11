import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  present: {
    label: "Present",
    variant: "default",
    className: "bg-green-600 dark:bg-green-700 text-white border-green-700 dark:border-green-600",
  },
  late: {
    label: "Late",
    variant: "default",
    className: "bg-amber-500 dark:bg-amber-600 text-white border-amber-600 dark:border-amber-500",
  },
  pending_checkout: {
    label: "Pending Checkout",
    variant: "default",
    className: "bg-blue-500 dark:bg-blue-600 text-white border-blue-600 dark:border-blue-500",
  },
  absent: {
    label: "Absent",
    variant: "destructive",
    className: "",
  },
  not_checked_in: {
    label: "Not Checked In",
    variant: "secondary",
    className: "",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    variant: "outline" as const,
    className: "",
  };

  return (
    <Badge
      variant={config.variant}
      className={`no-default-hover-elevate no-default-active-elevate ${config.className}`}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}
