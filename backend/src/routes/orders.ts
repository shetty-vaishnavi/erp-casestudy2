import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth";
import prisma from "../prisma";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/", async (req, res) => {
  const orders = await prisma.salesOrder.findMany({ include: { items: true, customer: true } });
  res.json(orders);
});

router.post("/:id/confirm", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) throw new Error("Order not found");
      if (order.status !== "PENDING") throw new Error("Order not pending");

      for (const item of order.items) {
        const inv = await tx.inventory.findUnique({ where: { product_id: item.product_id } });
        if (!inv) throw new Error("Inventory not found");
        const available = inv.physical_quantity - inv.reserved_quantity;
        if (available < item.quantity) {
          throw new Error("Cannot reserve more than available inventory");
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

router.post("/:id/dispatch", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { dispatch_no, vehicle_number, driver_name } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) throw new Error("Order not found");
      if (order.status !== "CONFIRMED") throw new Error("Order not confirmed");

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
        data: {
          dispatch_no,
          order_id: orderId,
          vehicle_number,
          driver_name
        }
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
