import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth";
import prisma from "../prisma";

const router = Router();

// Both ADMIN and SALES can view enquiries
router.get("/", authenticate, requireRole("ADMIN", "SALES"), async (req, res) => {
  try {
    const enquiries = await prisma.enquiry.findMany({
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { id: "desc" }
    });
    res.json(enquiries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch enquiries" });
  }
});

// Only SALES can create enquiries
router.post("/", authenticate, requireRole("SALES"), async (req, res) => {
  const { enquiry_no, customer_id, required_date, notes, items } = req.body;

  if (!enquiry_no || !customer_id || !required_date || !items || items.length === 0) {
    return res.status(400).json({ error: "enquiry_no, customer_id, required_date, and items are required" });
  }

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
      include: {
        items: {
          include: { product: true }
        },
        customer: true
      }
    });
    res.json(enquiry);
  } catch (error: any) {
    res.status(400).json({ error: "Failed to create enquiry", detail: error.message });
  }
});

export default router;
