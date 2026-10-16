import type { ReactNode } from "react";
import type { CheckoutForm } from "../../lib/checkout";
import { cashLabel, deliveryLabel, detectBrand, digits } from "../../lib/checkout";
import Card from "../ui/Card";

function paymentSummary(form: CheckoutForm) {
  if (form.method === "card") {
    const last4 = digits(form.card.number).slice(-4);
    return `${detectBrand(form.card.number)} terminada en ${last4}`;
  }
  if (form.method === "pse") return `PSE · ${form.pse.bank}`;
  if (form.method === "nequi") return `Nequi · ${form.nequi.phone}`;
  return `${cashLabel(form.deliveryType)} (pendiente de pago)`;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-border py-3 text-small last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function ReviewStep({ form, error }: { form: CheckoutForm; error: string | null }) {
  const a = form.address;

  return (
    <Card className="p-5">
      <h2 className="mb-2 text-heading">Revisa tu pedido</h2>

      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-small font-medium text-danger">
          {error}
        </p>
      )}

      <dl>
        <Row label="Entrega">{deliveryLabel(form.deliveryType)}</Row>
        {form.deliveryType === "shipping" ? (
          <Row label="Dirección">
            {a.name} · {a.phone}
            <br />
            {a.address}, {a.city}, {a.department}
            {a.notes && (
              <>
                <br />
                <span className="text-muted">Indicaciones: {a.notes}</span>
              </>
            )}
          </Row>
        ) : (
          <Row label="Sede">{form.pickupStore}</Row>
        )}
        <Row label="Pago">{paymentSummary(form)}</Row>
      </dl>
    </Card>
  );
}

export default ReviewStep;
