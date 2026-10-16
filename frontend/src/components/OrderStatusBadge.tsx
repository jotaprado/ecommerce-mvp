import Badge from "./ui/Badge";
import type { BadgeVariant } from "./ui/Badge";

const STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Pendiente", variant: "warning" },
  paid: { label: "Pagado", variant: "info" },
  shipped: { label: "Enviado", variant: "neutral" },
  delivered: { label: "Entregado", variant: "success" },
};

function OrderStatusBadge({ status }: { status: string }) {
  const entry = STATUS[status] ?? { label: status, variant: "neutral" as BadgeVariant };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export default OrderStatusBadge;
