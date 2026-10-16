import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Info } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { getCart, notifyCartUpdated } from "../lib/cart";
import type { CartLine } from "../lib/cart";
import {
  INITIAL_FORM,
  buildPayload,
  shippingCostFor,
  validateDelivery,
  validatePayment,
} from "../lib/checkout";
import type { CheckoutConfig, CheckoutForm } from "../lib/checkout";
import DeliveryStep from "../components/checkout/DeliveryStep";
import OrderSummary from "../components/checkout/OrderSummary";
import PaymentStep from "../components/checkout/PaymentStep";
import ProcessingOverlay from "../components/checkout/ProcessingOverlay";
import ReviewStep from "../components/checkout/ReviewStep";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";

const STEPS = ["Entrega", "Pago", "Confirmar"];
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Pasos del checkout">
      {STEPS.map((label, i) => {
        const number = i + 1;
        const done = number < step;
        const current = number === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-small font-semibold ${
                done || current ? "bg-accent-blue text-white" : "bg-slate-200 text-muted"
              }`}
            >
              {done ? <Check className="h-4 w-4" aria-hidden="true" /> : number}
            </span>
            <span className={`text-small font-medium ${current ? "text-text-primary" : "text-muted"}`}>{label}</span>
            {number < STEPS.length && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function Checkout() {
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CheckoutForm>(INITIAL_FORM);
  const [stepError, setStepError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    Promise.all([apiFetch("/checkout/config"), getCart()])
      .then(([cfg, cart]) => {
        if (cart.length === 0) {
          toast.error("Tu carrito está vacío");
          navigate("/", { replace: true });
          return;
        }
        setConfig(cfg);
        setLines(cart);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "No se pudo cargar el checkout");
        navigate("/cart", { replace: true });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !config) {
    return (
      <div>
        <Skeleton className="mb-6 h-10 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 w-full lg:col-span-2" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  const subtotal = lines.reduce((sum, l) => sum + Number(l.product.price) * l.quantity, 0);
  const isShipping = form.deliveryType === "shipping";
  const shippingCost = shippingCostFor(subtotal, form.deliveryType, config);

  // Al editar, se quita el mensaje de validación anterior.
  function updateForm(next: CheckoutForm) {
    setForm(next);
    setStepError(null);
  }

  function goNext() {
    setStepError(null);
    const error = step === 1 ? validateDelivery(form) : validatePayment(form);
    if (error) {
      setStepError(error);
      return;
    }
    setPaymentError(null);
    setStep((s) => s + 1);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setSubmitError(null);
    setPaymentError(null);

    // Duración mínima visible de la pantalla de procesamiento.
    const minMs = form.method === "cash" ? 1200 : 2600;
    const started = Date.now();
    let order: { id: string } | null = null;
    let failure: unknown = null;

    try {
      order = await apiFetch("/orders/checkout", { method: "POST", body: JSON.stringify(buildPayload(form)) });
    } catch (err) {
      failure = err;
    }

    const remaining = minMs - (Date.now() - started);
    if (remaining > 0) await delay(remaining);

    if (order) {
      notifyCartUpdated();
      toast.success("¡Pedido realizado!");
      navigate(`/order/${order.id}`, { replace: true });
      return;
    }

    const message = failure instanceof Error ? failure.message : "No se pudo completar el pedido";
    if (failure instanceof ApiError && failure.status === 402) {
      // Pago rechazado: vuelve al paso de pago, conserva lo escrito (menos el CVV) y permite reintentar.
      setPaymentError(`Pago rechazado: ${message}. Revisa tus datos o prueba con otro método.`);
      setForm((f) => ({ ...f, card: { ...f.card, cvv: "" } }));
      setStep(2);
    } else {
      setSubmitError(message);
      toast.error(message);
    }
    setSubmitting(false);
  }

  const confirmLabel = form.method === "cash" ? "Confirmar pedido" : "Confirmar y pagar";

  return (
    <div>
      <h1 className="mb-4 text-title">Checkout</h1>

      <p className="mb-6 flex items-start gap-2 rounded-lg bg-accent-blue-soft px-4 py-3 text-small text-accent-blue-active">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Pagos simulados: no se realiza ningún cobro real.
      </p>

      <Stepper step={step} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {step === 1 && <DeliveryStep form={form} config={config} onChange={updateForm} />}
          {step === 2 && <PaymentStep form={form} config={config} error={paymentError} onChange={updateForm} />}
          {step === 3 && <ReviewStep form={form} error={submitError} />}

          {stepError && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-small font-medium text-danger">
              {stepError}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            {step > 1 ? (
              <Button variant="ghost" disabled={submitting} onClick={() => { setStepError(null); setStep((s) => s - 1); }}>
                Atrás
              </Button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <Button variant="primary" onClick={goNext}>
                Continuar
              </Button>
            ) : (
              <Button variant="cta" disabled={submitting} onClick={handleConfirm}>
                {confirmLabel}
              </Button>
            )}
          </div>
        </div>

        <OrderSummary
          lines={lines}
          subtotal={subtotal}
          shippingCost={shippingCost}
          freeThreshold={config.shipping.freeThreshold}
          isShipping={isShipping}
        />
      </div>

      {submitting && <ProcessingOverlay method={form.method} bank={form.pse.bank} />}
    </div>
  );
}

export default Checkout;
