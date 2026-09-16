import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/index";
import prisma from "../src/prisma";

jest.mock("../src/prisma", () => {
  const mPrisma: any = {
    quotation: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    salesOrder: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    inventory: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (cb) => cb(mPrisma)),
  };
  return {
    __esModule: true,
    default: mPrisma,
  };
});

const prismaMock = prisma as any;

describe("ERP Backend Tests", () => {
  const JWT_SECRET = "test_secret";
  process.env.JWT_SECRET = JWT_SECRET;

  const salesToken = jwt.sign({ id: 1, role: "SALES" }, JWT_SECRET);
  const adminToken = jwt.sign({ id: 2, role: "ADMIN" }, JWT_SECRET);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Quotation total calculated correctly", async () => {
    prismaMock.quotation.create.mockImplementation(async (args: any) => {
      return { id: 1, ...args.data };
    });

    const res = await request(app)
      .post("/api/quotations")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        quotation_no: "Q-001",
        enquiry_id: 1,
        customer_id: 1,
        valid_until: "2030-01-01",
        items: [
          {
            product_id: 1,
            quantity: 2,
            unit_price: 100,
            discount_pct: 10,
            gst_pct: 10,
          }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.total_amount).toBe(198);
  });

  it("Rejected/Draft quotation cannot create Sales Order", async () => {
    prismaMock.quotation.findUnique.mockResolvedValue({
      id: 1,
      status: "REJECTED",
      items: []
    });

    const res = await request(app)
      .post("/api/quotations/1/convert")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot convert DRAFT or REJECTED quotation/);
  });

  it("Same quotation cannot generate duplicate Sales Orders", async () => {
    prismaMock.quotation.findUnique.mockResolvedValue({
      id: 1,
      status: "ACCEPTED",
      items: []
    });
    prismaMock.salesOrder.findFirst.mockResolvedValue({ id: 100 });

    const res = await request(app)
      .post("/api/quotations/1/convert")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Sales order already generated/);
  });

  it("Cannot reserve more than available inventory", async () => {
    prismaMock.salesOrder.findUnique.mockResolvedValue({
      id: 1,
      status: "PENDING",
      items: [{ product_id: 1, quantity: 10 }]
    });

    prismaMock.inventory.findUnique.mockResolvedValue({
      product_id: 1,
      physical_quantity: 5,
      reserved_quantity: 0
    });

    const res = await request(app)
      .post("/api/sales-orders/1/confirm")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot reserve more than available inventory/);
  });

  it("Unauthorized user cannot perform restricted operation", async () => {
    const res = await request(app)
      .get("/api/sales-orders")
      .set("Authorization", `Bearer ${salesToken}`)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/);
  });
});
