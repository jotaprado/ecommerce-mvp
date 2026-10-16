import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ClipboardList } from "lucide-react";
import { apiFetch } from "../lib/api";
import { formatDate, formatPrice } from "../lib/format";
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
            <Link key={order.id} to={`/order/${order.id}`} className="block rounded-card">
              <Card hoverable className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-mono font-semibold">{order.trackingId}</p>
                  <p className="text-small text-muted">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(order.total)}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
