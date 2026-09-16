import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth";
import prisma from "../prisma";

const router = Router();

router.use(authenticate, requireRole("SALES"));

router.get("/", async (req, res) => {
  const quotations = await prisma.quotation.findMany({ include: { items: true, customer: true }});
  res.json(quotations);
});

router.post("/", async (req, res) => {
  const { quotation_no, enquiry_id, customer_id, valid_until, items } = req.body;
  
  try {
    let total_amount = 0;
    const computedItems = items.map((item: any) => {
      const line_base = item.quantity * item.unit_price;
      const discount = line_base * ((item.discount_pct || 0) / 100);
      const post_discount = line_base - discount;
      const gst = post_discount * ((item.gst_pct || 0) / 100);
      const line_amount = post_discount + gst;
      total_amount += line_amount;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_pct: item.discount_pct || 0,
        gst_pct: item.gst_pct || 0,
        line_amount
      };
    });

    const quotation = await prisma.quotation.create({
      data: {
        quotation_no,
        enquiry_id,
        customer_id,
        valid_until: new Date(valid_until),
        total_amount,
        items: { create: computedItems }
      },
      include: { items: true }
    });

    res.json(quotation);
  } catch (error) {
    res.status(400).json({ error: "Failed to create quotation" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const q = await prisma.quotation.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status }
    });
    res.json(q);
  } catch (error) {
    res.status(400).json({ error: "Failed to update status" });
  }
});

router.post("/:id/convert", async (req, res) => {
  try {
    const q = await prisma.quotation.findUnique({ where: { id: parseInt(req.params.id) }, include: { items: true } });
    if (!q) return res.status(404).json({ error: "Quotation not found" });
    if (q.status === "REJECTED" || q.status === "DRAFT") return res.status(400).json({ error: "Cannot convert DRAFT or REJECTED quotation" });

    const existingSo = await prisma.salesOrder.findFirst({ where: { quotation_id: q.id } });
    if (existingSo) return res.status(400).json({ error: "Sales order already generated" });

    const order_no = `SO-${q.quotation_no}-${Date.now()}`;

    const so = await prisma.salesOrder.create({
      data: {
        order_no,
        quotation_id: q.id,
        customer_id: q.customer_id,
        total_amount: q.total_amount,
        items: {
          create: q.items.map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity
          }))
        }
      }
    });

    res.json(so);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
