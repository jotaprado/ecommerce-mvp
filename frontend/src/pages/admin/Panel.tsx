import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { formatDate, formatPrice } from "../../lib/format";
import PanelNav from "../../components/PanelNav";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

const STATUSES = ["pending", "paid", "shipped", "delivered"];

interface Order {
  id: string;
  trackingId: string | null;
  total: string;
  status: string;
  createdAt: string;
  user?: { email: string };
}

function Panel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const toast = useToast();

  function loadOrders() {
    setLoading(true);
    apiFetch("/orders")
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los pedidos"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleStatusChange(orderId: string, status: string) {
    setError(null);
    setUpdatingId(orderId);

    try {
      await apiFetch(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Estado actualizado");
      loadOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar el estado";
      setError(message);
      toast.error(message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-title">Panel de administración</h1>
      <PanelNav />

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-small text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-6 w-6" />} message="No hay pedidos todavía." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
                <th scope="col" className="px-4 py-3 font-semibold">Tracking ID</th>
                <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
                <th scope="col" className="px-4 py-3 font-semibold">Total</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{order.user?.email ?? "—"}</td>
                  <td className="px-4 py-3 font-mono">
                    <Link to={`/order/${order.id}`} className="text-accent-blue hover:underline">
                      {order.trackingId ?? order.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">{formatPrice(order.total)}</td>
                  <td className="px-4 py-3">
                    <Select
                      aria-label={`Estado del pedido ${order.trackingId ?? order.id}`}
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default Panel;
