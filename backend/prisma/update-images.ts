import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Actualiza imageUrl por nombre de producto. Es idempotente: se puede ejecutar varias veces.
// No reemplaza al seed (la base ya tiene órdenes que referencian estos productos).
const IMAGES: Record<string, string> = {
  "Laptop ThinkPad E14": "/products/thinkpad-e14.jpg",
  "Laptop MacBook Air M2": "/products/macbook-air-m2.jpg",
  "Laptop Pavilion 15": "/products/pavilion-15.jpg",
  "Laptop Gamer ROG Strix": "/products/rog-strix.jpg",
  "iPhone 15": "/products/iphone-15.jpg",
  "Samsung Galaxy S24": "/products/galaxy-s24.jpg",
  "Xiaomi Redmi Note 13": "", // sin foto libre disponible: la tienda muestra el respaldo por categoría
  "Motorola Edge 40": "/products/motorola-edge-40.jpg",
  "Audífonos WH-1000XM5": "/products/sony-wh-1000xm5.jpg",
  "AirPods Pro 2": "/products/airpods-pro-2.jpg",
  "Audífonos JBL Tune 510BT": "/products/jbl-tune-510bt.jpg",
  "Monitor UltraGear 27'' 144Hz": "", // sin foto libre disponible: la tienda muestra el respaldo por categoría
  "Monitor Odyssey G5 32''": "", // sin foto libre disponible: la tienda muestra el respaldo por categoría
  "Monitor ProArt 24''": "/products/proart-24.jpg",
  "Teclado Mecánico K95 RGB": "/products/corsair-k95.jpg",
  "Mouse MX Master 3S": "/products/mx-master-3s.jpg",
  "Mouse Gamer DeathAdder V3": "/products/deathadder-v3.jpg",
  "Tablet iPad 10ma generación": "/products/ipad-10.jpg",
  "Tablet Galaxy Tab S9": "/products/galaxy-tab-s9.jpg",
  "SSD NVMe 1TB": "/products/ssd-nvme-1tb.jpg",
  "Memoria RAM 16GB DDR4": "/products/ram-16gb-ddr4.jpg",
  "Smartwatch Watch Series 9": "", // sin foto libre disponible: la tienda muestra el respaldo por categoría
  "Smartwatch Galaxy Watch 6": "/products/galaxy-watch-6.jpg",
};

async function main() {
  let updated = 0;
  const notFound: string[] = [];

  for (const [name, imageUrl] of Object.entries(IMAGES)) {
    const result = await prisma.product.updateMany({ where: { name }, data: { imageUrl } });
    if (result.count === 0) {
      notFound.push(name);
    } else {
      updated += result.count;
    }
  }

  console.log(`Productos actualizados: ${updated}`);
  if (notFound.length > 0) {
    console.log(`No encontrados (${notFound.length}):`);
    notFound.forEach((name) => console.log(`  - ${name}`));
  } else {
    console.log("Todos los productos fueron encontrados.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
