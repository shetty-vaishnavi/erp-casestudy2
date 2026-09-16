# ERP Case Study

This is a full-stack ERP application built with the PERN stack (PostgreSQL, Express, React, Node.js).

## Tech Stack
- **Backend**: Node.js, Express, Prisma ORM, PostgreSQL, Jest/Supertest
- **Frontend**: React (Create React App), Tailwind CSS, React Router, Axios

## Project Setup

### 1. Database Setup
1. Ensure PostgreSQL is installed and running.
2. Create a database (e.g. `erp_casestudy`).
3. Set the `DATABASE_URL` in `backend/.env` to point to your database.

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm run seed  # Note: You may need to compile or run seed script manually
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Test Login Credentials
- **Admin Role:** admin / admin
- **Sales Role:** sales / sales

## Database Schema & Concurrency
The application uses Prisma ORM. The core tables include Users, Customers, Products, Inventory, Enquiries, Quotations, SalesOrders, and Dispatches.
**Concurrency handling for inventory reservation** is managed by checking the available inventory in an atomic fashion before confirming the Sales Order, ensuring that two concurrent reservations do not oversell the physical stock.

## API Documentation
(Assuming backend runs on http://localhost:5000)
- `POST /api/auth/login`: Authenticate and receive JWT
- `GET /api/products`: View inventory availability
- `POST /api/enquiries`: Create customer enquiry
- `POST /api/quotations`: Create quotation
- `POST /api/sales-orders/:id/confirm`: Confirm order and reserve inventory (Admin only)
- `POST /api/sales-orders/:id/dispatch`: Dispatch order (Admin only)

## Tests
To run the backend tests:
```bash
cd backend
npm test
```

