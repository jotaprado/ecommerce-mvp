import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { GENERIC_ERROR_MESSAGE, errorBody } from "../lib/apiError";

export interface AuthUser {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const token = header.slice("Bearer ".length);

  let payload: { id?: unknown };
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET as string) as { id?: unknown };
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  if (typeof payload.id !== "string") {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  try {
    // El rol y el estado se leen de la BD (no del token): los cambios de rol y las
    // desactivaciones aplican al instante, incluso con tokens ya emitidos.
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, role: true, active: true },
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: "Cuenta desactivada o inexistente" });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    console.error("Error en authMiddleware:", error);
    return res.status(500).json(errorBody(GENERIC_ERROR_MESSAGE));
  }
}
