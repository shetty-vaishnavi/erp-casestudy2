import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth";
import prisma from "../prisma";

const router = Router();

// Both ADMIN and SALES can view quotations
router.get("/", authenticate, requireRole("ADMIN", "SALES"), async (req, res) => {
  try {
    const quotations = await prisma.quotation.findMany({
      include: {
        customer: true,
        enquiry: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { id: "desc" }
    });
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quotations" });
  }
});

// Only SALES can create quotations
router.post("/", authenticate, requireRole("SALES"), async (req, res) => {
  const { quotation_no, enquiry_id, customer_id, valid_until, items } = req.body;

  if (!quotation_no || !enquiry_id || !customer_id || !valid_until || !items || items.length === 0) {
    return res.status(400).json({ error: "quotation_no, enquiry_id, customer_id, valid_until, and items are required" });
  }

  try {
    let total_amount = 0;
    const computedItems = items.map((item: any) => {
      const base = item.quantity * item.unit_price;
      const afterDiscount = base - base * ((item.discount_pct || 0) / 100);
      const lineAmount = afterDiscount + afterDiscount * ((item.gst_pct || 0) / 100);
      total_amount += lineAmount;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_pct: item.discount_pct || 0,
        gst_pct: item.gst_pct || 0,
        line_amount: parseFloat(lineAmount.toFixed(2))
      };
    });

    total_amount = parseFloat(total_amount.toFixed(2));

    // Create quotation and update enquiry status to QUOTED atomically
    const [quotation] = await prisma.$transaction([
      prisma.quotation.create({
        data: {
          quotation_no,
          enquiry_id,
          customer_id,
          valid_until: new Date(valid_until),
          total_amount,
          items: { create: computedItems }
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          enquiry: true
        }
      }),
      prisma.enquiry.update({
        where: { id: enquiry_id },
        data: { status: "QUOTED" }
      })
    ]);

    res.json(quotation);
  } catch (error: any) {
    res.status(400).json({ error: "Failed to create quotation", detail: error.message });
  }
});

// Update quotation status: DRAFT→SENT→ACCEPTED/REJECTED
// Both ADMIN and SALES can update status
router.patch("/:id/status", authenticate, requireRole("ADMIN", "SALES"), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
  }

  try {
    const id = parseInt(req.params.id as string);
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Quotation not found" });

    const q = await prisma.quotation.update({
      where: { id },
      data: { status },
      include: { customer: true, enquiry: true, items: { include: { product: true } } }
    });

    // If accepted, update enquiry status to WON; if rejected, update to LOST
    if (status === "ACCEPTED") {
      await prisma.enquiry.update({ where: { id: q.enquiry_id }, data: { status: "WON" } });
    } else if (status === "REJECTED") {
      await prisma.enquiry.update({ where: { id: q.enquiry_id }, data: { status: "LOST" } });
    }

    res.json(q);
  } catch (error: any) {
    res.status(400).json({ error: "Failed to update status", detail: error.message });
  }
});

// Convert ACCEPTED quotation → Sales Order (SALES role only)
router.post("/:id/convert", authenticate, requireRole("SALES"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const q = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!q) return res.status(404).json({ error: "Quotation not found" });
    if (q.status === "REJECTED" || q.status === "DRAFT") {
      return res.status(400).json({ error: "Cannot convert DRAFT or REJECTED quotation" });
    }
    if (q.status !== "ACCEPTED") {
      return res.status(400).json({ error: "Only ACCEPTED quotations can be converted to Sales Orders" });
    }

    // Prevent duplicate Sales Orders for the same quotation
    const existingSo = await prisma.salesOrder.findFirst({ where: { quotation_id: q.id } });
    if (existingSo) return res.status(400).json({ error: "Sales order already generated for this quotation" });

    const order_no = `SO-${Date.now()}`;

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
      },
      include: { items: true, customer: true }
    });

    res.json(so);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
