import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PackageSearch } from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

function TrackingSearch() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setError("Escribe tu código de seguimiento");
      return;
    }
    navigate(`/seguimiento/${encodeURIComponent(clean)}`);
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-blue-soft text-accent-blue">
              <PackageSearch className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-title">Rastrear pedido</h1>
          </div>
          <p className="text-small text-muted">
            Escribe el código de seguimiento que recibiste al comprar (por ejemplo TRK-AB12CD34). No necesitas iniciar sesión.
          </p>

          <Input
            label="Código de seguimiento"
            placeholder="TRK-XXXXXXXX"
            autoComplete="off"
            autoCapitalize="characters"
            value={code}
            error={error ?? undefined}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
          />

          <Button type="submit" className="w-full">
            Buscar pedido
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default TrackingSearch;
