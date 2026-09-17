import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Seed users
  const adminPassword = await bcrypt.hash("admin", 10);
  const salesPassword = await bcrypt.hash("sales", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password_hash: adminPassword, role: "ADMIN" }
  });

  await prisma.user.upsert({
    where: { username: "sales" },
    update: {},
    create: { username: "sales", password_hash: salesPassword, role: "SALES" }
  });

  // Realistic industrial products
  const productsData = [
    { code: "IND-001", name: "Hydraulic Cylinder Seal Kit", category: "Hydraulics", unit: "set",    base_price: 2450.00, qty: 200, reserved: 40 },
    { code: "IND-002", name: "Industrial Ball Bearing (6205)",  category: "Bearings",   unit: "pcs",   base_price: 380.00,  qty: 500, reserved: 60 },
    { code: "IND-003", name: "Pneumatic Air Filter (1/2 BSP)",  category: "Pneumatics", unit: "pcs",   base_price: 1200.00, qty: 150, reserved: 30 },
    { code: "IND-004", name: "Stainless Steel Hex Bolt M16x60", category: "Fasteners",  unit: "kg",    base_price: 285.00,  qty: 1000, reserved: 0 },
    { code: "IND-005", name: "Conveyor Belt (EP 200/3, 1m w)",  category: "Conveyors",  unit: "meter", base_price: 3800.00, qty: 100, reserved: 20 },
    { code: "IND-006", name: "3-Phase Induction Motor (5HP)",   category: "Electrical", unit: "pcs",   base_price: 18500.00,qty: 50,  reserved: 10 },
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        name: p.name,
        category: p.category,
        unit: p.unit,
        base_price: p.base_price
      }
    });

    await prisma.inventory.upsert({
      where: { product_id: product.id },
      update: {},
      create: {
        product_id: product.id,
        physical_quantity: p.qty,
        reserved_quantity: p.reserved
      }
    });
  }

  console.log("✅ Seed successful: users, 6 industrial products with inventory");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
