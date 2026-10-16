import { NextFunction, Request, Response } from "express";
import { GENERIC_ERROR_MESSAGE, errorBody } from "../lib/apiError";

// Middleware global de errores (debe registrarse al final). Registra el error en el servidor
// (nunca el body de la petición: puede traer contraseñas o datos de pago) y responde 500 genérico.
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  console.error(`Error no controlado en ${req.method} ${req.path}:`, error);

  if (res.headersSent) return;
  res.status(500).json(errorBody(GENERIC_ERROR_MESSAGE));
}
