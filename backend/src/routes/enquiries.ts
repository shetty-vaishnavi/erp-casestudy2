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
  
  let { enquiry_no, customer_id, required_date, notes, items, customerName, item: productName, quantity } = req.body;
  if (customerName) {
    let cust = await prisma.customer.findFirst({ where: { company_name: customerName } });
    if (!cust) cust = await prisma.customer.create({ data: { company_name: customerName, contact_person: "Unknown", mobile: "0", email: "a@a.com", city: "Unknown" } });
    customer_id = cust.id;
  }
  if (productName && (!items || items.length === 0)) {
    let prod = await prisma.product.findFirst({ where: { name: productName } });
    if (!prod) prod = await prisma.product.findFirst();
    items = [{ product_id: prod.id, quantity: quantity || 1 }];
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
      include: { items: true }
    });
    res.json(enquiry);
  } catch (error) {
    res.status(400).json({ error: "Failed to create enquiry" });
  }
});

export default router;

