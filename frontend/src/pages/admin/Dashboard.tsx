import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Clock, DollarSign, ShoppingBag, Users } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import PanelNav from "../../components/PanelNav";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";

interface Summary {
  totalSales: string | number;
  orderCount: number;
  userCount: number;
  pendingOrders: number;
  lowStockThreshold: number;
  lowStockProducts: { name: string; stock: number }[];
  topProducts: { name: string; units: number }[];
  salesLast7Days: { date: string; total: number }[];
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-blue-soft text-accent-blue">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-small text-muted">{label}</p>
        <p className="whitespace-nowrap text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

function formatDay(key: string) {
  // Mediodía para evitar que la zona horaria del navegador mueva el día.
  const text = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(`${key}T12:00:00`),
  );
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/admin/summary")
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el resumen"))
      .finally(() => setLoading(false));
  }, []);

  const maxDaily = summary ? Math.max(...summary.salesLast7Days.map((d) => d.total), 1) : 1;
  const weekTotal = summary ? summary.salesLast7Days.reduce((sum, d) => sum + d.total, 0) : 0;

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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        summary && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<DollarSign className="h-5 w-5" />} label="Ventas totales" value={formatPrice(summary.totalSales)} />
              <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Pedidos" value={summary.orderCount} />
              <StatCard icon={<Clock className="h-5 w-5" />} label="Pendientes de pago" value={summary.pendingOrders} />
              <StatCard icon={<Users className="h-5 w-5" />} label="Usuarios registrados" value={summary.userCount} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-1 text-heading">Stock bajo</h2>
                <p className="mb-3 text-small text-muted">
                  Productos con {summary.lowStockThreshold} unidades o menos.
                </p>
                {summary.lowStockProducts.length === 0 ? (
                  <p className="text-small text-muted">Ningún producto tiene stock bajo.</p>
                ) : (
                  <table className="w-full text-small">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th scope="col" className="py-2 font-semibold">Producto</th>
                        <th scope="col" className="py-2 text-right font-semibold">Stock</th>
                        <th scope="col" className="py-2 pl-3 font-semibold">Alerta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.lowStockProducts.map((product) => (
                        <tr key={product.name} className="border-b border-border last:border-0">
                          <td className="py-2 pr-2">{product.name}</td>
                          <td className="py-2 text-right font-semibold">{product.stock}</td>
                          <td className="py-2 pl-3">
                            <Badge variant={product.stock === 0 ? "neutral" : "danger"} className="whitespace-nowrap">
                              {product.stock === 0 ? "Agotado" : "Últimas unidades"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              <Card className="p-5">
                <h2 className="mb-1 text-heading">Más vendidos</h2>
                <p className="mb-3 text-small text-muted">Por unidades, solo pedidos pagados, enviados o entregados.</p>
                {summary.topProducts.length === 0 ? (
                  <p className="text-small text-muted">Todavía no hay ventas.</p>
                ) : (
                  <table className="w-full text-small">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th scope="col" className="py-2 font-semibold">Producto</th>
                        <th scope="col" className="py-2 text-right font-semibold">Unidades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.topProducts.map((product) => (
                        <tr key={product.name} className="border-b border-border last:border-0">
                          <td className="py-2 pr-2">{product.name}</td>
                          <td className="py-2 text-right font-semibold">{product.units}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>

            <Card className="p-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-heading">Ventas de los últimos 7 días</h2>
                <p className="text-small text-muted">Total: {formatPrice(weekTotal)}</p>
              </div>
              <table className="w-full text-small">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th scope="col" className="py-2 font-semibold">Día</th>
                    <th scope="col" className="w-1/2 py-2 font-semibold sr-only sm:not-sr-only">Ventas</th>
                    <th scope="col" className="py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.salesLast7Days.map((day) => (
                    <tr key={day.date} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap py-2 pr-3">{formatDay(day.date)}</td>
                      <td className="hidden py-2 pr-3 sm:table-cell">
                        <div className="h-2.5 w-full rounded-full bg-slate-100">
                          <div
                            className="h-2.5 rounded-full bg-accent-blue"
                            style={{ width: `${Math.round((day.total / maxDaily) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap py-2 text-right font-semibold">{formatPrice(day.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )
      )}
    </div>
  );
}

export default Dashboard;
