import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorBody } from "../lib/apiError";

const TRACKING_REGEX = /^TRK-[A-Z0-9]{8}$/;
const NOT_FOUND_MESSAGE = "No encontramos un pedido con ese código";

// Endpoint PÚBLICO (sin sesión). Devuelve solo lo imprescindible para seguir un pedido:
// nunca email, nombre del cliente, teléfono, dirección, datos de pago ni IDs internos.
// Nota: Order no tiene columna updatedAt, por eso no se devuelve la fecha de última actualización.
export async function getTracking(req: Request, res: Response) {
  const code = String(req.params.trackingId ?? "").trim().toUpperCase();

  if (!TRACKING_REGEX.test(code)) {
    return res.status(404).json(errorBody(NOT_FOUND_MESSAGE));
  }

  const order = await prisma.order.findUnique({
    where: { trackingId: code },
    select: {
      trackingId: true,
      status: true,
      createdAt: true,
      deliveryType: true,
      shippingAddress: true,
      pickupStore: true,
      items: { select: { quantity: true, product: { select: { name: true } } } },
    },
  });

  if (!order) {
    return res.status(404).json(errorBody(NOT_FOUND_MESSAGE));
  }

  // Del domicilio solo se expone la ciudad (nunca la dirección completa).
  const address = order.shippingAddress as { city?: unknown } | null;
  const city =
    order.deliveryType === "shipping" && typeof address?.city === "string" ? address.city : null;

  res.json({
    trackingId: order.trackingId,
    status: order.status,
    createdAt: order.createdAt,
    deliveryType: order.deliveryType,
    city,
    pickupStore: order.deliveryType === "pickup" ? order.pickupStore : null,
    items: order.items.map((item) => ({ name: item.product.name, quantity: item.quantity })),
  });
}
