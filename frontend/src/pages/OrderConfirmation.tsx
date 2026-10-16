import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Clock, PackageX } from "lucide-react";
import { apiFetch } from "../lib/api";
import { formatPrice } from "../lib/format";
import { deliveryLabel, paymentLabel } from "../lib/checkout";
import { orderStatusLabel, paymentStatusLabel } from "../lib/orderStatus";
import ProductImage from "../components/ProductImage";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { buttonClasses } from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  product: { id: string; name: string; imageUrl: string; category?: string };
}

interface Order {
  id: string;
  trackingId: string;
  total: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  deliveryType: string | null;
  shippingAddress: { name: string; phone: string; department: string; city: string; address: string; notes?: string } | null;
  pickupStore: string | null;
  shippingCost: string;
  payment: { method: string | null; status: string; cardBrand: string | null; cardLast4: string | null } | null;
}

function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/orders/${id}`)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el pedido"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<PackageX className="h-6 w-6" />}
          message={error ?? "Pedido no encontrado."}
          action={
            <Link to="/orders" className={buttonClasses("primary")}>
              Ver mis pedidos
            </Link>
          }
        />
      </div>
    );
  }

  const pendingPayment = order.status === "pending";
  const shippingCost = Number(order.shippingCost ?? 0);
  const subtotal = Number(order.total) - shippingCost;
  const addr = order.shippingAddress;

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6">
        <div className="flex items-start gap-3">
          {pendingPayment ? (
            <Clock className="mt-1 h-8 w-8 shrink-0 text-muted" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-success" aria-hidden="true" />
          )}
          <div>
            <h1 className={`text-title ${pendingPayment ? "" : "text-success"}`}>
              {pendingPayment ? "¡Pedido recibido!" : "¡Pedido confirmado!"}
            </h1>
            {pendingPayment && (
              <p className="mt-1 text-small font-medium text-text-primary">{orderStatusLabel(order.status)}</p>
            )}
            <p className="mt-2 text-small text-muted">Número de seguimiento</p>
            <p className="font-mono text-heading">{order.trackingId}</p>
            <div className="mt-2">
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-border pt-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <ProductImage
                src={item.product.imageUrl}
                alt={item.product.name}
                category={item.product.category}
                className="h-16 w-16 shrink-0 rounded-lg"
              />
              <div className="flex-1">
                <p className="font-medium">{item.product.name}</p>
                <p className="text-small text-muted">Cantidad: {item.quantity}</p>
              </div>
              <p className="font-semibold">
                {formatPrice(Number(item.unitPrice) * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-small">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Envío</dt>
            <dd>{order.deliveryType === "shipping" ? (shippingCost === 0 ? "Gratis" : formatPrice(shippingCost)) : order.deliveryType === "pickup" ? "$0" : "—"}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <dt className="text-heading">{pendingPayment ? "Total a pagar" : "Total pagado"}</dt>
            <dd className="text-heading">{formatPrice(order.total)}</dd>
          </div>
        </dl>

        <dl className="mt-4 border-t border-border pt-4 text-small">
          <div className="grid grid-cols-3 gap-2 py-2">
            <dt className="text-muted">Entrega</dt>
            <dd className="col-span-2">
              {deliveryLabel(order.deliveryType)}
              {order.deliveryType === "pickup" && order.pickupStore && <span> · {order.pickupStore}</span>}
              {order.deliveryType === "shipping" && addr && (
                <span className="block text-muted">
                  {addr.name} · {addr.phone}
                  <br />
                  {addr.address}, {addr.city}, {addr.department}
                  {addr.notes ? <><br />Indicaciones: {addr.notes}</> : null}
                </span>
              )}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-2 py-2">
            <dt className="text-muted">Pago</dt>
            <dd className="col-span-2">
              {paymentLabel(order.payment, order.deliveryType)}
              {order.payment && <span className="text-muted"> · {paymentStatusLabel(order.payment.status)}</span>}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/" className={buttonClasses("primary")}>
            Volver al catálogo
          </Link>
          <Link to="/orders" className={buttonClasses("ghost")}>
            Mis pedidos
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default OrderConfirmation;
