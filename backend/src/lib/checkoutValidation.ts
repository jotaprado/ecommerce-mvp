import {
  DOCUMENT_TYPES,
  PERSON_TYPES,
  PICKUP_STORES,
  PSE_BANKS,
} from "../config/checkout";

export type DeliveryTypeValue = "shipping" | "pickup";

export type ShippingAddress = {
  name: string;
  phone: string;
  department: string;
  city: string;
  address: string;
  notes: string;
};

export type ValidatedPayment =
  | { method: "card"; number: string }
  | { method: "pse"; bank: string }
  | { method: "nequi"; code: string }
  | { method: "cash" };

export interface ValidatedCheckout {
  deliveryType: DeliveryTypeValue;
  shippingAddress: ShippingAddress | null;
  pickupStore: string | null;
  payment: ValidatedPayment;
}

type Result = { ok: true; data: ValidatedCheckout } | { ok: false; error: string };

const PHONE_REGEX = /^3\d{9}$/;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function digitsOnly(value: unknown): string {
  return typeof value === "string" ? value.replace(/[\s-]/g, "") : "";
}

export function passesLuhn(number: string): boolean {
  if (!/^\d{13,19}$/.test(number)) return false;
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = Number(number[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

// Acepta "MM/YY" o "MM/YYYY". El mes de vencimiento sigue siendo válido hasta su último día.
function isFutureExpiry(value: string): boolean {
  const match = /^(\d{2})\s*\/\s*(\d{2}|\d{4})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

function validateAddress(raw: unknown): { ok: true; data: ShippingAddress } | { ok: false; error: string } {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const data: ShippingAddress = {
    name: str(a.name),
    phone: digitsOnly(a.phone),
    department: str(a.department),
    city: str(a.city),
    address: str(a.address),
    notes: str(a.notes).slice(0, 300),
  };
  if (!data.name) return { ok: false, error: "El nombre de quien recibe es obligatorio" };
  if (!PHONE_REGEX.test(data.phone)) {
    return { ok: false, error: "El teléfono debe tener 10 dígitos y empezar por 3" };
  }
  if (!data.department) return { ok: false, error: "El departamento es obligatorio" };
  if (!data.city) return { ok: false, error: "La ciudad es obligatoria" };
  if (!data.address) return { ok: false, error: "La dirección es obligatoria" };
  return { ok: true, data };
}

function validatePayment(
  method: unknown,
  raw: unknown,
): { ok: true; data: ValidatedPayment } | { ok: false; error: string } {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  if (method === "card") {
    const number = digitsOnly(d.number);
    if (!passesLuhn(number)) return { ok: false, error: "Número de tarjeta inválido" };
    if (!isFutureExpiry(str(d.expiry))) {
      return { ok: false, error: "La tarjeta está vencida o la fecha es inválida (MM/AA)" };
    }
    if (!/^\d{3}$/.test(str(d.cvv))) return { ok: false, error: "El CVV debe tener 3 dígitos" };
    return { ok: true, data: { method: "card", number } };
  }

  if (method === "pse") {
    const bank = str(d.bank);
    if (!PSE_BANKS.includes(bank)) return { ok: false, error: "Selecciona un banco válido" };
    if (!PERSON_TYPES.some((p) => p.value === str(d.personType))) {
      return { ok: false, error: "Tipo de persona inválido" };
    }
    if (!DOCUMENT_TYPES.includes(str(d.documentType))) {
      return { ok: false, error: "Tipo de documento inválido" };
    }
    if (!/^\d{5,12}$/.test(str(d.documentNumber))) {
      return { ok: false, error: "El número de documento debe tener entre 5 y 12 dígitos" };
    }
    return { ok: true, data: { method: "pse", bank } };
  }

  if (method === "nequi") {
    if (!PHONE_REGEX.test(digitsOnly(d.phone))) {
      return { ok: false, error: "El celular de Nequi debe tener 10 dígitos y empezar por 3" };
    }
    const code = str(d.code);
    if (!/^\d{6}$/.test(code)) return { ok: false, error: "El código de Nequi debe tener 6 dígitos" };
    return { ok: true, data: { method: "nequi", code } };
  }

  if (method === "cash") {
    return { ok: true, data: { method: "cash" } };
  }

  return { ok: false, error: "Método de pago inválido" };
}

// Valida el body del checkout. Los valores monetarios del body se ignoran a propósito.
export function validateCheckoutInput(body: unknown): Result {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const deliveryType = b.deliveryType;
  if (deliveryType !== "shipping" && deliveryType !== "pickup") {
    return { ok: false, error: "Tipo de entrega inválido" };
  }

  let shippingAddress: ShippingAddress | null = null;
  let pickupStore: string | null = null;

  if (deliveryType === "shipping") {
    const address = validateAddress(b.shippingAddress);
    if (!address.ok) return address;
    shippingAddress = address.data;
  } else {
    const store = str(b.pickupStore);
    if (!PICKUP_STORES.some((s) => s.name === store)) {
      return { ok: false, error: "Selecciona una sede de recogida válida" };
    }
    pickupStore = store;
  }

  const payment = validatePayment(b.paymentMethod, b.paymentDetails);
  if (!payment.ok) return payment;

  return {
    ok: true,
    data: { deliveryType, shippingAddress, pickupStore, payment: payment.data },
  };
}
