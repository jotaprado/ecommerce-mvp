import type { CartLine } from "../../lib/cart";
import { formatPrice } from "../../lib/format";
import ProductImage from "../ProductImage";
import Card from "../ui/Card";

interface OrderSummaryProps {
  lines: CartLine[];
  subtotal: number;
  shippingCost: number;
  freeThreshold: number;
  isShipping: boolean;
}

function OrderSummary({ lines, subtotal, shippingCost, freeThreshold, isShipping }: OrderSummaryProps) {
  const missing = freeThreshold - subtotal;

  return (
    <Card className="h-fit p-5">
      <h2 className="mb-4 text-heading">Resumen del pedido</h2>

      <ul className="mb-4 space-y-3">
        {lines.map((line) => (
          <li key={line.id} className="flex items-center gap-3">
            <ProductImage
              src={line.product.imageUrl}
              alt={line.product.name}
              className="h-12 w-12 shrink-0 rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-small font-medium">{line.product.name}</p>
              <p className="text-xs text-muted">Cantidad: {line.quantity}</p>
            </div>
            <p className="text-small font-semibold">
              {formatPrice(Number(line.product.price) * line.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="space-y-2 border-t border-border pt-4 text-small">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Envío</dt>
          <dd>{!isShipping ? "Recogida: $0" : shippingCost === 0 ? "Gratis" : formatPrice(shippingCost)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-3 text-body font-semibold">
          <dt>Total</dt>
          <dd className="text-heading">{formatPrice(subtotal + shippingCost)}</dd>
        </div>
      </dl>

      {isShipping && missing > 0 && (
        <p className="mt-3 text-xs text-muted">
          Envío gratis en compras desde {formatPrice(freeThreshold)}. Te faltan {formatPrice(missing)}.
        </p>
      )}
    </Card>
  );
}

export default OrderSummary;
