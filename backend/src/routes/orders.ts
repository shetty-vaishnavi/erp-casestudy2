import { Router } from "express";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import prisma from "../prisma";

const router = Router();

// Only ADMIN can view all sales orders (spec: "ADMIN: View all records")
router.get("/", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        items: { include: { product: true } },
        customer: true,
        quotation: { include: { enquiry: true } },
        dispatch: true
      },
      orderBy: { id: "desc" }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sales orders" });
  }
});

// SALES can view inventory (products with available stock)
// (products route also exposes this, but keeping it explicit)
router.get("/inventory", authenticate, requireRole("ADMIN", "SALES"), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { inventory: true }
    });
    const result = products.map((p: any) => ({
      ...p,
      available: p.inventory ? p.inventory.physical_quantity - p.inventory.reserved_quantity : 0
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// Only ADMIN can confirm (reserve inventory) – uses row-level locking (SELECT FOR UPDATE)
router.post("/:id/confirm", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id as string);

    const result = await prisma.$transaction(async (tx) => {
      // Lock the order row to prevent concurrent modification (SELECT FOR UPDATE)
      const orders = await tx.$queryRawUnsafe<any[]>(
        `SELECT id, status FROM "SalesOrder" WHERE id = $1 FOR UPDATE`,
        orderId
      );
      if (!orders || orders.length === 0) throw new Error("Order not found");
      const order = orders[0];
      if (order.status !== "PENDING") throw new Error("Order is not in PENDING status");

      // Fetch order items
      const items = await tx.salesOrderItem.findMany({ where: { order_id: orderId } });

      for (const item of items) {
        // Lock the inventory row for this product to prevent race conditions
        const invRows = await tx.$queryRawUnsafe<any[]>(
          `SELECT product_id, physical_quantity, reserved_quantity FROM "Inventory" WHERE product_id = $1 FOR UPDATE`,
          item.product_id
        );
        if (!invRows || invRows.length === 0) {
          throw new Error(`No inventory record for product ${item.product_id}`);
        }
        const inv = invRows[0];
        const available = inv.physical_quantity - inv.reserved_quantity;

        if (available < item.quantity) {
          throw new Error(
            `Cannot reserve more than available inventory for product ${item.product_id}. Available: ${available}, Required: ${item.quantity}`
          );
        }

        await tx.inventory.update({
          where: { product_id: item.product_id },
          data: { reserved_quantity: { increment: item.quantity } }
        });
      }

      return await tx.salesOrder.update({
        where: { id: orderId },
        data: { status: "CONFIRMED" },
        include: { items: { include: { product: true } }, customer: true }
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
    const orderId = parseInt(req.params.id as string);
    const { dispatch_no, vehicle_number, driver_name } = req.body;

    if (!dispatch_no || !vehicle_number || !driver_name) {
      return res.status(400).json({ error: "dispatch_no, vehicle_number, and driver_name are required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
        include: { items: true, dispatch: true }
      });
      if (!order) throw new Error("Order not found");
      if (order.status !== "CONFIRMED") throw new Error("Order must be CONFIRMED before dispatch");
      if (order.dispatch) throw new Error("Order has already been dispatched");

      for (const item of order.items) {
        const inv = await tx.inventory.findUnique({ where: { product_id: item.product_id } });
        if (!inv) throw new Error(`No inventory for product ${item.product_id}`);
        if (inv.reserved_quantity < item.quantity) {
          throw new Error(`Cannot dispatch beyond reserved quantity for product ${item.product_id}`);
        }
        if (inv.physical_quantity < item.quantity) {
          throw new Error(`Cannot dispatch beyond physical quantity for product ${item.product_id}`);
        }

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
        data: { status: "DISPATCHED" },
        include: { items: { include: { product: true } }, customer: true, dispatch: true }
      });
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Only ADMIN can cancel a confirmed order (releases reserved inventory)
router.post("/:id/cancel", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id as string);

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
        include: { items: true }
      });
      if (!order) throw new Error("Order not found");
      if (order.status === "DISPATCHED") throw new Error("Cannot cancel an already dispatched order");
      if (order.status === "CANCELLED") throw new Error("Order is already cancelled");

      // Release reserved inventory only if it was CONFIRMED
      if (order.status === "CONFIRMED") {
        for (const item of order.items) {
          await tx.inventory.update({
            where: { product_id: item.product_id },
            data: { reserved_quantity: { decrement: item.quantity } }
          });
        }
      }

      return await tx.salesOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" }
      });
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
