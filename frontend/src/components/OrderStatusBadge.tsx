import Badge from "./ui/Badge";
import type { BadgeVariant } from "./ui/Badge";
import { orderStatusLabel } from "../lib/orderStatus";

const VARIANTS: Record<string, BadgeVariant> = {
  pending: "neutral",
  paid: "success",
  shipped: "info",
  delivered: "success",
};

function OrderStatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANTS[status] ?? "neutral"}>{orderStatusLabel(status)}</Badge>;
}

export default OrderStatusBadge;
