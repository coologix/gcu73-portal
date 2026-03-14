import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status =
  | "submitted"
  | "draft"
  | "update_requested"
  | "pending"
  | "completed"
  | "expired"
  | "cancelled";

const STATUS_STYLES: Record<Status, string> = {
  submitted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  update_requested:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  expired: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<Status, string> = {
  submitted: "Submitted",
  draft: "Draft",
  update_requested: "Update Requested",
  pending: "Pending",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
