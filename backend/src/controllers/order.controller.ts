import { Request, Response } from "express";
import { OrderStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { processPayment } from "../lib/payment";

const VALID_STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "delivered"];

function generateTrackingId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TRK-${id}`;
}

class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export async function checkout(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    // Validación previa: si algún item no tiene stock, se responde sin abrir la transacción.
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          error: `Stock insuficiente para "${item.product.name}" (disponible: ${item.product.stock}, solicitado: ${item.quantity})`,
        });
      }
    }

    // El precio y el total salen siempre de la base de datos, nunca del body.
    const total = cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    const order = await prisma.$transaction(async (tx) => {
      // Descuento atómico: la condición stock >= cantidad evita stock negativo ante compras simultáneas.
      for (const item of cartItems) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new CheckoutError(`Stock insuficiente para "${item.product.name}"`);
        }
      }

      const payment = await processPayment(total);
      if (!payment.approved) {
        throw new CheckoutError("El pago fue rechazado");
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          status: "paid",
          total,
          trackingId: generateTrackingId(),
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.product.price,
            })),
          },
          payment: {
            create: {
              gatewayReference: payment.reference,
              status: "approved",
              amount: total,
            },
          },
        },
        include: { items: { include: { product: true } }, payment: true },
      });

      await tx.cartItem.deleteMany({ where: { userId } });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error en checkout:", error);
    res.status(500).json({ error: "Error al procesar la orden" });
  }
}

export async function listOrders(req: Request, res: Response) {
  const isElevated = req.user!.role === "support" || req.user!.role === "admin";

  const orders = await prisma.order.findMany({
    where: isElevated ? {} : { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: true } },
      ...(isElevated ? { user: { select: { email: true } } } : {}),
    },
  });

  res.json(orders);
}

export async function getOrderById(req: Request, res: Response) {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, payment: true },
  });

  if (!order || order.userId !== req.user!.id) {
    return res.status(404).json({ error: "Pedido no encontrado" });
  }

  res.json(order);
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as OrderStatus)) {
    return res.status(400).json({ error: "Estado inválido" });
  }

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Pedido no encontrado" });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: status as OrderStatus },
    include: { items: { include: { product: true } }, user: { select: { email: true } } },
  });

  res.json(updated);
}
