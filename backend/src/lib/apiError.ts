// Cuerpo de error de los handlers nuevos: incluye "error" (clave que ya usa todo el API)
// y "message", para que cualquier cliente lo lea sin cambiar contratos existentes.
export function errorBody(message: string) {
  return { error: message, message };
}

export const GENERIC_ERROR_MESSAGE = "Ocurrió un error inesperado. Intenta de nuevo.";
