import type { ReactNode } from "react";
import { Store, Truck } from "lucide-react";
import type { CheckoutConfig, CheckoutForm, DeliveryType } from "../../lib/checkout";
import { formatPrice } from "../../lib/format";
import Card from "../ui/Card";
import Input, { fieldClasses } from "../ui/Input";

interface DeliveryStepProps {
  form: CheckoutForm;
  config: CheckoutConfig;
  onChange: (form: CheckoutForm) => void;
}

function OptionCard({
  selected,
  onSelect,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-start gap-3 rounded-card border p-4 text-left transition-colors ${
        selected ? "border-accent-blue bg-accent-blue-soft" : "border-border bg-surface hover:bg-slate-50"
      }`}
    >
      <span className="mt-0.5 text-accent-blue">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-small text-muted">{description}</span>
      </span>
    </button>
  );
}

function DeliveryStep({ form, config, onChange }: DeliveryStepProps) {
  const setType = (deliveryType: DeliveryType) => onChange({ ...form, deliveryType });
  const setAddress = (key: keyof CheckoutForm["address"], value: string) =>
    onChange({ ...form, address: { ...form.address, [key]: value } });

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-heading">¿Cómo quieres recibir tu pedido?</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <OptionCard
          selected={form.deliveryType === "shipping"}
          onSelect={() => setType("shipping")}
          icon={<Truck className="h-5 w-5" />}
          title="Envío a domicilio"
          description={`${formatPrice(config.shipping.cost)}. Gratis en compras desde ${formatPrice(config.shipping.freeThreshold)}.`}
        />
        <OptionCard
          selected={form.deliveryType === "pickup"}
          onSelect={() => setType("pickup")}
          icon={<Store className="h-5 w-5" />}
          title="Recogida en tienda"
          description="Sin costo de envío. Elige una sede."
        />
      </div>

      {form.deliveryType === "shipping" ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Nombre de quien recibe"
            required
            autoComplete="name"
            value={form.address.name}
            onChange={(e) => setAddress("name", e.target.value)}
          />
          <Input
            label="Teléfono (10 dígitos)"
            required
            inputMode="numeric"
            autoComplete="tel"
            placeholder="3001234567"
            value={form.address.phone}
            onChange={(e) => setAddress("phone", e.target.value)}
          />
          <Input
            label="Departamento"
            required
            value={form.address.department}
            onChange={(e) => setAddress("department", e.target.value)}
          />
          <Input
            label="Ciudad"
            required
            value={form.address.city}
            onChange={(e) => setAddress("city", e.target.value)}
          />
          <Input
            label="Dirección"
            required
            autoComplete="street-address"
            className="sm:col-span-2"
            value={form.address.address}
            onChange={(e) => setAddress("address", e.target.value)}
          />
          <div className="sm:col-span-2">
            <label htmlFor="delivery-notes" className="mb-1 block text-small font-medium">
              Indicaciones (opcional)
            </label>
            <textarea
              id="delivery-notes"
              rows={2}
              maxLength={300}
              className={fieldClasses}
              value={form.address.notes}
              onChange={(e) => setAddress("notes", e.target.value)}
            />
          </div>
        </div>
      ) : (
        <fieldset className="mt-5">
          <legend className="mb-2 text-small font-medium">Sede de recogida</legend>
          <div className="space-y-3">
            {config.pickupStores.map((store) => (
              <label
                key={store.name}
                className={`flex cursor-pointer items-start gap-3 rounded-card border p-4 ${
                  form.pickupStore === store.name ? "border-accent-blue bg-accent-blue-soft" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="pickup-store"
                  className="mt-1"
                  checked={form.pickupStore === store.name}
                  onChange={() => onChange({ ...form, pickupStore: store.name })}
                />
                <span>
                  <span className="block font-semibold">{store.name}</span>
                  <span className="block text-small text-muted">{store.address}</span>
                  <span className="block text-small text-muted">{store.hours}</span>
                  {store.demo && <span className="text-xs text-muted">Sede ficticia de demostración</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </Card>
  );
}

export default DeliveryStep;
