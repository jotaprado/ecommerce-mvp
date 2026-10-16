import { randomUUID } from "node:crypto";
import {
  CARD_DECLINED,
  CARD_NO_FUNDS,
  LIMITED_CARD_MAX_AMOUNT,
  CARD_LIMITED,
  NEQUI_REJECT_CODE,
  REJECTING_PSE_BANK,
} from "../config/checkout";

// Punto único de integración con una pasarela de pago real en el futuro.
// Por ahora simula las respuestas de un banco con reglas deterministas.
// IMPORTANTE: los datos recibidos (número de tarjeta, CVV, código) solo viven en memoria
// durante esta llamada; no se guardan ni se registran en logs.

export type GatewayMethod = "card" | "pse" | "nequi";

export type PaymentDetails =
  | { number: string }
  | { bank: string }
  | { code: string };

export interface PaymentResult {
  approved: boolean;
  reference: string;
  reason?: string;
  brand?: string;
  last4?: string;
}

const SIMULATED_LATENCY_MS = 2000;

function detectBrand(number: string): string {
  if (number.startsWith("4")) return "Visa";
  const prefix2 = Number(number.slice(0, 2));
  if (prefix2 >= 51 && prefix2 <= 55) return "Mastercard";
  return "Tarjeta";
}

function decideCard(amount: number, number: string): { approved: boolean; reason?: string } {
  if (number === CARD_NO_FUNDS) return { approved: false, reason: "Fondos insuficientes" };
  if (number === CARD_DECLINED) {
    return { approved: false, reason: "Tarjeta rechazada por el banco emisor" };
  }
  if (number === CARD_LIMITED && amount > LIMITED_CARD_MAX_AMOUNT) {
    return { approved: false, reason: "Fondos insuficientes" };
  }
  return { approved: true };
}

export async function processPayment(
  amount: number,
  method: GatewayMethod,
  details: PaymentDetails,
): Promise<PaymentResult> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  const reference = `MOCK-${randomUUID()}`;

  if (method === "card") {
    const number = (details as { number: string }).number;
    const brand = detectBrand(number);
    const last4 = number.slice(-4);
    const decision = decideCard(amount, number);
    return { ...decision, reference, brand, last4 };
  }

  if (method === "pse") {
    const bank = (details as { bank: string }).bank;
    if (bank === REJECTING_PSE_BANK) {
      return { approved: false, reference, reason: "Transacción rechazada por el banco" };
    }
    return { approved: true, reference };
  }

  const code = (details as { code: string }).code;
  if (code === NEQUI_REJECT_CODE) {
    return { approved: false, reference, reason: "Código inválido o saldo insuficiente" };
  }
  return { approved: true, reference };
}
