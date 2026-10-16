import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { DollarSign, ShoppingBag, Users } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import PanelNav from "../../components/PanelNav";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";

interface Summary {
  totalSales: string | number;
  orderCount: number;
  userCount: number;
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <Card className="flex items-center gap-4 p-6">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-blue-soft text-accent-blue">
        {icon}
      </div>
      <div>
        <p className="text-small text-muted">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </Card>
  );
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        summary && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              icon={<DollarSign className="h-6 w-6" />}
              label="Ventas totales"
              value={formatPrice(summary.totalSales)}
            />
            <StatCard
              icon={<ShoppingBag className="h-6 w-6" />}
              label="Pedidos"
              value={summary.orderCount}
            />
            <StatCard
              icon={<Users className="h-6 w-6" />}
              label="Usuarios registrados"
              value={summary.userCount}
            />
          </div>
        )
      )}
    </div>
  );
}

export default Dashboard;
