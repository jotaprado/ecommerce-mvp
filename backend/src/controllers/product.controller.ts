import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_LENGTH = 100;

// Minúsculas y sin tildes (la ñ se trata como n): "Audífonos" y "audifonos" son lo mismo.
function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// IDs de productos cuyo nombre, marca o descripción contienen el texto, ignorando mayúsculas y tildes.
// Se hace en SQL con translate() (sin extensiones ni migraciones); el texto va parametrizado.
async function findIdsBySearch(term: string): Promise<string[]> {
  const escaped = term.replace(/[\\%_]/g, (c) => `\\${c}`);
  const pattern = `%${escaped}%`;

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM "Product"
    WHERE lower(translate(
      name || ' ' || brand || ' ' || description,
      'áéíóúüñÁÉÍÓÚÜÑ',
      'aeiouunaeiouun'
    )) LIKE ${pattern}
  `);

  return rows.map((row) => row.id);
}

export async function listProducts(req: Request, res: Response) {
  const { category, brand, minPrice, maxPrice, take, skip, search } = req.query;

  const where: Prisma.ProductWhereInput = {};

  if (typeof category === "string") {
    where.category = category;
  }
  if (typeof brand === "string") {
    where.brand = brand;
  }
  if (typeof minPrice === "string" || typeof maxPrice === "string") {
    where.price = {};
    if (typeof minPrice === "string") {
      where.price.gte = new Prisma.Decimal(minPrice);
    }
    if (typeof maxPrice === "string") {
      where.price.lte = new Prisma.Decimal(maxPrice);
    }
  }

  // Búsqueda por texto: se ignora si está vacía o tiene menos de 2 caracteres (tras recortar espacios).
  if (typeof search === "string") {
    const term = normalizeSearch(search.trim()).slice(0, MAX_SEARCH_LENGTH);
    if (term.length >= MIN_SEARCH_LENGTH) {
      const ids = await findIdsBySearch(term);
      if (ids.length === 0) {
        return res.json([]);
      }
      where.id = { in: ids };
    }
  }

  const products = await prisma.product.findMany({
    where,
    take: take ? Number(take) : 20,
    skip: skip ? Number(skip) : 0,
  });

  res.json(products);
}

export async function getProductById(req: Request, res: Response) {
  const { id } = req.params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  res.json(product);
}

function isValidProductInput(body: Record<string, unknown>): boolean {
  const { name, description, price, brand, category, stock, imageUrl } = body;
  return (
    typeof name === "string" &&
    name.length > 0 &&
    typeof description === "string" &&
    typeof price === "number" &&
    price >= 0 &&
    typeof brand === "string" &&
    brand.length > 0 &&
    typeof category === "string" &&
    category.length > 0 &&
    typeof stock === "number" &&
    stock >= 0 &&
    typeof imageUrl === "string" &&
    imageUrl.length > 0
  );
}

export async function createProduct(req: Request, res: Response) {
  if (!isValidProductInput(req.body)) {
    return res.status(400).json({ error: "Datos de producto inválidos" });
  }

  const { name, description, price, brand, category, specs, stock, imageUrl } = req.body;

  const product = await prisma.product.create({
    data: { name, description, price, brand, category, specs: specs ?? {}, stock, imageUrl },
  });

  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  const { name, description, price, brand, category, specs, stock, imageUrl } = req.body;
  const data: Prisma.ProductUpdateInput = {};

  if (typeof name === "string" && name.length > 0) data.name = name;
  if (typeof description === "string") data.description = description;
  if (typeof price === "number" && price >= 0) data.price = price;
  if (typeof brand === "string" && brand.length > 0) data.brand = brand;
  if (typeof category === "string" && category.length > 0) data.category = category;
  if (specs !== undefined) data.specs = specs;
  if (typeof stock === "number" && stock >= 0) data.stock = stock;
  if (typeof imageUrl === "string" && imageUrl.length > 0) data.imageUrl = imageUrl;

  const updated = await prisma.product.update({ where: { id }, data });
  res.json(updated);
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res
        .status(400)
        .json({ error: "No se puede eliminar: el producto tiene carritos o pedidos asociados" });
    }
    throw error;
  }

  res.status(204).send();
}
