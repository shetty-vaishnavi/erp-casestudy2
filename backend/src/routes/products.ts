import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import prisma from "../prisma";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { inventory: true }
    });
    
    const productsWithAvailable = products.map((p: any) => ({
      ...p,
      available_inventory: p.inventory 
        ? p.inventory.physical_quantity - p.inventory.reserved_quantity 
        : 0
    }));

    res.json(productsWithAvailable);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

export default router;
