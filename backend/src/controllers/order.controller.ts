import { Request, Response } from "express";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { randomUUID } from "node:crypto";
import { processPayment } from "../lib/payment";
import type { PaymentResult } from "../lib/payment";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from "../config/checkout";
import { validateCheckoutInput } from "../lib/checkoutValidation";

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

// Pago rechazado por el banco simulado: revierte la transacción y responde 402.
class PaymentDeclinedError extends Error {
  constructor(
    public reason: string,
    public result: PaymentResult,
  ) {
    super(reason);
  }
}

const orderInclude = {
  items: { include: { product: true } },
  payment: true,
} satisfies Prisma.OrderInclude;

export async function checkout(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    // Los valores monetarios del body (total, shippingCost, precios) se ignoran:
    // solo se leen los campos de entrega y pago que valida validateCheckoutInput.
    const parsed = validateCheckoutInput(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error });
    }
    const input = parsed.data;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    // Validación previa de stock de TODOS los ítems: si falta, no se crea nada ni se intenta el pago.
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          error: `Stock insuficiente para "${item.product.name}" (disponible: ${item.product.stock}, solicitado: ${item.quantity})`,
        });
      }
    }

    // Precio, envío y total salen siempre del servidor.
    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );
    const shippingCost =
      input.deliveryType === "shipping" && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_COST : 0;
    const total = subtotal + shippingCost;
    const isCash = input.payment.method === "cash";

    const deliveryData = {
      deliveryType: input.deliveryType,
      shippingAddress: input.shippingAddress ?? Prisma.JsonNull,
      pickupStore: input.pickupStore,
      shippingCost,
    };
    const itemsData = cartItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.product.price,
    }));

    try {
      const order = await prisma.$transaction(
        async (tx) => {
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

          let paymentData: Prisma.PaymentCreateWithoutOrderInput;
          let result: PaymentResult | null = null;

          if (input.payment.method === "cash") {
            // Contra entrega o pago en tienda: no se llama a la pasarela.
            paymentData = {
              gatewayReference: `CASH-${randomUUID()}`,
              status: "pending",
              amount: total,
              method: "cash",
            };
          } else {
            const method = input.payment.method;
            const details =
              input.payment.method === "card"
                ? { number: input.payment.number }
                : input.payment.method === "pse"
                  ? { bank: input.payment.bank }
                  : { code: input.payment.code };

            result = await processPayment(total, method, details);
            if (!result.approved) {
              throw new PaymentDeclinedError(result.reason ?? "Pago rechazado", result);
            }
            paymentData = {
              gatewayReference: result.reference,
              status: "approved",
              amount: total,
              method,
              cardBrand: result.brand ?? null,
              cardLast4: result.last4 ?? null,
            };
          }

          const newOrder = await tx.order.create({
            data: {
              userId,
              status: isCash ? "pending" : "paid",
              total,
              trackingId: generateTrackingId(),
              ...deliveryData,
              items: { create: itemsData },
              payment: { create: paymentData },
            },
            include: orderInclude,
          });

          if (result) {
            await tx.paymentAttempt.create({
              data: {
                userId,
                orderId: newOrder.id,
                method: input.payment.method,
                amount: total,
                status: "approved",
                cardBrand: result.brand ?? null,
                cardLast4: result.last4 ?? null,
              },
            });
          }

          await tx.cartItem.deleteMany({ where: { userId } });

          return newOrder;
        },
        { timeout: 15000, maxWait: 10000 },
      );

      return res.status(201).json(order);
    } catch (error) {
      if (error instanceof PaymentDeclinedError) {
        // La transacción ya se revirtió (sin orden ni cambios de stock). Se registra el intento rechazado.
        try {
          await prisma.paymentAttempt.create({
            data: {
              userId,
              orderId: null,
              method: input.payment.method,
              amount: total,
              status: "rejected",
              reason: error.reason,
              cardBrand: error.result.brand ?? null,
              cardLast4: error.result.last4 ?? null,
            },
          });
        } catch (attemptError) {
          console.error("Error registrando intento de pago rechazado:", attemptError);
        }
        return res.status(402).json({ error: error.reason, declined: true });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(400).json({ error: error.message });
    }
    // Nunca se loguea req.body: contiene datos de pago.
    console.error("Error en checkout:", error);
    res.status(500).json({ error: "Error al procesar la orden" });
  }
}

export async function listOrders(req: Request, res: Response) {
  try {
    const isElevated = req.user!.role === "support" || req.user!.role === "admin";

    const orders = await prisma.order.findMany({
      where: isElevated ? {} : { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: true } },
        payment: { select: { method: true, status: true, cardBrand: true, cardLast4: true } },
        ...(isElevated ? { user: { select: { email: true } } } : {}),
      },
    });

    res.json(orders);
  } catch (error) {
    console.error("Error en listOrders:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function getOrderById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const isElevated = req.user!.role === "support" || req.user!.role === "admin";

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        ...orderInclude,
        ...(isElevated ? { user: { select: { email: true } } } : {}),
      },
    });

    // El cliente solo ve sus pedidos; admin y soporte ven todos (necesitan la dirección para despachar).
    if (!order || (order.userId !== req.user!.id && !isElevated)) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error en getOrderById:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as OrderStatus)) {
    return res.status(400).json({ error: "Estado inválido" });
  }

  try {
    const existing = await prisma.order.findUnique({ where: { id }, include: { payment: true } });
    if (!existing) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Un pedido contra entrega o pago en tienda (pago pendiente) pasa a pagado al avanzar su estado.
      if (existing.payment?.status === "pending" && status !== "pending") {
        await tx.payment.update({ where: { id: existing.payment.id }, data: { status: "approved" } });
      }

      return tx.order.update({
        where: { id },
        data: { status: status as OrderStatus },
        include: { ...orderInclude, user: { select: { email: true } } },
      });
    });

    res.json(updated);
  } catch (error) {
    console.error("Error en updateOrderStatus:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
