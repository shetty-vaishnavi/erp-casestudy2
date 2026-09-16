import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth";
import prisma from "../prisma";

const router = Router();

router.use(authenticate, requireRole("SALES"));

router.get("/", async (req, res) => {
  try {
    const enquiries = await prisma.enquiry.findMany({
      include: { items: true, customer: true }
    });
    res.json(enquiries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch enquiries" });
  }
});

router.post("/", async (req, res) => {
  const { enquiry_no, customer_id, required_date, notes, items } = req.body;
  try {
    const enquiry = await prisma.enquiry.create({
      data: {
        enquiry_no,
        customer_id,
        required_date: new Date(required_date),
        notes,
        items: {
          create: items.map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity
          }))
        }
      },
      include: { items: true }
    });
    res.json(enquiry);
  } catch (error) {
    res.status(400).json({ error: "Failed to create enquiry" });
  }
});

export default router;
