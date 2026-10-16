import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ClipboardList } from "lucide-react";
import { apiFetch } from "../lib/api";
import { formatDate, formatPrice } from "../lib/format";
import { deliveryLabel, paymentLabel } from "../lib/checkout";
import Badge from "../components/ui/Badge";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { buttonClasses } from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

interface Order {
  id: string;
  trackingId: string;
  total: string;
  status: string;
  createdAt: string;
  deliveryType: string | null;
  payment: { method: string | null; cardBrand: string | null; cardLast4: string | null } | null;
}

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/orders")
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los pedidos"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-title">Mis pedidos</h1>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-small text-danger">
          {error}
        </p>
      )}

      {!loading && !error && orders.length === 0 && (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          message="Todavía no tienes pedidos."
          action={
            <Link to="/" className={buttonClasses("primary")}>
              Ir al catálogo
            </Link>
          }
        />
      )}

      {orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} hoverable className="flex items-center justify-between gap-4 p-4">
              <div>
                <Link
                  to={`/seguimiento/${order.trackingId}`}
                  title="Ver el seguimiento de este pedido"
                  className="font-mono font-semibold text-accent-blue hover:underline"
                >
                  {order.trackingId}
                </Link>
                <p className="text-small text-muted">{formatDate(order.createdAt)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="neutral">{deliveryLabel(order.deliveryType)}</Badge>
                  <Badge variant="neutral">{paymentLabel(order.payment, order.deliveryType)}</Badge>
                </div>
              </div>
              <Link
                to={`/order/${order.id}`}
                aria-label={`Ver detalle del pedido ${order.trackingId}`}
                className="flex items-center gap-4 rounded-lg"
              >
                <div className="text-right">
                  <p className="font-semibold">{formatPrice(order.total)}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
