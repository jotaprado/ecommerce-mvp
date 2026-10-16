import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { getCart, notifyCartUpdated, removeFromCart, updateCartQuantity } from "../lib/cart";
import type { CartLine } from "../lib/cart";
import { apiFetch } from "../lib/api";
import { formatPrice } from "../lib/format";
import ProductImage from "../components/ProductImage";
import Button, { buttonClasses } from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";

function Cart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  function loadCart() {
    setLoading(true);
    getCart()
      .then(setLines)
      .catch((err) => toast.error(err instanceof Error ? err.message : "No se pudo cargar el carrito"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function handleQuantityChange(line: CartLine, quantity: number) {
    try {
      await updateCartQuantity(line, quantity);
      loadCart();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar la cantidad");
    }
  }

  async function handleRemove(line: CartLine) {
    try {
      await removeFromCart(line);
      loadCart();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el producto");
    }
  }

  async function handleCheckout() {
    setCheckoutError(null);
    setCheckingOut(true);

    try {
      const order = await apiFetch("/orders/checkout", { method: "POST" });
      notifyCartUpdated();
      navigate(`/order/${order.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo completar el pago";
      setCheckoutError(message);
      toast.error(message);
      setCheckingOut(false);
    }
  }

  const total = lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-title">Carrito</h1>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div>
        <h1 className="mb-6 text-title">Carrito</h1>
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          message="Tu carrito está vacío."
          action={
            <Link to="/" className={buttonClasses("primary")}>
              Ir al catálogo
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-title">Carrito</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {lines.map((line) => (
            <Card key={line.id} className="flex flex-wrap items-center gap-4 p-3 sm:flex-nowrap">
              <ProductImage
                src={line.product.imageUrl}
                alt={line.product.name}
                className="h-20 w-20 shrink-0 rounded-lg"
              />

              <div className="min-w-0 flex-1">
                <p className="font-semibold">{line.product.name}</p>
                <p className="text-small text-muted">{formatPrice(line.product.price)}</p>
              </div>

              <div className="flex items-center gap-2" role="group" aria-label="Cantidad">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Disminuir cantidad"
                  onClick={() => handleQuantityChange(line, line.quantity - 1)}
                  className="border border-border"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center font-semibold">{line.quantity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Aumentar cantidad"
                  onClick={() => handleQuantityChange(line, line.quantity + 1)}
                  className="border border-border"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <p className="w-28 text-right font-semibold">
                {formatPrice(Number(line.product.price) * line.quantity)}
              </p>

              <button
                onClick={() => handleRemove(line)}
                aria-label={`Eliminar ${line.product.name}`}
                className="rounded-lg p-2 text-danger hover:bg-red-50"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </Card>
          ))}
        </div>

        <Card className="h-fit p-5">
          <h2 className="mb-4 text-heading">Resumen</h2>
          <div className="mb-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-body font-semibold">Total</span>
            <span className="text-heading">{formatPrice(total)}</span>
          </div>

          {checkoutError && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-small text-danger">
              {checkoutError}
            </p>
          )}

          <Button
            variant="cta"
            loading={checkingOut}
            onClick={handleCheckout}
            className="w-full"
            icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
          >
            {checkingOut ? "Procesando..." : "Ir a pagar"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

export default Cart;
