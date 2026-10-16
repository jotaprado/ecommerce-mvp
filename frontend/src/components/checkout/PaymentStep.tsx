import { Banknote, CreditCard, Landmark, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import type { CheckoutConfig, CheckoutForm, PaymentMethod } from "../../lib/checkout";
import { cashLabel, formatCardNumber, formatExpiry } from "../../lib/checkout";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import Select from "../ui/Select";

interface PaymentStepProps {
  form: CheckoutForm;
  config: CheckoutConfig;
  error: string | null;
  onChange: (form: CheckoutForm) => void;
}

function MethodOption({
  selected,
  onSelect,
  icon,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-center gap-2 rounded-card border px-4 py-3 text-small font-semibold transition-colors ${
        selected ? "border-accent-blue bg-accent-blue-soft text-accent-blue" : "border-border bg-surface hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PaymentStep({ form, config, error, onChange }: PaymentStepProps) {
  const test = config.testData;
  const setMethod = (method: PaymentMethod) => onChange({ ...form, method });
  const setCard = (key: keyof CheckoutForm["card"], value: string) =>
    onChange({ ...form, card: { ...form.card, [key]: value } });
  const setPse = (key: keyof CheckoutForm["pse"], value: string) =>
    onChange({ ...form, pse: { ...form.pse, [key]: value } });
  const setNequi = (key: keyof CheckoutForm["nequi"], value: string) =>
    onChange({ ...form, nequi: { ...form.nequi, [key]: value } });

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-heading">Método de pago</h2>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-small font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4" role="group" aria-label="Método de pago">
        <MethodOption selected={form.method === "card"} onSelect={() => setMethod("card")} icon={<CreditCard className="h-4 w-4" />} label="Tarjeta" />
        <MethodOption selected={form.method === "pse"} onSelect={() => setMethod("pse")} icon={<Landmark className="h-4 w-4" />} label="PSE" />
        <MethodOption selected={form.method === "nequi"} onSelect={() => setMethod("nequi")} icon={<Smartphone className="h-4 w-4" />} label="Nequi" />
        <MethodOption selected={form.method === "cash"} onSelect={() => setMethod("cash")} icon={<Banknote className="h-4 w-4" />} label={cashLabel(form.deliveryType)} />
      </div>

      {form.method === "card" && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Número de tarjeta"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            className="col-span-2"
            value={form.card.number}
            onChange={(e) => setCard("number", formatCardNumber(e.target.value))}
          />
          <Input
            label="Vencimiento (MM/AA)"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            value={form.card.expiry}
            onChange={(e) => setCard("expiry", formatExpiry(e.target.value))}
          />
          <Input
            label="CVV"
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={3}
            value={form.card.cvv}
            onChange={(e) => setCard("cvv", e.target.value.replace(/\D/g, "").slice(0, 3))}
          />
        </div>
      )}

      {form.method === "pse" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Banco" className="sm:col-span-2" value={form.pse.bank} onChange={(e) => setPse("bank", e.target.value)}>
            <option value="">Selecciona tu banco</option>
            {config.pseBanks.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </Select>
          <Select label="Tipo de persona" value={form.pse.personType} onChange={(e) => setPse("personType", e.target.value)}>
            {config.personTypes.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
          <Select label="Tipo de documento" value={form.pse.documentType} onChange={(e) => setPse("documentType", e.target.value)}>
            {config.documentTypes.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <Input
            label="Número de documento"
            inputMode="numeric"
            className="sm:col-span-2"
            value={form.pse.documentNumber}
            onChange={(e) => setPse("documentNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}
          />
        </div>
      )}

      {form.method === "nequi" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Celular de Nequi"
            inputMode="numeric"
            placeholder="3001234567"
            value={form.nequi.phone}
            onChange={(e) => setNequi("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
          <Input
            label="Código de aprobación (6 dígitos)"
            inputMode="numeric"
            value={form.nequi.code}
            onChange={(e) => setNequi("code", e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
      )}

      {form.method === "cash" && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-small text-muted">
          {form.deliveryType === "shipping"
            ? "Pagarás en efectivo cuando recibas tu pedido. Quedará en estado «Pendiente de pago»."
            : "Pagarás en la tienda al recoger tu pedido. Quedará en estado «Pendiente de pago»."}
        </p>
      )}

      <details className="mt-5 rounded-card border border-border bg-slate-50 p-4">
        <summary className="cursor-pointer text-small font-semibold">Datos de prueba (demo)</summary>
        <div className="mt-3 space-y-4 text-small">
          <div>
            <p className="mb-2 font-medium">Tarjetas (vencimiento {test.expiry}, CVV {test.cvv})</p>
            <ul className="space-y-2">
              {test.cards.map((card) => (
                <li key={card.number} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-mono">{formatCardNumber(card.number)}</span>{" "}
                    <span className="text-muted">· {card.outcome}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onChange({
                        ...form,
                        method: "card",
                        card: { number: formatCardNumber(card.number), expiry: test.expiry, cvv: test.cvv },
                      })
                    }
                  >
                    Usar
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-medium">PSE:</span> el banco «{test.pse.rejectBank}» rechaza; los demás aprueban.
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onChange({
                  ...form,
                  method: "pse",
                  pse: { bank: test.pse.rejectBank, personType: "natural", documentType: "CC", documentNumber: test.pse.documentNumber },
                })
              }
            >
              Usar (rechaza)
            </Button>
          </div>

          <div className="space-y-2">
            <p>
              <span className="font-medium">Nequi:</span> el código {test.nequi.rejectCode} rechaza; cualquier otro aprueba.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onChange({ ...form, method: "nequi", nequi: { phone: test.nequi.phone, code: test.nequi.approveCode } })}
              >
                Usar (aprueba)
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onChange({ ...form, method: "nequi", nequi: { phone: test.nequi.phone, code: test.nequi.rejectCode } })}
              >
                Usar (rechaza)
              </Button>
            </div>
          </div>
        </div>
      </details>
    </Card>
  );
}

export default PaymentStep;
