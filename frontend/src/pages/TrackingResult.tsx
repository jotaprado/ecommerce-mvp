import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, PackageX } from "lucide-react";
import { apiFetch } from "../lib/api";
import { deliveryLabel } from "../lib/checkout";
import { formatDate } from "../lib/format";
import { ORDER_STATUSES, orderStatusLabel } from "../lib/orderStatus";
import { buttonClasses } from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

interface Tracking {
  trackingId: string;
  status: string;
  createdAt: string;
  deliveryType: string | null;
  city: string | null;
  pickupStore: string | null;
  items: { name: string; quantity: number }[];
}

function TrackingResult() {
  const { trackingId } = useParams();
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/tracking/${encodeURIComponent(trackingId ?? "")}`)
      .then(setTracking)
      .catch((err) => {
        setTracking(null);
        setError(err instanceof Error ? err.message : "No se pudo consultar el pedido");
      })
      .finally(() => setLoading(false));
  }, [trackingId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<PackageX className="h-6 w-6" />}
          message={error ?? "No encontramos un pedido con ese código"}
          action={
            <Link to="/seguimiento" className={buttonClasses("primary")}>
              Probar con otro código
            </Link>
          }
        />
      </div>
    );
  }

  const currentIndex = ORDER_STATUSES.findIndex((s) => s === tracking.status);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="text-small text-muted">Seguimiento del pedido</p>
        <h1 className="font-mono text-title">{tracking.trackingId}</h1>
      </div>

      <Card className="p-5">
        <ol className="flex flex-col gap-4 sm:flex-row sm:gap-2" aria-label="Progreso del pedido">
          {ORDER_STATUSES.map((status, index) => {
            const done = index < currentIndex;
            const current = index === currentIndex;
            return (
              <li
                key={status}
                aria-current={current ? "step" : undefined}
                className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:text-center"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-small font-semibold ${
                    current
                      ? "bg-accent-blue text-white ring-4 ring-accent-blue-soft"
                      : done
                        ? "bg-accent-blue text-white"
                        : "bg-slate-200 text-muted"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </span>
                <span
                  className={`text-small ${current ? "font-semibold text-text-primary" : done ? "text-text-primary" : "text-muted"}`}
                >
                  {orderStatusLabel(status)}
                  {current && <span className="sr-only"> (estado actual)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card className="p-5">
        <dl className="text-small">
          <div className="grid grid-cols-3 gap-2 border-b border-border py-3">
            <dt className="text-muted">Fecha del pedido</dt>
            <dd className="col-span-2">{formatDate(tracking.createdAt)}</dd>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b border-border py-3">
            <dt className="text-muted">Entrega</dt>
            <dd className="col-span-2">
              {deliveryLabel(tracking.deliveryType)}
              {tracking.city && <span> · {tracking.city}</span>}
              {tracking.pickupStore && <span> · {tracking.pickupStore}</span>}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-2 py-3">
            <dt className="text-muted">Productos</dt>
            <dd className="col-span-2">
              <ul className="space-y-1">
                {tracking.items.map((item, i) => (
                  <li key={i}>
                    {item.name} <span className="whitespace-nowrap text-muted">× {item.quantity}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </Card>

      <Link to="/seguimiento" className={buttonClasses("ghost")}>
        Consultar otro pedido
      </Link>
    </div>
  );
}

export default TrackingResult;
