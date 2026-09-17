import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth";
import prisma from "../prisma";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { company_name, contact_person, mobile, email, city } = req.body;
    if (!company_name) return res.status(400).json({ error: "company_name is required" });

    // Proper find-or-create: look up by company_name first
    let customer = await prisma.customer.findFirst({
      where: { company_name: company_name.trim() }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { company_name: company_name.trim(), contact_person, mobile, email, city }
      });
    }

    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ error: "Failed to create customer", detail: error.message });
  }
});

router.get("/", authenticate, async (req, res) => {
  const customers = await prisma.customer.findMany();
  res.json(customers);
});

export default router;
