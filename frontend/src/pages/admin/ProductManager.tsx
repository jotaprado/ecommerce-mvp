import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "../../lib/api";
import { Package } from "lucide-react";
import { formatPrice } from "../../lib/format";
import PanelNav from "../../components/PanelNav";
import ProductImage from "../../components/ProductImage";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Input, { fieldClasses } from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  brand: string;
  category: string;
  specs: Record<string, unknown>;
  stock: number;
  imageUrl: string;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  brand: string;
  category: string;
  stock: string;
  imageUrl: string;
  specs: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  brand: "",
  category: "",
  stock: "",
  imageUrl: "",
  specs: "{}",
};

function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function loadProducts() {
    setLoading(true);
    apiFetch("/products?take=200")
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los productos"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      brand: product.brand,
      category: product.category,
      stock: String(product.stock),
      imageUrl: product.imageUrl,
      specs: JSON.stringify(product.specs ?? {}),
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    let specs: Record<string, unknown>;
    try {
      specs = form.specs.trim() === "" ? {} : JSON.parse(form.specs);
    } catch {
      setError("Especificaciones inválidas: debe ser JSON válido");
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      brand: form.brand,
      category: form.category,
      stock: Number(form.stock),
      imageUrl: form.imageUrl,
      specs,
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      toast.success(editingId ? "Producto actualizado" : "Producto creado");
      cancelEdit();
      loadProducts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el producto";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`¿Eliminar "${product.name}"?`)) return;

    setError(null);
    try {
      await apiFetch(`/products/${product.id}`, { method: "DELETE" });
      toast.success("Producto eliminado");
      loadProducts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar el producto";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-title">Panel de administración</h1>
      <PanelNav />

      <Card className="mb-6 p-5">
        <h2 className="mb-3 text-heading">{editingId ? "Editar producto" : "Crear producto"}</h2>

        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-small text-danger">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input label="Nombre" required value={form.name} onChange={(e) => updateField("name", e.target.value)} />
          <Input label="Marca" required value={form.brand} onChange={(e) => updateField("brand", e.target.value)} />
          <Input label="Categoría" required value={form.category} onChange={(e) => updateField("category", e.target.value)} />
          <Input label="Imagen (URL)" required value={form.imageUrl} onChange={(e) => updateField("imageUrl", e.target.value)} />
          <Input label="Precio" type="number" required min="0" value={form.price} onChange={(e) => updateField("price", e.target.value)} />
          <Input label="Stock" type="number" required min="0" value={form.stock} onChange={(e) => updateField("stock", e.target.value)} />
          <Input
            label="Especificaciones (JSON opcional)"
            value={form.specs}
            onChange={(e) => updateField("specs", e.target.value)}
            className="md:col-span-2"
          />
          <div className="md:col-span-4">
            <label htmlFor="product-description" className="mb-1 block text-small font-medium">
              Descripción
            </label>
            <textarea
              id="product-description"
              required
              rows={2}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className={fieldClasses}
            />
          </div>

          <div className="flex gap-2 md:col-span-4">
            <Button type="submit" variant="primary" loading={saving}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear producto"}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={cancelEdit}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={<Package className="h-6 w-6" />} message="No hay productos todavía." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Producto</th>
                <th scope="col" className="px-4 py-3 font-semibold">Marca</th>
                <th scope="col" className="px-4 py-3 font-semibold">Categoría</th>
                <th scope="col" className="px-4 py-3 font-semibold">Precio</th>
                <th scope="col" className="px-4 py-3 font-semibold">Stock</th>
                <th scope="col" className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        category={product.category}
                        className="h-10 w-10 shrink-0 rounded-lg"
                      />
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{product.brand}</td>
                  <td className="px-4 py-3">{product.category}</td>
                  <td className="px-4 py-3">{formatPrice(product.price)}</td>
                  <td className="px-4 py-3">{product.stock}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(product)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product)}
                        className="!text-danger hover:!bg-red-50"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default ProductManager;
