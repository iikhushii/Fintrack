# Finance Dashboard Backend

A production-ready REST API for a role-based finance dashboard system, built with **Node.js**, **Express**, **SQLite** (via `better-sqlite3`), and **JWT** authentication.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Role & Permission Matrix](#role--permission-matrix)
- [API Reference](#api-reference)
  - [Auth](#auth-apiv1auth)
  - [Users](#users-apiv1users--admin-only)
  - [Transactions](#transactions-apiv1transactions)
  - [Dashboard](#dashboard-apiv1dashboard)
- [Data Models](#data-models)
- [Filtering, Pagination & Sorting](#filtering-pagination--sorting)
- [Error Handling](#error-handling)
- [Design Decisions](#design-decisions)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  HTTP Request                    │
└────────────────────┬────────────────────────────┘
                     │
           ┌─────────▼──────────┐
           │   Morgan Logger    │  (HTTP logging)
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │  express.json()    │  (Body parsing)
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │   Route Matcher    │  /api/v1/*
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │   authenticate()   │  JWT verification
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │   requireRole()    │  RBAC guard
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │  Validator chain   │  express-validator
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │    Controller      │  Business logic
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │  better-sqlite3    │  Synchronous SQLite
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │  finance.db file   │  Persistence
           └────────────────────┘
```

---

## Tech Stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| Runtime          | Node.js 18+                         |
| Framework        | Express 4                           |
| Database         | SQLite via `better-sqlite3`         |
| Auth             | JWT (`jsonwebtoken`) + bcrypt        |
| Validation       | `express-validator`                 |
| Logging          | `morgan`                            |
| Cross-origin     | `cors`                              |
| IDs              | `uuid` v4                           |

> **Why SQLite?**  
> SQLite requires zero infrastructure, is file-based, and `better-sqlite3` provides a synchronous API that pairs cleanly with Express's synchronous controller style. For a production deployment, swap the `getDb()` adapter for PostgreSQL or MySQL without changing any controller code.

---

## Project Structure

```
finance-backend/
├── .env                          # Environment variables
├── package.json
├── src/
│   ├── server.js                 # Entry point — starts HTTP server
│   ├── app.js                    # Express app factory
│   ├── config/
│   │   ├── database.js           # SQLite connection + schema DDL
│   │   └── seed.js               # Dev seed — users + sample transactions
│   ├── middleware/
│   │   ├── auth.js               # JWT verification → req.user
│   │   ├── rbac.js               # requireRole() / requireExactRoles()
│   │   ├── validate.js           # express-validator result handler
│   │   └── errorHandler.js       # Global error handler + createError()
│   ├── validators/
│   │   ├── auth.validator.js     # Register / login rules
│   │   ├── transaction.validator.js
│   │   └── user.validator.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── transactions.controller.js
│   │   └── dashboard.controller.js
│   └── routes/
│       ├── index.js              # Mounts all routers
│       ├── auth.routes.js
│       ├── users.routes.js
│       ├── transactions.routes.js
│       └── dashboard.routes.js
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9+

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (edit as needed)
cp .env .env.local

# 3. Seed the database with demo users and transactions
npm run seed

# 4. Start the server
npm start

# Development mode with file-watch auto-restart
npm run dev
```

The API will be available at: `http://localhost:3000/api/v1`

### Seed Accounts

| Email                  | Password      | Role    |
|------------------------|---------------|---------|
| admin@finance.dev      | Admin@123     | admin   |
| analyst@finance.dev    | Analyst@123   | analyst |
| viewer@finance.dev     | Viewer@123    | viewer  |

---

## Role & Permission Matrix

| Action                          | viewer | analyst | admin |
|---------------------------------|:------:|:-------:|:-----:|
| Login / register                | ✓      | ✓       | ✓     |
| View own profile (`/auth/me`)   | ✓      | ✓       | ✓     |
| **Transactions**                |        |         |       |
| List / get transactions         | ✓      | ✓       | ✓     |
| Create transaction              | ✗      | ✓       | ✓     |
| Update transaction              | ✗      | ✓       | ✓     |
| Delete transaction (soft)       | ✗      | ✗       | ✓     |
| **Dashboard**                   |        |         |       |
| Summary / current month         | ✓      | ✓       | ✓     |
| Category breakdown              | ✗      | ✓       | ✓     |
| Monthly trend                   | ✗      | ✓       | ✓     |
| Weekly trend                    | ✗      | ✓       | ✓     |
| Recent activity                 | ✗      | ✓       | ✓     |
| **User Management**             |        |         |       |
| List / get users                | ✗      | ✗       | ✓     |
| Create user (any role)          | ✗      | ✗       | ✓     |
| Update user role/status         | ✗      | ✗       | ✓     |
| Delete user                     | ✗      | ✗       | ✓     |

---

## API Reference

All endpoints are prefixed with `/api/v1`.  
Protected routes require the header: `Authorization: Bearer <token>`

---

### Auth `/api/v1/auth`

#### `POST /auth/register`
Self-registration — role defaults to `viewer`.

**Body**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Secret@99"
}
```

**Response `201`**
```json
{
  "token": "<jwt>",
  "user": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "viewer",
    "status": "active",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

#### `POST /auth/login`

**Body**
```json
{ "email": "admin@finance.dev", "password": "Admin@123" }
```

**Response `200`**
```json
{ "token": "<jwt>", "user": { ... } }
```

---

#### `GET /auth/me` 🔒
Returns the currently authenticated user.

---

### Users `/api/v1/users` — Admin Only

#### `GET /users`
Paginated list of all users.

**Query params**

| Param  | Type   | Description                        |
|--------|--------|------------------------------------|
| role   | string | Filter by `viewer`, `analyst`, `admin` |
| status | string | Filter by `active` or `inactive`   |
| page   | int    | Default `1`                        |
| limit  | int    | Default `20`                       |

**Response `200`**
```json
{
  "total": 3,
  "page": 1,
  "limit": 20,
  "pages": 1,
  "data": [ { "id": "...", "name": "...", "role": "admin", ... } ]
}
```

---

#### `POST /users`
Admin creates a user with any role.

**Body**
```json
{
  "name": "Sam Smith",
  "email": "sam@example.com",
  "password": "Secure@1",
  "role": "analyst"
}
```

---

#### `GET /users/:id`
Fetch a single user by ID.

---

#### `PATCH /users/:id`
Update a user's `name`, `role`, or `status`.

```json
{ "role": "analyst", "status": "inactive" }
```

> Admins cannot demote their own role.

---

#### `DELETE /users/:id`
Hard delete. Admins cannot delete themselves.

---

### Transactions `/api/v1/transactions`

#### `GET /transactions` 🔒 (all roles)
Paginated list with filters.

**Query params**

| Param    | Type   | Description                             |
|----------|--------|-----------------------------------------|
| type     | string | `income` or `expense`                   |
| category | string | One of the valid categories (see below) |
| from     | date   | `YYYY-MM-DD` range start                |
| to       | date   | `YYYY-MM-DD` range end                  |
| page     | int    | Default `1`                             |
| limit    | int    | Default `20`, max `100`                 |
| sort     | string | `date_asc`, `date_desc` (default), `amount_asc`, `amount_desc` |

**Response `200`**
```json
{
  "total": 45,
  "page": 1,
  "limit": 20,
  "pages": 3,
  "data": [
    {
      "id": "uuid",
      "amount": 5000.00,
      "type": "income",
      "category": "Salary",
      "date": "2024-01-31",
      "notes": "Monthly salary",
      "created_at": "2024-01-31T09:00:00Z",
      "creator_id": "uuid",
      "creator_name": "Alice Admin"
    }
  ]
}
```

---

#### `POST /transactions` 🔒 (analyst, admin)

**Body**
```json
{
  "amount": 1200.50,
  "type": "income",
  "category": "Freelance",
  "date": "2024-02-10",
  "notes": "Web design project"
}
```

**Valid categories:** `Salary`, `Freelance`, `Investment`, `Rent`, `Groceries`, `Utilities`, `Entertainment`, `Travel`, `Healthcare`, `Education`, `Other`

---

#### `GET /transactions/:id` 🔒 (all roles)

---

#### `PATCH /transactions/:id` 🔒 (analyst, admin)
Partial update — all fields optional.

```json
{ "amount": 1350.00, "notes": "Revised invoice" }
```

---

#### `DELETE /transactions/:id` 🔒 (admin only)
**Soft delete** — sets `is_deleted = 1`. The record remains in the database for audit purposes and will not appear in any listing or summary queries.

---

### Dashboard `/api/v1/dashboard`

#### `GET /dashboard/summary` 🔒 (all roles)
Overall totals. Accepts optional `from` / `to` date range.

**Response `200`**
```json
{
  "total_income": 12540.75,
  "total_expenses": 4890.24,
  "net_balance": 7650.51,
  "transaction_count": 38,
  "period": { "from": "2024-01-01", "to": "2024-03-31" }
}
```

---

#### `GET /dashboard/current-month` 🔒 (all roles)
Identical to `/summary` but automatically scoped to the current calendar month.

---

#### `GET /dashboard/category-breakdown` 🔒 (analyst, admin)
Income and expense totals grouped by category.

**Query params:** `type` (optional), `from`, `to`

**Response `200`**
```json
{
  "income": [
    { "category": "Salary",    "total": 10000.00, "count": 2 },
    { "category": "Freelance", "total": 2000.50,  "count": 3 }
  ],
  "expense": [
    { "category": "Rent",      "total": 3000.00, "count": 2 },
    { "category": "Groceries", "total": 590.75,  "count": 4 }
  ]
}
```

---

#### `GET /dashboard/monthly-trend` 🔒 (analyst, admin)
Income vs. expense totals per month.

**Query params:** `months` (1–24, default `6`)

**Response `200`**
```json
{
  "months": 6,
  "trend": [
    { "month": "2023-10", "income": 5200.00, "expense": 2100.00, "net": 3100.00 },
    { "month": "2023-11", "income": 6100.00, "expense": 2450.00, "net": 3650.00 },
    ...
  ]
}
```

> Months with zero transactions are filled in automatically — no gaps in the chart data.

---

#### `GET /dashboard/weekly-trend` 🔒 (analyst, admin)
Day-by-day income vs. expense for the last 7 days.

**Response `200`**
```json
{
  "trend": [
    { "date": "2024-02-05", "income": 0,      "expense": 65.99 },
    { "date": "2024-02-06", "income": 1200.50, "expense": 0 },
    ...
  ]
}
```

---

#### `GET /dashboard/recent-activity` 🔒 (analyst, admin)
The N most recently created transactions.

**Query params:** `limit` (default `10`, max `50`)

---

## Data Models

### User

| Field      | Type    | Notes                                  |
|------------|---------|----------------------------------------|
| id         | UUID    | Primary key                            |
| name       | string  | 2–80 chars                             |
| email      | string  | Unique                                 |
| password   | string  | bcrypt hash, never returned in API     |
| role       | enum    | `viewer`, `analyst`, `admin`           |
| status     | enum    | `active`, `inactive`                   |
| created_at | ISO8601 |                                        |
| updated_at | ISO8601 |                                        |

### Transaction

| Field      | Type    | Notes                                        |
|------------|---------|----------------------------------------------|
| id         | UUID    | Primary key                                  |
| amount     | float   | Must be > 0                                  |
| type       | enum    | `income` or `expense`                        |
| category   | enum    | One of 11 valid categories                   |
| date       | date    | `YYYY-MM-DD`                                 |
| notes      | string  | Optional, max 500 chars                      |
| created_by | UUID    | Foreign key → users                          |
| is_deleted | boolean | Soft delete flag (0 = active, 1 = deleted)   |
| created_at | ISO8601 |                                              |
| updated_at | ISO8601 |                                              |

---

## Filtering, Pagination & Sorting

All list endpoints support:

```
GET /api/v1/transactions?type=expense&category=Rent&from=2024-01-01&to=2024-03-31&page=2&limit=10&sort=amount_desc
```

Responses always include `total`, `page`, `limit`, and `pages` for frontend pagination controls.

---

## Error Handling

All errors follow a consistent JSON shape:

```json
{ "error": "Human-readable message" }
```

Validation errors (HTTP `422`) include field-level detail:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "amount", "message": "Amount must be a positive number" },
    { "field": "date",   "message": "Date must be a valid ISO date (YYYY-MM-DD)" }
  ]
}
```

### Status Code Guide

| Code | Meaning                                |
|------|----------------------------------------|
| 200  | Success                                |
| 201  | Created                                |
| 400  | Bad request / no fields to update      |
| 401  | Missing, expired, or invalid JWT       |
| 403  | Authenticated but insufficient role    |
| 404  | Resource not found                     |
| 409  | Conflict (e.g. duplicate email)        |
| 422  | Validation failed                      |
| 500  | Internal server error                  |

---

## Design Decisions

### Synchronous SQLite
`better-sqlite3` runs queries synchronously. This keeps controller code free of async/await noise and eliminates entire classes of callback/Promise bugs, with no meaningful performance cost for a dashboard-scale workload.

### Soft Deletes on Transactions
Financial records should never be permanently destroyed. `is_deleted = 1` hides a transaction from all queries while preserving the audit trail. All indexes include a `WHERE is_deleted = 0` partial filter so soft-deleted rows are never scanned.

### Role Hierarchy via ROLE_LEVELS Map
Instead of hardcoding role checks scattered across handlers, a single `requireRole(minRole)` factory encodes the `viewer → analyst → admin` hierarchy numerically. Adding a new role means editing one object.

### JWT Only (Stateless)
No server-side session store is needed. The token carries `sub` (user ID) and `role`. The `authenticate` middleware re-fetches the user row on every request, which means deactivating an account takes effect immediately on the next request — even if the token hasn't expired yet.

### Separation of Validators, Controllers, and Routes
Validation rules live in `validators/`, business logic in `controllers/`, and HTTP wiring in `routes/`. Each layer is independently testable and replaceable.

### Gap-Filling in Trend Endpoints
Monthly and weekly trend queries fill in zero-value entries for periods with no transactions. This means frontend chart libraries always receive a complete, contiguous array — no special-casing needed on the client.
