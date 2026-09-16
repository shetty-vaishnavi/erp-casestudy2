import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import prisma from "../prisma";

const router = Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const customer = await prisma.customer.create({
      data: req.body
    });
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: "Failed to create customer" });
  }
});

export default router;
