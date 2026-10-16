import { rateLimit } from "express-rate-limit";
import { errorBody } from "../lib/apiError";

// Login: 10 intentos fallidos cada 15 minutos por IP. Los logins correctos no cuentan,
// así que varias personas detrás de la misma IP pueden entrar sin bloquearse entre sí.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: errorBody("Demasiados intentos. Espera unos minutos e intenta de nuevo."),
});

// Seguimiento público de pedidos: 30 consultas por minuto por IP.
export const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: errorBody("Demasiadas consultas. Espera un minuto e intenta de nuevo."),
});
