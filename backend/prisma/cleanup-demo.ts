/**
 * Limpieza de datos de demo (usuarios de prueba y pedidos).
 *
 * USO (desde la carpeta backend):
 *
 *   npx ts-node prisma/cleanup-demo.ts                              -> DRY RUN: solo lista, no modifica nada
 *   npx ts-node prisma/cleanup-demo.ts --also-orders-of=a@x.com,b@y.com
 *                                                                   -> DRY RUN simulando también el flag
 *   npx ts-node prisma/cleanup-demo.ts --execute                    -> borra de verdad (stock sin tocar)
 *   npx ts-node prisma/cleanup-demo.ts --execute --restock          -> borra y devuelve al stock las unidades
 *                                                                      de TODAS las órdenes borradas
 *
 * QUÉ BORRA
 *  1) Usuarios de prueba: email que EMPIEZA por sprint3-, sprint4-, sprint7-, s8-test-, s9-test- o
 *     s10-test- Y TERMINA en @example.com o @test.com (solo esos dos dominios). Se borran completos
 *     con todos sus datos.
 *  2) Con --also-orders-of=email1,email2: TODAS las órdenes (con sus Payment, OrderItem y
 *     PaymentAttempt) y los PaymentAttempt de esos emails exactos. NUNCA sus cuentas ni sus carritos.
 *
 * Orden de borrado (una sola transacción, seguro para llaves foráneas):
 *   PaymentAttempt, Payment, OrderItem, Order, CartItem (solo de usuarios de prueba) y User
 *   (solo usuarios de prueba).
 *
 * SEGURIDAD
 *  - Nunca borra un usuario que no cumpla la regla. Los correos protegidos (jotaprado@gmail.com y
 *    jotaprado@hotmail.com) nunca se borran como usuario.
 *  - Aborta (y revierte) si tras el borrado no quedara al menos un administrador activo.
 *  - Aborta si un email de --also-orders-of no existe (evita errores de escritura) o si es un
 *    usuario de prueba (ese se borra completo por la regla).
 *  - Antes de borrar con --execute escribe un respaldo JSON de TODO lo que va a eliminar en
 *    ~/Desktop/respaldo-limpieza-demo-FECHA.json (fuera del repo; contiene hashes de contraseña,
 *    no lo compartas). Si no puede escribirlo, aborta y no borra nada.
 *  - Un flag desconocido aborta el script (no se ignora en silencio).
 *
 * AVISO SOBRE --restock: devuelve al stock las unidades de las órdenes borradas. Si ya repusiste
 * stock a mano después de unas pruebas, esas unidades se contarían dos veces. Revisa la tabla de
 * stock del dry run antes de usarlo.
 *
 * La BD de Neon es la misma en local y producción: revisa siempre el dry run antes de ejecutar.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const prisma = new PrismaClient();

const PREFIXES = ["sprint3-", "sprint4-", "sprint7-", "s8-test-", "s9-test-", "s10-test-"];
const DOMAINS = ["@example.com", "@test.com"];
const PROTECTED_EMAILS = ["jotaprado@gmail.com", "jotaprado@hotmail.com"];
const SOLD_STATUSES = ["paid", "shipped", "delivered"];

const KNOWN_FLAGS = ["--execute", "--restock"];
const ALSO_FLAG = "--also-orders-of=";

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const RESTOCK = args.includes("--restock");

const money = (value: number) => `$ ${Math.round(value).toLocaleString("es-CO")}`;
const date = (d: Date) => d.toISOString().replace("T", " ").slice(0, 16);

function fail(message: string): never {
  console.error(`\nABORTADO: ${message}`);
  process.exit(1);
}

function parseAlsoEmails(): string[] {
  const unknown = args.filter((a) => !KNOWN_FLAGS.includes(a) && !a.startsWith(ALSO_FLAG));
  if (unknown.length > 0) fail(`flag(s) desconocido(s): ${unknown.join(", ")}. Válidos: ${KNOWN_FLAGS.join(", ")}, ${ALSO_FLAG}email1,email2`);

  const alsoArg = args.find((a) => a.startsWith(ALSO_FLAG));
  if (!alsoArg) return [];
  const emails = alsoArg
    .slice(ALSO_FLAG.length)
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (emails.length === 0) fail(`${ALSO_FLAG} requiere al menos un email.`);
  return [...new Set(emails)];
}

function isTarget(email: string): boolean {
  return (
    PREFIXES.some((prefix) => email.startsWith(prefix)) &&
    DOMAINS.some((domain) => email.endsWith(domain)) &&
    !PROTECTED_EMAILS.includes(email.toLowerCase())
  );
}

async function main() {
  const alsoEmails = parseAlsoEmails();

  console.log(
    EXECUTE
      ? `=== LIMPIEZA DE DATOS DE DEMO — EJECUCIÓN REAL${RESTOCK ? " (con --restock)" : ""} ===`
      : "=== LIMPIEZA DE DATOS DE DEMO — DRY RUN (no se modifica nada) ===",
  );
  console.log(`Regla de usuarios: email empieza por [${PREFIXES.join(", ")}]`);
  console.log(`                   y termina en [${DOMAINS.join(", ")}]`);
  console.log(`--also-orders-of:  ${alsoEmails.length > 0 ? alsoEmails.join(", ") : "(no indicado)"}\n`);

  // ---------- Usuarios de prueba (regla) y usuarios con borrado solo de órdenes
  const candidates = await prisma.user.findMany({
    where: {
      AND: [
        { OR: PREFIXES.map((prefix) => ({ email: { startsWith: prefix } })) },
        { OR: DOMAINS.map((domain) => ({ email: { endsWith: domain } })) },
      ],
    },
    orderBy: { email: "asc" },
  });
  const users = candidates.filter((u) => isTarget(u.email));
  const userIds = users.map((u) => u.id);

  const alsoUsers = await prisma.user.findMany({ where: { email: { in: alsoEmails } }, orderBy: { email: "asc" } });
  const missing = alsoEmails.filter((e) => !alsoUsers.some((u) => u.email === e));
  if (missing.length > 0) fail(`no existe(n) en la base: ${missing.join(", ")} (revisa que estén escritos exactamente igual).`);
  const clash = alsoUsers.filter((u) => isTarget(u.email));
  if (clash.length > 0) fail(`${clash.map((u) => u.email).join(", ")} ya es usuario de prueba (se borra completo por la regla); quítalo de --also-orders-of.`);
  const alsoIds = alsoUsers.map((u) => u.id);
  const ordersUserIds = [...userIds, ...alsoIds];

  // ---------- Datos a borrar
  const [orders, attempts, cartItems] = await Promise.all([
    prisma.order.findMany({
      where: { userId: { in: ordersUserIds } },
      include: { items: { include: { product: { select: { id: true, name: true } } } }, payment: true, user: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.paymentAttempt.findMany({ where: { userId: { in: ordersUserIds } } }),
    prisma.cartItem.findMany({ where: { userId: { in: userIds } } }),
  ]);
  const orderIds = orders.map((o) => o.id);
  const orderItems = orders.flatMap((o) => o.items);
  const payments = orders.flatMap((o) => (o.payment ? [o.payment] : []));
  const ordersOfTargets = orders.filter((o) => userIds.includes(o.userId));
  const ordersOfAlso = orders.filter((o) => alsoIds.includes(o.userId));

  // ---------- 1. Qué se borraría
  console.log(`USUARIOS de prueba a borrar COMPLETOS: ${users.length}`);
  users.forEach((u) => console.log(`  - ${u.email}  (${u.role}, ${u.active ? "activo" : "inactivo"})`));

  if (alsoUsers.length > 0) {
    console.log(`\nUSUARIOS que CONSERVAN su cuenta y carrito, pero pierden sus órdenes (--also-orders-of): ${alsoUsers.length}`);
    alsoUsers.forEach((u) => {
      const n = ordersOfAlso.filter((o) => o.userId === u.id).length;
      const a = attempts.filter((x) => x.userId === u.id).length;
      console.log(`  - ${u.email}  (${u.role}): ${n} órdenes y ${a} intentos de pago a borrar`);
    });
  }

  console.log("\nREGISTROS a borrar:");
  console.log(`  Usuarios ............ ${users.length}`);
  console.log(`  Órdenes ............. ${orders.length}   (de usuarios de prueba: ${ordersOfTargets.length}, de --also-orders-of: ${ordersOfAlso.length})`);
  console.log(`  Pagos ............... ${payments.length}`);
  console.log(`  Ítems de orden ...... ${orderItems.length}`);
  console.log(`  Intentos de pago .... ${attempts.length}`);
  console.log(`  Ítems de carrito .... ${cartItems.length}   (solo de usuarios de prueba)`);

  // ---------- 2. Stock por producto
  const products = await prisma.product.findMany({ select: { id: true, name: true, stock: true }, orderBy: { name: "asc" } });
  const unitsByProduct = new Map<string, number>();
  for (const item of orderItems) unitsByProduct.set(item.productId, (unitsByProduct.get(item.productId) ?? 0) + item.quantity);
  const totalUnits = [...unitsByProduct.values()].reduce((s, n) => s + n, 0);

  console.log("\nSTOCK POR PRODUCTO (con --restock se devolverían las unidades de las órdenes borradas):");
  console.log(`  ${"Producto".padEnd(36)} ${"Stock actual".padStart(12)} ${"Se devolvería".padStart(14)} ${"Stock resultante".padStart(17)}`);
  [...products]
    .sort((a, b) => (unitsByProduct.get(b.id) ?? 0) - (unitsByProduct.get(a.id) ?? 0) || a.name.localeCompare(b.name))
    .forEach((p) => {
      const back = unitsByProduct.get(p.id) ?? 0;
      console.log(`  ${p.name.slice(0, 36).padEnd(36)} ${String(p.stock).padStart(12)} ${(back ? `+${back}` : "0").padStart(14)} ${String(p.stock + back).padStart(17)}`);
    });
  console.log(`  Total: ${totalUnits} unidades. ${RESTOCK ? "Se devolverán al stock (--restock)." : "Sin --restock el stock NO se toca (la columna 'resultante' es solo una simulación)."}`);
  console.log("  OJO: si ya repusiste stock a mano tras algunas pruebas, --restock lo contaría dos veces.");

  // ---------- 3. Cómo quedaría el dashboard
  const [allOrders, allUsers] = await Promise.all([
    prisma.order.findMany({ select: { id: true, status: true, total: true } }),
    prisma.user.findMany({ orderBy: { email: "asc" } }),
  ]);
  const deletedOrderIds = new Set(orderIds);
  const remainingOrders = allOrders.filter((o) => !deletedOrderIds.has(o.id));
  const sales = (list: { status: string; total: unknown }[]) =>
    list.filter((o) => SOLD_STATUSES.includes(o.status)).reduce((s, o) => s + Number(o.total), 0);
  const pending = (list: { status: string }[]) => list.filter((o) => o.status === "pending").length;
  const targetIdSet = new Set(userIds);
  const remainingUsers = allUsers.filter((u) => !targetIdSet.has(u.id));

  console.log("\nDASHBOARD (hoy → después de la limpieza):");
  console.log(`  Ventas totales ............ ${money(sales(allOrders)).padStart(16)}  →  ${money(sales(remainingOrders))}`);
  console.log(`  Pedidos ................... ${String(allOrders.length).padStart(16)}  →  ${remainingOrders.length}`);
  console.log(`  Pendientes de pago ........ ${String(pending(allOrders)).padStart(16)}  →  ${pending(remainingOrders)}`);
  console.log(`  Usuarios registrados ...... ${String(allUsers.length).padStart(16)}  →  ${remainingUsers.length}`);

  // ---------- 4. Usuarios que quedarían
  const remainingOrderCount = new Map<string, number>();
  const remainingOrdersFull = await prisma.order.findMany({
    where: { id: { notIn: orderIds } },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });
  remainingOrdersFull.forEach((o) => remainingOrderCount.set(o.userId, (remainingOrderCount.get(o.userId) ?? 0) + 1));

  console.log(`\nUSUARIOS que QUEDARÍAN: ${remainingUsers.length}`);
  remainingUsers.forEach((u) => {
    const reason = alsoIds.includes(u.id)
      ? "cuenta conservada; solo pierde sus órdenes"
      : PROTECTED_EMAILS.includes(u.email.toLowerCase())
        ? "correo protegido (no se borra nunca)"
        : "no cumple la regla (prefijo y dominio)";
    console.log(`  - ${u.email.padEnd(40)} ${u.role.padEnd(9)} ${u.active ? "activo  " : "inactivo"}  órdenes que conserva: ${remainingOrderCount.get(u.id) ?? 0}   [${reason}]`);
  });

  const activeAdmins = remainingUsers.filter((u) => u.role === "admin" && u.active);
  console.log(`\nCOMPROBACIÓN DE SEGURIDAD — administradores activos tras la limpieza: ${activeAdmins.length}${activeAdmins.length ? ` (${activeAdmins.map((u) => u.email).join(", ")})` : ""}`);
  console.log(`  Cuentas protegidas presentes: ${PROTECTED_EMAILS.map((e) => `${e} ${remainingUsers.some((u) => u.email === e) ? "✔ queda" : "✘ NO existe"}`).join(" | ")}`);
  if (activeAdmins.length === 0) {
    fail("tras la limpieza no quedaría ningún administrador activo. No se haría el borrado.");
  }

  // ---------- 5. Lo que sigue sin tocarse
  console.log(`\nSIGUE SIN TOCARSE: ${remainingOrdersFull.length} órdenes`);
  if (remainingOrdersFull.length === 0) console.log("  (ninguna: todas las órdenes quedarían borradas)");
  remainingOrdersFull.forEach((o) =>
    console.log(`  ${o.trackingId ?? "(sin tracking)"}  ${date(o.createdAt)}  ${money(Number(o.total)).padStart(14)}  ${o.status.padEnd(9)} ${o.user.email}  [su dueño no está en la regla ni en --also-orders-of]`),
  );
  const remainingAttempts = await prisma.paymentAttempt.count({ where: { id: { notIn: attempts.map((a) => a.id) } } });
  console.log(`SIGUEN SIN TOCARSE: ${remainingAttempts} intentos de pago de otros usuarios`);

  const lookalikes = await prisma.user.findMany({
    where: { OR: [{ email: { startsWith: "sprint" } }, { email: { contains: "-test-" } }] },
    select: { email: true, role: true },
    orderBy: { email: "asc" },
  });
  const missed = lookalikes.filter((u) => !isTarget(u.email));
  if (missed.length > 0) {
    console.log(`\nUSUARIOS con aspecto de prueba que la regla NO incluye (no se tocan): ${missed.length}`);
    missed.forEach((u) => console.log(`  - ${u.email} (${u.role})`));
  }

  if (!EXECUTE) {
    console.log("\nDRY RUN: no se modificó nada. Para borrar: --execute (opcional --restock).");
    return;
  }

  if (users.length === 0 && orders.length === 0 && attempts.length === 0) {
    console.log("\nNada que borrar.");
    return;
  }

  // ---------- Respaldo antes de borrar (aborta si no puede escribirse)
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const backupPath = path.join(os.homedir(), "Desktop", `respaldo-limpieza-demo-${stamp}.json`);
  try {
    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          restock: RESTOCK,
          alsoOrdersOf: alsoEmails,
          users,
          orders,
          payments,
          orderItems,
          attempts,
          cartItems,
        },
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

  // ---------- Borrado en una transacción, en orden seguro de llaves foráneas
  const result = await prisma.$transaction(
    async (tx) => {
      if (RESTOCK) {
        for (const [productId, units] of unitsByProduct) {
          await tx.product.update({ where: { id: productId }, data: { stock: { increment: units } } });
        }
      }
      const a = await tx.paymentAttempt.deleteMany({ where: { userId: { in: ordersUserIds } } });
      const p = await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      const i = await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      const o = await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      const c = await tx.cartItem.deleteMany({ where: { userId: { in: userIds } } });
      // Defensa final: solo usuarios que cumplen la regla (por id Y por email).
      const u = await tx.user.deleteMany({
        where: {
          id: { in: userIds },
          AND: [
            { OR: PREFIXES.map((prefix) => ({ email: { startsWith: prefix } })) },
            { OR: DOMAINS.map((domain) => ({ email: { endsWith: domain } })) },
          ],
        },
      });
      if (u.count !== userIds.length) throw new Error(`se esperaba borrar ${userIds.length} usuarios y se borrarían ${u.count}`);

      const admins = await tx.user.count({ where: { role: "admin", active: true } });
      if (admins === 0) throw new Error("no quedaría ningún administrador activo: se revierte todo");

      return { attempts: a.count, payments: p.count, orderItems: i.count, orders: o.count, cartItems: c.count, users: u.count, adminsActivos: admins };
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
