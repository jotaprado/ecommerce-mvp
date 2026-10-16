import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { PackageSearch, ShoppingCart } from "lucide-react";
import { apiFetch } from "../lib/api";
import { addToCart } from "../lib/cart";
import { formatPrice } from "../lib/format";
import { STORE_NAME } from "../config";
import ProductImage from "../components/ProductImage";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";

interface Product {
  id: string;
  name: string;
  price: string;
  brand: string;
  category: string;
  imageUrl: string;
  stock: number;
}

interface Filters {
  category: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
}

const EMPTY_FILTERS: Filters = { category: "", brand: "", minPrice: "", maxPrice: "" };
const LOW_STOCK_THRESHOLD = 5;

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const toast = useToast();

  // Catálogo completo (sin filtros) solo para generar las categorías y marcas disponibles.
  useEffect(() => {
    apiFetch("/products?take=200")
      .then(setAllProducts)
      .catch(() => setAllProducts([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.minPrice) params.set("minPrice", filters.minPrice);
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
    params.set("take", "200");

    setLoading(true);
    setError(null);
    apiFetch(`/products?${params.toString()}`)
      .then((data) => setProducts(data))
      .catch((err) => {
        setProducts([]);
        setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo");
      })
      .finally(() => setLoading(false));
  }, [filters]);

  const categories = useMemo(
    () => Array.from(new Set(allProducts.map((p) => p.category))).sort(),
    [allProducts],
  );
  const brands = useMemo(
    () => Array.from(new Set(allProducts.map((p) => p.brand))).sort(),
    [allProducts],
  );

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAddToCart(e: MouseEvent, product: Product) {
    e.preventDefault();
    e.stopPropagation();

    try {
      await addToCart(product.id, 1);
      toast.success(`"${product.name}" se agregó al carrito`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo agregar al carrito");
    }
  }

  return (
    <div>
      <section className="mb-8 rounded-card bg-gradient-to-br from-accent-blue to-accent-blue-active px-6 py-10 text-white sm:px-10 sm:py-14">
        <h1 className="text-title sm:text-4xl">Tecnología al mejor precio</h1>
        <p className="mt-2 max-w-xl text-body text-blue-100">
          Laptops, celulares, audio y más en {STORE_NAME}. Encuentra lo que necesitas y recíbelo
          con seguimiento de tu pedido.
        </p>
      </section>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Categorías">
        <button
          onClick={() => updateFilter("category", "")}
          aria-pressed={filters.category === ""}
          className={`rounded-full border px-4 py-1.5 text-small font-medium transition-colors ${
            filters.category === ""
              ? "border-accent-blue bg-accent-blue text-white"
              : "border-border bg-surface text-text-primary hover:bg-slate-100"
          }`}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => updateFilter("category", category)}
            aria-pressed={filters.category === category}
            className={`rounded-full border px-4 py-1.5 text-small font-medium transition-colors ${
              filters.category === category
                ? "border-accent-blue bg-accent-blue text-white"
                : "border-border bg-surface text-text-primary hover:bg-slate-100"
            }`}
          >
            {capitalize(category)}
          </button>
        ))}
      </div>

      <Card className="mb-6 grid grid-cols-2 items-end gap-3 p-4 md:grid-cols-5">
        <Select
          label="Marca"
          value={filters.brand}
          onChange={(e) => updateFilter("brand", e.target.value)}
          className="col-span-2 md:col-span-1"
        >
          <option value="">Todas</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </Select>
        <Input
          label="Precio mínimo"
          type="number"
          min="0"
          value={filters.minPrice}
          onChange={(e) => updateFilter("minPrice", e.target.value)}
        />
        <Input
          label="Precio máximo"
          type="number"
          min="0"
          value={filters.maxPrice}
          onChange={(e) => updateFilter("maxPrice", e.target.value)}
        />
        <div className="col-span-2 md:col-span-2">
          <Button variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpiar filtros
          </Button>
        </div>
      </Card>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-small text-danger">
          {error}
        </p>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-3">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="mt-3 h-4 w-1/3" />
              <Skeleton className="mt-2 h-5 w-3/4" />
              <Skeleton className="mt-2 h-5 w-1/2" />
              <Skeleton className="mt-3 h-10 w-full" />
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <EmptyState
          icon={<PackageSearch className="h-6 w-6" />}
          message="No se encontraron productos con esos filtros."
          action={
            <Button variant="primary" onClick={() => setFilters(EMPTY_FILTERS)}>
              Limpiar filtros
            </Button>
          }
        />
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => {
            const soldOut = product.stock === 0;
            const lowStock = !soldOut && product.stock <= LOW_STOCK_THRESHOLD;

            return (
              <Card key={product.id} hoverable className="flex flex-col p-3">
                <Link to={`/product/${product.id}`} className="flex-1 rounded-lg">
                  <div className="relative">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      category={product.category}
                      className={`aspect-square w-full rounded-lg ${soldOut ? "opacity-60" : ""}`}
                    />
                    {(soldOut || lowStock) && (
                      <Badge
                        variant={soldOut ? "neutral" : "danger"}
                        className="absolute left-2 top-2"
                      >
                        {soldOut ? "Agotado" : "Últimas unidades"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">
                    {product.brand}
                  </p>
                  <p className="font-semibold text-text-primary">{product.name}</p>
                  <p className="mb-3 mt-1 text-heading text-accent-blue">
                    {formatPrice(product.price)}
                  </p>
                </Link>

                <Button
                  variant="cta"
                  disabled={soldOut}
                  onClick={(e) => handleAddToCart(e, product)}
                  icon={<ShoppingCart className="h-4 w-4" aria-hidden="true" />}
                >
                  {soldOut ? "Agotado" : "Añadir al carrito"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Catalog;
