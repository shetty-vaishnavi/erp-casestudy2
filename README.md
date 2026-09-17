# ERP Case Study – PERN Stack

A full-stack ERP application implementing the workflow:
**Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js (TypeScript), Tailwind CSS, React Router, Axios |
| **Backend** | Node.js, Express.js (TypeScript) |
| **ORM** | Prisma v5 |
| **Database** | PostgreSQL (hosted on Neon) |
| **Auth** | JWT + bcrypt |
| **Testing** | Jest + Supertest |
| **Deployment** | Render (backend + frontend static) |

---

## Test Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin` |
| Sales | `sales` | `sales` |

---

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
JWT_SECRET=supersecret_erp_casestudy_key
PORT=5000
NODE_ENV=development
```

### Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Project Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (or a Neon/Supabase cloud database)

### 1. Clone the repository

```bash
git clone <repo-url>
cd FundsRoom_casestudy2
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env and set your DATABASE_URL and JWT_SECRET

# Push schema to database
npx prisma generate
npx prisma db push

# Seed the database (creates users + 6 industrial products)
npx tsx seed.ts

# Start development server
npm run dev
# or: npm start (production mode)
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# (Optional) create .env with your API URL
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

npm start
```

Frontend runs at `http://localhost:3000`

---

## Running Tests

```bash
cd backend
npm test
```

Tests use Jest + Supertest with a mocked Prisma client (no real database required):

| # | Test |
|---|------|
| 1 | Quotation total is calculated correctly (backend computation) |
| 2 | Rejected / Draft quotation cannot create a Sales Order |
| 2b | DRAFT quotation cannot create a Sales Order |
| 3 | Same quotation cannot generate duplicate Sales Orders |
| 4 | Cannot reserve more than available inventory |
| 5 | Unauthorized (SALES) user cannot access admin-only endpoint |
| Bonus | Simultaneous inventory reservations use SELECT FOR UPDATE locking |

---

## Database Schema / ER Diagram

```mermaid
erDiagram
    User {
        int id PK
        string username UK
        string password_hash
        string role
    }

    Customer {
        int id PK
        string company_name
        string contact_person
        string mobile
        string email
        string city
    }

    Product {
        int id PK
        string code UK
        string name
        string category
        string unit
        float base_price
    }

    Inventory {
        int product_id PK FK
        int physical_quantity
        int reserved_quantity
    }

    Enquiry {
        int id PK
        string enquiry_no UK
        int customer_id FK
        datetime date
        datetime required_date
        string notes
        string status
    }

    EnquiryItem {
        int id PK
        int enquiry_id FK
        int product_id FK
        int quantity
    }

    Quotation {
        int id PK
        string quotation_no UK
        int enquiry_id FK
        int customer_id FK
        datetime date
        datetime valid_until
        string status
        float total_amount
    }

    QuotationItem {
        int id PK
        int quotation_id FK
        int product_id FK
        int quantity
        float unit_price
        float discount_pct
        float gst_pct
        float line_amount
    }

    SalesOrder {
        int id PK
        string order_no UK
        int quotation_id FK
        int customer_id FK
        datetime date
        float total_amount
        string status
    }

    SalesOrderItem {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
    }

    Dispatch {
        int id PK
        string dispatch_no UK
        int order_id FK UK
        datetime date
        string vehicle_number
        string driver_name
    }

    Customer ||--o{ Enquiry : "places"
    Customer ||--o{ Quotation : "receives"
    Customer ||--o{ SalesOrder : "generates"
    Enquiry ||--o{ EnquiryItem : "contains"
    Enquiry ||--o{ Quotation : "has"
    Product ||--o{ EnquiryItem : "included in"
    Product ||--|| Inventory : "tracked by"
    Product ||--o{ QuotationItem : "quoted in"
    Product ||--o{ SalesOrderItem : "ordered in"
    Quotation ||--o{ QuotationItem : "contains"
    Quotation ||--o| SalesOrder : "converts to"
    SalesOrder ||--o{ SalesOrderItem : "contains"
    SalesOrder ||--o| Dispatch : "dispatched via"
```

**Enquiry Statuses:** `NEW → QUOTED → WON / LOST`  
**Quotation Statuses:** `DRAFT → SENT → ACCEPTED / REJECTED`  
**Sales Order Statuses:** `PENDING → CONFIRMED → DISPATCHED → CANCELLED`

