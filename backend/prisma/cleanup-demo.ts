/**
 * Limpieza de datos de demo (usuarios de prueba y sus pedidos).
 *
 * USO (desde la carpeta backend):
 *
 *   npx ts-node prisma/cleanup-demo.ts                        -> DRY RUN: solo lista, no modifica nada
 *   npx ts-node prisma/cleanup-demo.ts --execute              -> borra de verdad (stock sin tocar)
 *   npx ts-node prisma/cleanup-demo.ts --execute --restock    -> borra y devuelve al stock las unidades
 *                                                                que descontaron las órdenes borradas
 *
 * QUÉ BORRA: usuarios cuyo email EMPIEZA por sprint3-, sprint7-, s8-test-, s9-test- o s10-test-
 * Y TERMINA en @example.com, junto con sus datos, en una transacción y en este orden:
 * PaymentAttempt, Payment, OrderItem, Order, CartItem y, al final, User.
 *
 * QUÉ NO TOCA: ningún otro usuario ni sus órdenes (se listan aparte para revisarlas a mano).
 * Los correos protegidos (jotaprado@gmail.com y jotaprado@hotmail.com) nunca se borran.
 *
 * SEGURIDAD: antes de borrar con --execute se escribe un respaldo JSON de todo lo que se va a
 * eliminar en ~/Desktop/respaldo-limpieza-demo-FECHA.json (fuera del repo; contiene los hashes de
 * contraseña de esos usuarios, no lo compartas). Si no se puede escribir, el script aborta y no borra.
 *
 * La BD de Neon es la misma en local y producción: revisa el dry run antes de ejecutar.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const prisma = new PrismaClient();

const EXECUTE = process.argv.includes("--execute");
const RESTOCK = process.argv.includes("--restock");

const PREFIXES = ["sprint3-", "sprint7-", "s8-test-", "s9-test-", "s10-test-"];
const DOMAIN = "@example.com";
const PROTECTED_EMAILS = ["jotaprado@gmail.com", "jotaprado@hotmail.com"];
const SOLD_STATUSES = ["paid", "shipped", "delivered"];

const money = (value: number) => `$ ${Math.round(value).toLocaleString("es-CO")}`;
const date = (d: Date) => d.toISOString().replace("T", " ").slice(0, 16);

function isTarget(email: string): boolean {
  return (
    PREFIXES.some((prefix) => email.startsWith(prefix)) &&
    email.endsWith(DOMAIN) &&
    !PROTECTED_EMAILS.includes(email.toLowerCase())
  );
}

async function main() {
  console.log(
    EXECUTE
      ? `=== LIMPIEZA DE DATOS DE DEMO — EJECUCIÓN REAL${RESTOCK ? " (con --restock)" : ""} ===`
      : "=== LIMPIEZA DE DATOS DE DEMO — DRY RUN (no se modifica nada) ===",
  );
  console.log(`Regla: email empieza por [${PREFIXES.join(", ")}] y termina en ${DOMAIN}\n`);

  // Candidatos por la base de datos y doble comprobación en código (defensa en profundidad).
  const candidates = await prisma.user.findMany({
    where: {
      AND: [{ OR: PREFIXES.map((prefix) => ({ email: { startsWith: prefix } })) }, { email: { endsWith: DOMAIN } }],
    },
    orderBy: { email: "asc" },
  });
  const users = candidates.filter((u) => isTarget(u.email));
  const userIds = users.map((u) => u.id);

  const [orders, attempts, cartItems] = await Promise.all([
    prisma.order.findMany({
      where: { userId: { in: userIds } },
      include: { items: { include: { product: { select: { id: true, name: true } } } }, payment: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.paymentAttempt.findMany({ where: { userId: { in: userIds } } }),
    prisma.cartItem.findMany({ where: { userId: { in: userIds } } }),
  ]);

  const orderIds = orders.map((o) => o.id);
  const orderItems = orders.flatMap((o) => o.items);
  const payments = orders.flatMap((o) => (o.payment ? [o.payment] : []));

  // ---- Qué se borraría
  console.log(`USUARIOS a borrar: ${users.length}`);
  users.forEach((u) => console.log(`  - ${u.email}  (${u.role}, ${u.active ? "activo" : "inactivo"})`));

  console.log("\nREGISTROS a borrar:");
  console.log(`  Usuarios ............ ${users.length}`);
  console.log(`  Órdenes ............. ${orders.length}`);
  console.log(`  Pagos ............... ${payments.length}`);
  console.log(`  Ítems de orden ...... ${orderItems.length}`);
  console.log(`  Intentos de pago .... ${attempts.length}`);
  console.log(`  Ítems de carrito .... ${cartItems.length}`);

  // ---- Impacto en stock
  const unitsByProduct = new Map<string, { name: string; units: number }>();
  for (const item of orderItems) {
    const entry = unitsByProduct.get(item.productId) ?? { name: item.product.name, units: 0 };
    entry.units += item.quantity;
    unitsByProduct.set(item.productId, entry);
  }
  console.log("\nIMPACTO EN STOCK (unidades que esas órdenes descontaron):");
  if (unitsByProduct.size === 0) console.log("  (ninguno)");
  [...unitsByProduct.values()]
    .sort((a, b) => b.units - a.units)
    .forEach((p) => console.log(`  ${String(p.units).padStart(4)} u.  ${p.name}`));
  const totalUnits = [...unitsByProduct.values()].reduce((sum, p) => sum + p.units, 0);
  console.log(`  Total: ${totalUnits} unidades. ${RESTOCK ? "Con --restock se devolverían al stock." : "Sin --restock el stock NO se toca."}`);

  // ---- Ventas que dejarían de contar
  const soldOrders = orders.filter((o) => SOLD_STATUSES.includes(o.status));
  const soldTotal = soldOrders.reduce((sum, o) => sum + Number(o.total), 0);
  console.log(`\nVENTAS que dejarían de contar en el dashboard: ${money(soldTotal)} (${soldOrders.length} pedidos pagados, enviados o entregados)`);
  const pendingOrders = orders.filter((o) => o.status === "pending");
  if (pendingOrders.length > 0) console.log(`  (además ${pendingOrders.length} pedidos pendientes de pago, que ya no cuentan como venta)`);

  // ---- Lo que NO se toca
  const otherOrders = await prisma.order.findMany({
    where: { userId: { notIn: userIds } },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\nNO se tocan (revisar a mano): ${otherOrders.length} órdenes de usuarios que NO cumplen la regla`);
  otherOrders.forEach((o) =>
    console.log(`  ${o.trackingId ?? "(sin tracking)"}  ${date(o.createdAt)}  ${money(Number(o.total)).padStart(14)}  ${o.status.padEnd(9)} ${o.user.email}`),
  );

  const lookalikes = await prisma.user.findMany({
    where: { OR: [{ email: { startsWith: "sprint" } }, { email: { contains: "-test-" } }] },
    select: { email: true, role: true },
    orderBy: { email: "asc" },
  });
  const missed = lookalikes.filter((u) => !isTarget(u.email));
  if (missed.length > 0) {
    console.log(`\nUSUARIOS con aspecto de prueba que la regla NO incluye (no se tocan): ${missed.length}`);
    missed.forEach((u) => console.log(`  - ${u.email} (${u.role})`));
    console.log(`  (la regla exige terminar en ${DOMAIN}; si son de prueba, bórralos a mano o amplía la regla)`);
  }

  if (!EXECUTE) {
    console.log("\nDRY RUN: no se modificó nada. Para borrar: --execute (opcional --restock).");
    return;
  }

  if (users.length === 0) {
    console.log("\nNada que borrar.");
    return;
  }

  // ---- Respaldo antes de borrar (aborta si no puede escribirse)
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const backupPath = path.join(os.homedir(), "Desktop", `respaldo-limpieza-demo-${stamp}.json`);
  try {
    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        { generatedAt: new Date().toISOString(), restock: RESTOCK, users, orders, payments, orderItems, attempts, cartItems },
        null,
        2,
      ),
    );
    if (fs.statSync(backupPath).size === 0) throw new Error("el archivo quedó vacío");
  } catch (error) {
    console.error(`\nABORTADO: no se pudo escribir el respaldo en ${backupPath}. No se borró nada.`, error);
    process.exit(1);
  }
  console.log(`\nRespaldo escrito: ${backupPath}`);

  // ---- Borrado en una transacción, en orden seguro de llaves foráneas
  const result = await prisma.$transaction(
    async (tx) => {
      if (RESTOCK) {
        for (const [productId, { units }] of unitsByProduct) {
          await tx.product.update({ where: { id: productId }, data: { stock: { increment: units } } });
        }
      }
      const a = await tx.paymentAttempt.deleteMany({ where: { userId: { in: userIds } } });
      const p = await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      const i = await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      const o = await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      const c = await tx.cartItem.deleteMany({ where: { userId: { in: userIds } } });
      const u = await tx.user.deleteMany({ where: { id: { in: userIds } } });
      return { attempts: a.count, payments: p.count, orderItems: i.count, orders: o.count, cartItems: c.count, users: u.count };
    },
    { timeout: 60000, maxWait: 15000 },
  );

  console.log("\nBORRADO COMPLETADO:", result);
  console.log(RESTOCK ? "Stock restituido." : "Stock sin cambios (no se usó --restock).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
