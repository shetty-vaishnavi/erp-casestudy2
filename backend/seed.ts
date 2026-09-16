import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin", 10);
  const salesPassword = await bcrypt.hash("sales", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password_hash: adminPassword,
      role: "ADMIN"
    }
  });

  await prisma.user.upsert({
    where: { username: "sales" },
    update: {},
    create: {
      username: "sales",
      password_hash: salesPassword,
      role: "SALES"
    }
  });

  const productsData = [
    { code: "P001", name: "Product 1", category: "Cat1", unit: "kg", base_price: 100 },
    { code: "P002", name: "Product 2", category: "Cat1", unit: "kg", base_price: 200 },
    { code: "P003", name: "Product 3", category: "Cat2", unit: "pcs", base_price: 50 },
    { code: "P004", name: "Product 4", category: "Cat2", unit: "pcs", base_price: 150 },
    { code: "P005", name: "Product 5", category: "Cat3", unit: "lit", base_price: 300 },
    { code: "P006", name: "Product 6", category: "Cat3", unit: "lit", base_price: 250 },
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: p
    });

    await prisma.inventory.upsert({
      where: { product_id: product.id },
      update: {},
      create: {
        product_id: product.id,
        physical_quantity: 100,
        reserved_quantity: 0
      }
    });
  }

  console.log("Seed successful");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
