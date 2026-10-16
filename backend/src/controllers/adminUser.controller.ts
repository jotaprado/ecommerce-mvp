import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { wouldLeaveNoActiveAdmin } from "../lib/adminRules";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: Role[] = ["customer", "support", "admin"];
const PAGE_SIZE = 20;

// Nunca incluye passwordHash.
const userSelect = {
  id: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  _count: { select: { orders: true } },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function toResponse(user: UserRow) {
  const { _count, ...rest } = user;
  return { ...rest, orderCount: _count.orders };
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role);
}

class RuleError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function handleError(res: Response, context: string, error: unknown) {
  if (error instanceof RuleError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(`Error en ${context}:`, error);
  return res.status(500).json({ error: "Error interno del servidor" });
}

export async function listUsers(req: Request, res: Response) {
  try {
    const { search, role, page } = req.query;

    const where: Prisma.UserWhereInput = {};
    if (typeof search === "string" && search.trim() !== "") {
      where.email = { contains: search.trim(), mode: "insensitive" };
    }
    if (role !== undefined && role !== "") {
      if (!isRole(role)) {
        return res.status(400).json({ error: "Rol inválido" });
      }
      where.role = role;
    }

    const pageNumber = Math.max(1, Number.parseInt(typeof page === "string" ? page : "1", 10) || 1);

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (pageNumber - 1) * PAGE_SIZE,
      }),
    ]);

    res.json({
      users: users.map(toResponse),
      page: pageNumber,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    handleError(res, "listUsers", error);
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const { email, password, role } = req.body ?? {};

    if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: "Email inválido" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }
    if (!isRole(role)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    const cleanEmail = email.trim();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: cleanEmail, passwordHash, role },
      select: userSelect,
    });

    res.status(201).json(toResponse(user));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(400).json({ error: "El email ya está registrado" });
    }
    handleError(res, "createUser", error);
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { role, active } = req.body ?? {};

    if (role === undefined && active === undefined) {
      return res.status(400).json({ error: "Nada que actualizar" });
    }
    if (role !== undefined && !isRole(role)) {
      return res.status(400).json({ error: "Rol inválido" });
    }
    if (active !== undefined && typeof active !== "boolean") {
      return res.status(400).json({ error: "El campo active debe ser booleano" });
    }

    const updated = await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id },
          select: { id: true, role: true, active: true },
        });
        if (!target) {
          throw new RuleError("Usuario no encontrado", 404);
        }

        // Un admin no puede cambiar su propio rol ni desactivarse.
        if (target.id === req.user!.id) {
          const changesOwnRole = role !== undefined && role !== target.role;
          const deactivatesSelf = active === false;
          if (changesOwnRole || deactivatesSelf) {
            throw new RuleError("No puedes modificar tu propia cuenta", 400);
          }
        }

        const activeAdminCount = await tx.user.count({ where: { role: "admin", active: true } });
        if (wouldLeaveNoActiveAdmin(target, { role, active }, activeAdminCount)) {
          throw new RuleError("Debe existir al menos un administrador activo", 400);
        }

        return tx.user.update({
          where: { id },
          data: { ...(role !== undefined ? { role } : {}), ...(active !== undefined ? { active } : {}) },
          select: userSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    res.json(toResponse(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return res.status(409).json({ error: "Conflicto de concurrencia, intenta de nuevo" });
    }
    handleError(res, "updateUser", error);
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { password } = req.body ?? {};

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    res.json({ ok: true });
  } catch (error) {
    handleError(res, "resetPassword", error);
  }
}
