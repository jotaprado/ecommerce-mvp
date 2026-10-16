export type DeliveryType = "shipping" | "pickup";
export type PaymentMethod = "card" | "pse" | "nequi" | "cash";

export interface PickupStore {
  name: string;
  address: string;
  hours: string;
  demo: boolean;
}

export interface CheckoutConfig {
  shipping: { cost: number; freeThreshold: number };
  pickupStores: PickupStore[];
  pseBanks: string[];
  personTypes: { value: string; label: string }[];
  documentTypes: string[];
  testData: {
    cards: { number: string; label: string; outcome: string }[];
    expiry: string;
    cvv: string;
    pse: { rejectBank: string; documentNumber: string };
    nequi: { phone: string; approveCode: string; rejectCode: string };
  };
}

export interface AddressForm {
  name: string;
  phone: string;
  department: string;
  city: string;
  address: string;
  notes: string;
}

export interface CheckoutForm {
  deliveryType: DeliveryType;
  address: AddressForm;
  pickupStore: string;
  method: PaymentMethod;
  card: { number: string; expiry: string; cvv: string };
  pse: { bank: string; personType: string; documentType: string; documentNumber: string };
  nequi: { phone: string; code: string };
}

export const INITIAL_FORM: CheckoutForm = {
  deliveryType: "shipping",
  address: { name: "", phone: "", department: "", city: "", address: "", notes: "" },
  pickupStore: "",
  method: "card",
  card: { number: "", expiry: "", cvv: "" },
  pse: { bank: "", personType: "natural", documentType: "CC", documentNumber: "" },
  nequi: { phone: "", code: "" },
};

const PHONE_REGEX = /^3\d{9}$/;

export function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCardNumber(value: string) {
  return digits(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatExpiry(value: string) {
  const d = digits(value).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function detectBrand(number: string) {
  const n = digits(number);
  if (n.startsWith("4")) return "Visa";
  const p = Number(n.slice(0, 2));
  if (p >= 51 && p <= 55) return "Mastercard";
  return "Tarjeta";
}

export function passesLuhn(number: string) {
  if (!/^\d{13,19}$/.test(number)) return false;
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let d = Number(number[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function isFutureExpiry(value: string) {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

export function shippingCostFor(subtotal: number, type: DeliveryType, config: CheckoutConfig) {
  if (type !== "shipping") return 0;
  return subtotal >= config.shipping.freeThreshold ? 0 : config.shipping.cost;
}

// Devuelve un mensaje de error o null. El servidor valida de nuevo: esto solo mejora la experiencia.
export function validateDelivery(form: CheckoutForm): string | null {
  if (form.deliveryType === "pickup") {
    return form.pickupStore ? null : "Selecciona una sede de recogida";
  }
  const a = form.address;
  if (!a.name.trim()) return "Escribe el nombre de quien recibe";
  if (!PHONE_REGEX.test(digits(a.phone))) return "El teléfono debe tener 10 dígitos y empezar por 3";
  if (!a.department.trim()) return "Escribe el departamento";
  if (!a.city.trim()) return "Escribe la ciudad";
  if (!a.address.trim()) return "Escribe la dirección";
  return null;
}

export function validatePayment(form: CheckoutForm): string | null {
  if (form.method === "card") {
    if (!passesLuhn(digits(form.card.number))) return "El número de tarjeta no es válido";
    if (!isFutureExpiry(form.card.expiry)) return "La fecha de vencimiento es inválida o la tarjeta está vencida";
    if (!/^\d{3}$/.test(form.card.cvv)) return "El CVV debe tener 3 dígitos";
  }
  if (form.method === "pse") {
    if (!form.pse.bank) return "Selecciona tu banco";
    if (!/^\d{5,12}$/.test(form.pse.documentNumber)) return "El documento debe tener entre 5 y 12 dígitos";
  }
  if (form.method === "nequi") {
    if (!PHONE_REGEX.test(digits(form.nequi.phone))) return "El celular de Nequi debe tener 10 dígitos y empezar por 3";
    if (!/^\d{6}$/.test(form.nequi.code)) return "El código de Nequi debe tener 6 dígitos";
  }
  return null;
}

// Solo se envían entrega y datos de pago: nunca montos (los calcula el servidor).
export function buildPayload(form: CheckoutForm) {
  const delivery =
    form.deliveryType === "shipping"
      ? { deliveryType: "shipping", shippingAddress: { ...form.address, phone: digits(form.address.phone) } }
      : { deliveryType: "pickup", pickupStore: form.pickupStore };

  let paymentDetails: unknown = undefined;
  if (form.method === "card") {
    paymentDetails = { number: digits(form.card.number), expiry: form.card.expiry, cvv: form.card.cvv };
  } else if (form.method === "pse") {
    paymentDetails = form.pse;
  } else if (form.method === "nequi") {
    paymentDetails = { phone: digits(form.nequi.phone), code: form.nequi.code };
  }

  return { ...delivery, paymentMethod: form.method, paymentDetails };
}

export function cashLabel(type: DeliveryType | null | undefined) {
  return type === "pickup" ? "Pago en tienda" : "Contra entrega";
}

// Etiquetas para pedidos ya creados (los antiguos tienen entrega y pago nulos: se muestra "—").
export function deliveryLabel(type: string | null | undefined) {
  if (type === "shipping") return "Domicilio";
  if (type === "pickup") return "Recogida en tienda";
  return "—";
}

export function paymentLabel(
  payment: { method?: string | null; cardBrand?: string | null; cardLast4?: string | null } | null | undefined,
  deliveryType?: string | null,
) {
  if (!payment?.method) return "—";
  if (payment.method === "card") {
    return `${payment.cardBrand ?? "Tarjeta"} •••• ${payment.cardLast4 ?? ""}`.trim();
  }
  if (payment.method === "pse") return "PSE";
  if (payment.method === "nequi") return "Nequi";
  if (payment.method === "cash") return cashLabel(deliveryType as DeliveryType | null);
  return payment.method;
}
