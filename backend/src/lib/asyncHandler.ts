import { NextFunction, Request, RequestHandler, Response } from "express";

// Express 4 no captura los errores de handlers async: sin esto la petición queda colgada.
// Envuelve un controlador y reenvía cualquier rechazo al middleware global de errores.
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
