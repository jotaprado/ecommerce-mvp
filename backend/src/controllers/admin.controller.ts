import { Request, Response } from "express";
import { OrderStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { LOW_STOCK_THRESHOLD } from "../config/inventory";

// Solo cuentan como venta los pedidos con pago confirmado: un pedido pending (contra entrega) aún no lo es.
const SOLD_STATUSES: OrderStatus[] = ["paid", "shipped", "delivered"];
const TIME_ZONE = "America/Bogota";
const DAY_MS = 24 * 60 * 60 * 1000;

// Fecha YYYY-MM-DD en la zona horaria de la tienda (el servidor corre en UTC).
function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

export async function getSummary(req: Request, res: Response) {
  const now = Date.now();
  const lastSevenDays = Array.from({ length: 7 }, (_, i) => dayKey(new Date(now - (6 - i) * DAY_MS)));

  const [salesAgg, orderCount, userCount, pendingOrders, lowStock, topGroups, recentOrders] =
    await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: SOLD_STATUSES } },
        _sum: { total: true },
      }),
      // Cuenta todas las órdenes, incluidas las pendientes (a diferencia de totalSales).
      prisma.order.count(),
      prisma.user.count(),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.product.findMany({
        where: { stock: { lte: LOW_STOCK_THRESHOLD } },
        orderBy: [{ stock: "asc" }, { name: "asc" }],
        take: 10,
        select: { name: true, stock: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { status: { in: SOLD_STATUSES } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.order.findMany({
        where: { status: { in: SOLD_STATUSES }, createdAt: { gte: new Date(now - 8 * DAY_MS) } },
        select: { createdAt: true, total: true },
      }),
    ]);

  const topProductNames = await prisma.product.findMany({
    where: { id: { in: topGroups.map((g) => g.productId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(topProductNames.map((p) => [p.id, p.name]));

  const totalsByDay = new Map(lastSevenDays.map((day) => [day, 0]));
  for (const order of recentOrders) {
    const key = dayKey(order.createdAt);
    if (totalsByDay.has(key)) totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(order.total));
  }

  res.json({
    totalSales: salesAgg._sum.total ?? 0,
    orderCount,
    userCount,
    pendingOrders,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    lowStockProducts: lowStock,
    topProducts: topGroups.map((g) => ({
      name: nameById.get(g.productId) ?? "Producto eliminado",
      units: g._sum.quantity ?? 0,
    })),
    salesLast7Days: lastSevenDays.map((date) => ({ date, total: totalsByDay.get(date) ?? 0 })),
  });
}
