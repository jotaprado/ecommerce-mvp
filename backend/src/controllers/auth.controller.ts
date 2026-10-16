import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { GENERIC_ERROR_MESSAGE, errorBody } from "../lib/apiError";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials(email: unknown, password: unknown): string | null {
  if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    return "Email inválido";
  }
  if (typeof password !== "string" || password.length < 8) {
    return "El password debe tener al menos 8 caracteres";
  }
  return null;
}

function signToken(user: { id: string; role: string }) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const validationError = validateCredentials(email, password);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }

    // El registro público siempre crea clientes: se ignora cualquier "role" del body.
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, role: "customer" },
    });

    const token = signToken(user);
    res.status(201).json({ token });
  } catch (error) {
    console.error("Error en register:", error);
    res.status(500).json(errorBody(GENERIC_ERROR_MESSAGE));
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const validationError = validateCredentials(email, password);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Se comprueba después de la contraseña para no revelar si la cuenta existe.
    if (!user.active) {
      return res.status(403).json({ error: "Cuenta desactivada" });
    }

    const token = signToken(user);
    res.json({ token });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json(errorBody(GENERIC_ERROR_MESSAGE));
  }
}
