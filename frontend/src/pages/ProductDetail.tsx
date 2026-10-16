import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Minus, PackageX, Plus, ShoppingCart } from "lucide-react";
import { apiFetch } from "../lib/api";
import { addToCart } from "../lib/cart";
import { formatPrice } from "../lib/format";
import ProductImage from "../components/ProductImage";
import Badge from "../components/ui/Badge";
import Button, { buttonClasses } from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  brand: string;
  category: string;
  specs: Record<string, string | number | boolean>;
  stock: number;
  imageUrl: string;
}

const LOW_STOCK_THRESHOLD = 5;

function formatSpecValue(value: string | number | boolean) {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    apiFetch(`/products/${id}`)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAddToCart() {
    if (!product) return;
    setAdding(true);

    try {
      await addToCart(product.id, quantity);
      toast.success(`"${product.name}" se agregó al carrito`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo agregar al carrito");
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <Card className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Card>
    );
  }

  if (!product) {
    return (
      <EmptyState
        icon={<PackageX className="h-6 w-6" />}
        message="Producto no encontrado."
        action={
          <Link to="/" className={buttonClasses("primary")}>
            Volver al catálogo
          </Link>
        }
      />
    );
  }

  const soldOut = product.stock === 0;
  const lowStock = !soldOut && product.stock <= LOW_STOCK_THRESHOLD;
  const specs = Object.entries(product.specs ?? {});

  return (
    <div>
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-small font-medium text-accent-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al catálogo
      </Link>

      <Card className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          category={product.category}
          className="aspect-square w-full rounded-lg"
        />

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {product.brand} · {product.category}
            </p>
            <h1 className="mt-1 text-title">{product.name}</h1>
          </div>

          <p className="text-3xl font-bold text-accent-blue">{formatPrice(product.price)}</p>

          {soldOut && <Badge variant="danger" className="w-fit">Agotado</Badge>}
          {lowStock && <Badge variant="danger" className="w-fit">Últimas unidades ({product.stock})</Badge>}

          <p className="text-body text-muted">{product.description}</p>

          {specs.length > 0 && (
            <div>
              <h2 className="mb-2 text-heading">Especificaciones</h2>
              <table className="w-full overflow-hidden rounded-lg border border-border text-small">
                <tbody>
                  {specs.map(([key, value]) => (
                    <tr key={key} className="border-b border-border last:border-0 even:bg-slate-50">
                      <th scope="row" className="w-1/3 px-3 py-2 text-left font-medium capitalize text-muted">
                        {key}
                      </th>
                      <td className="px-3 py-2">{formatSpecValue(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!soldOut && (
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2" role="group" aria-label="Cantidad">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Disminuir cantidad"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="border border-border"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold" aria-live="polite">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Aumentar cantidad"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                  className="border border-border"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="cta"
                loading={adding}
                onClick={handleAddToCart}
                icon={<ShoppingCart className="h-4 w-4" aria-hidden="true" />}
              >
                Añadir al carrito
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ProductDetail;
