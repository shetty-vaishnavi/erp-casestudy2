import { Router } from "express";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import prisma from "../prisma";

const router = Router();

// Both roles can VIEW orders
router.get("/", authenticate, async (req, res) => {
  const orders = await prisma.salesOrder.findMany({ 
    include: { items: true, customer: true },
    orderBy: { id: "desc" }
  });
  res.json(orders);
});

// Only ADMIN can confirm (reserve inventory)
router.post("/:id/confirm", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
        include: { items: true }
      });
      if (!order) throw new Error("Order not found");
      if (order.status !== "PENDING") throw new Error("Order is not in PENDING status");

      for (const item of order.items) {
        const inv = await tx.inventory.findUnique({ where: { product_id: item.product_id } });
        if (!inv) throw new Error(`No inventory record for product ${item.product_id}`);
        const available = inv.physical_quantity - inv.reserved_quantity;
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.product_id}. Available: ${available}, Required: ${item.quantity}`);
        }
        await tx.inventory.update({
          where: { product_id: item.product_id },
          data: { reserved_quantity: { increment: item.quantity } }
        });
      }

      return await tx.salesOrder.update({
        where: { id: orderId },
        data: { status: "CONFIRMED" }
      });
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Only ADMIN can dispatch
router.post("/:id/dispatch", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { dispatch_no, vehicle_number, driver_name } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
        include: { items: true }
      });
      if (!order) throw new Error("Order not found");
      if (order.status !== "CONFIRMED") throw new Error("Order must be CONFIRMED before dispatch");

      for (const item of order.items) {
        await tx.inventory.update({
          where: { product_id: item.product_id },
          data: {
            physical_quantity: { decrement: item.quantity },
            reserved_quantity: { decrement: item.quantity }
          }
        });
      }

      await tx.dispatch.create({
        data: { dispatch_no, order_id: orderId, vehicle_number, driver_name }
      });

      return await tx.salesOrder.update({
        where: { id: orderId },
        data: { status: "DISPATCHED" }
      });
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