**Available Quantity** = `physical_quantity − reserved_quantity`

---

## API Documentation

Base URL: `http://localhost:5000/api`

### Authentication

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Returns JWT token |

**Request body:**
```json
{ "username": "admin", "password": "admin" }
```

**Response:**
```json
{ "token": "...", "role": "ADMIN", "username": "admin" }
```

---

### Customers

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/customers` | Any auth | Create or find customer by company_name |
| GET | `/customers` | Any auth | List all customers |

---

### Products & Inventory

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/products` | Any auth | List products with inventory (includes `available_inventory`) |

---

### Enquiries

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/enquiries` | ADMIN, SALES | List all enquiries with customer & products |
| POST | `/enquiries` | SALES | Create new enquiry with items |

**POST body:**
```json
{
  "enquiry_no": "ENQ-001",
  "customer_id": 1,
  "required_date": "2025-12-01",
  "notes": "Urgent requirement",
  "items": [
    { "product_id": 1, "quantity": 100 },
    { "product_id": 2, "quantity": 40 }
  ]
}
```

---

### Quotations

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/quotations` | ADMIN, SALES | List quotations with enquiry & product details |
| POST | `/quotations` | SALES | Create quotation (backend calculates total) |
| PATCH | `/quotations/:id/status` | ADMIN, SALES | Update status (DRAFT/SENT/ACCEPTED/REJECTED) |
| POST | `/quotations/:id/convert` | SALES | Convert ACCEPTED quotation to Sales Order |

**POST body:**
```json
{
  "quotation_no": "QT-001",
  "enquiry_id": 1,
  "customer_id": 1,
  "valid_until": "2025-11-30",
  "items": [
    {
      "product_id": 1,
      "quantity": 100,
      "unit_price": 2450.00,
      "discount_pct": 5,
      "gst_pct": 18
    }
  ]
}
```

> **Note:** `total_amount` is always computed server-side. The frontend value is ignored.

---

### Sales Orders

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/sales-orders` | ADMIN | List all orders with items and dispatch info |
| GET | `/sales-orders/inventory` | ADMIN, SALES | View inventory availability |
| POST | `/sales-orders/:id/confirm` | ADMIN | Confirm & reserve inventory (uses `SELECT FOR UPDATE`) |
| POST | `/sales-orders/:id/dispatch` | ADMIN | Dispatch confirmed order |
| POST | `/sales-orders/:id/cancel` | ADMIN | Cancel order (releases reserved inventory) |

**Dispatch body:**
```json
{
  "dispatch_no": "DSP-001",
  "vehicle_number": "MH-12-AB-1234",
  "driver_name": "Ramesh Kumar"
}
```

---

## Concurrency Handling

The `/sales-orders/:id/confirm` endpoint uses PostgreSQL **row-level locking** (`SELECT ... FOR UPDATE`) inside a transaction to prevent two simultaneous requests from both successfully reserving the same stock:

```sql
-- Inside a transaction:
SELECT * FROM "SalesOrder" WHERE id = $1 FOR UPDATE;
SELECT * FROM "Inventory" WHERE product_id = $2 FOR UPDATE;
```

This ensures that if two requests arrive simultaneously, one will block until the other completes, and the second will correctly see the updated reserved quantity.

---

## Deployment (Render)

The `render.yaml` at the project root defines two services:

1. **erp-backend** – Node.js web service, auto-runs `prisma db push` and `seed.ts` on deploy
2. **erp-frontend** – Static site built with React, served with SPA rewrite rules

To deploy:
1. Push to GitHub
2. Connect the repo to Render
3. Set the `DATABASE_URL` environment variable in the Render dashboard for the backend service
4. Deploy both services

---

## Business Rules Summary

- DRAFT or REJECTED quotation → **cannot** convert to Sales Order
- One quotation → **at most one** Sales Order (enforced via unique FK check)
- Confirm order → **checks** `available = physical − reserved ≥ required`, **then** increments `reserved`
- Dispatch order → decrements both `physical` and `reserved` simultaneously
- Cancel CONFIRMED order → **releases** reserved inventory
- Dispatch of already-dispatched order is **prevented** (unique FK on dispatch)
