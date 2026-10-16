// Etiquetas visibles de los estados. Los valores internos (enum y API) siguen en inglés.
export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered"] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente de pago",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  declined: "Rechazado",
  failed: "Rechazado",
  rejected: "Rechazado",
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function paymentStatusLabel(status: string) {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}
