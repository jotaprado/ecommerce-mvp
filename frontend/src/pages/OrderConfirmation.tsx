import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, PackageX } from "lucide-react";
import { apiFetch } from "../lib/api";
import { formatPrice } from "../lib/format";
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

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-success" aria-hidden="true" />
          <div>
            <h1 className="text-title">¡Pedido confirmado!</h1>
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

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-heading">Total pagado</span>
          <span className="text-heading">{formatPrice(order.total)}</span>
        </div>

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
