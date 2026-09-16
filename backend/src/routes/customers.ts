import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import prisma from "../prisma";

const router = Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const { company_name, contact_person, mobile, email, city } = req.body;
    // Use upsert to avoid duplicate customer errors
    const customer = await prisma.customer.upsert({
      where: { id: 0 },
      update: {},
      create: { company_name, contact_person, mobile, email, city }
    });
    res.json(customer);
  } catch (error) {
    // Fallback: just create
    try {
      const customer = await prisma.customer.create({ data: req.body });
      res.json(customer);
    } catch (e: any) {
      res.status(400).json({ error: "Failed to create customer" });
    }
  }
});

router.get("/", authenticate, async (req, res) => {
  const customers = await prisma.customer.findMany();
  res.json(customers);
});

export default router;
