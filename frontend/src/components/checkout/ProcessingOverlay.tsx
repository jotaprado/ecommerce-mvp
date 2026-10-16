import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PaymentMethod } from "../../lib/checkout";

function messagesFor(method: PaymentMethod, bank: string) {
  if (method === "card") return ["Validando tarjeta...", "Conectando con tu banco...", "Autorizando pago..."];
  if (method === "pse") return [`Redirigiendo a ${bank}...`, "Esperando confirmación del banco..."];
  if (method === "nequi") return ["Enviando solicitud a Nequi...", "Confirmando..."];
  return ["Registrando tu pedido..."];
}

function ProcessingOverlay({ method, bank }: { method: PaymentMethod; bank: string }) {
  const messages = messagesFor(method, bank);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => Math.min(i + 1, messages.length - 1)), 850);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-sm rounded-card bg-surface p-8 text-center shadow-card-hover"
      >
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-accent-blue" aria-hidden="true" />
        <p className="text-heading">{messages[index]}</p>
        <p className="mt-2 text-small text-muted">No cierres ni recargues esta página.</p>
      </div>
    </div>
  );
}

export default ProcessingOverlay;
