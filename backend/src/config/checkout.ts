// Reglas y datos de demostración del checkout. El frontend las lee desde
// GET /api/checkout/config para no duplicarlas.

export const SHIPPING_COST = 15000;
export const FREE_SHIPPING_THRESHOLD = 500000;

// Sedes ficticias, solo para la demo.
export const PICKUP_STORES = [
  {
    name: "Sede Popayán Centro",
    address: "Calle 5 # 4-20, Centro, Popayán (dirección de ejemplo)",
    hours: "Lunes a sábado, 9:00 a 18:00",
    demo: true,
  },
  {
    name: "Sede Cartagena Bocagrande",
    address: "Carrera 2 # 8-45, Bocagrande, Cartagena (dirección de ejemplo)",
    hours: "Lunes a domingo, 10:00 a 20:00",
    demo: true,
  },
];

export const REJECTING_PSE_BANK = "Banco de Prueba (rechaza)";
export const PSE_BANKS = [
  "Bancolombia",
  "Davivienda",
  "Banco de Bogotá",
  "BBVA",
  "Banco de Occidente",
  REJECTING_PSE_BANK,
];
export const PERSON_TYPES = [
  { value: "natural", label: "Persona natural" },
  { value: "juridica", label: "Persona jurídica" },
];
export const DOCUMENT_TYPES = ["CC", "CE", "NIT", "PP"];

// Tarjetas de prueba y su comportamiento (la lógica vive en lib/payment.ts).
export const CARD_VISA_OK = "4242424242424242";
export const CARD_MASTERCARD_OK = "5555555555554444";
export const CARD_LIMITED = "4111111111111111";
export const CARD_NO_FUNDS = "4000000000000341";
export const CARD_DECLINED = "4000000000000002";
export const LIMITED_CARD_MAX_AMOUNT = 1000000;

export const NEQUI_REJECT_CODE = "000000";
export const NEQUI_APPROVE_CODE = "123456";

export const TEST_DATA = {
  cards: [
    { number: CARD_VISA_OK, label: "Visa", outcome: "Aprueba siempre" },
    { number: CARD_MASTERCARD_OK, label: "Mastercard", outcome: "Aprueba siempre" },
    { number: CARD_LIMITED, label: "Visa (cupo limitado)", outcome: "Aprueba solo hasta $1.000.000" },
    { number: CARD_NO_FUNDS, label: "Visa", outcome: "Rechaza: fondos insuficientes" },
    { number: CARD_DECLINED, label: "Visa", outcome: "Rechaza: tarjeta rechazada por el banco emisor" },
  ],
  expiry: "12/34",
  cvv: "123",
  pse: { rejectBank: REJECTING_PSE_BANK, documentNumber: "1061000000" },
  nequi: {
    phone: "3001234567",
    approveCode: NEQUI_APPROVE_CODE,
    rejectCode: NEQUI_REJECT_CODE,
  },
};
