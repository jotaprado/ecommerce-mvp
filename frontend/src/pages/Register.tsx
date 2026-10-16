import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { saveToken } from "../lib/auth";
import { getGuestCart, clearGuestCart } from "../lib/guestCart";
import { notifyCartUpdated } from "../lib/cart";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { token } = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveToken(token);

      const guestCart = getGuestCart();
      if (guestCart.length > 0) {
        await apiFetch("/cart/merge", {
          method: "POST",
          body: JSON.stringify(guestCart),
        });
        clearGuestCart();
      }

      notifyCartUpdated();
      toast.success("Cuenta creada");
      // Vuelve a la página que quería el usuario (solo rutas internas).
      const next = searchParams.get("next");
      navigate(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al registrarse";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h1 className="text-title">Crear cuenta</h1>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-small text-danger">
              {error}
            </p>
          )}

          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Contraseña (mínimo 8 caracteres)"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" loading={loading} className="w-full">
            {loading ? "Creando cuenta..." : "Registrarme"}
          </Button>

          <p className="text-center text-small text-muted">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-medium text-accent-blue hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}

export default Register;
