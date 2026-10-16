import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { AUTH_NOTICE_KEY, saveToken } from "../lib/auth";
import { getGuestCart, clearGuestCart } from "../lib/guestCart";
import { notifyCartUpdated } from "../lib/cart";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    try {
      const notice = sessionStorage.getItem(AUTH_NOTICE_KEY);
      sessionStorage.removeItem(AUTH_NOTICE_KEY);
      return notice;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { token } = await apiFetch("/auth/login", {
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
      toast.success("Sesión iniciada");
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";
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
          <h1 className="text-title">Iniciar sesión</h1>

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
            label="Contraseña"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" loading={loading} className="w-full">
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>

          <p className="text-center text-small text-muted">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="font-medium text-accent-blue hover:underline">
              Regístrate
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}

export default Login;
