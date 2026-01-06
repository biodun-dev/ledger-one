# LedgerOne - Double-Entry Accounting Service

**Tagline:** An idempotent, immutable financial transaction engine.

## Overview
LedgerOne is a senior-level engineering project demonstrating how to build a financial system that guarantees data integrity, concurrency control, and idempotency. It implements a strict double-entry accounting core where `Sum(Debits) == Sum(Credits)` is always enforced within `SERIALIZABLE` SQL transactions.

## Tech Stack
- **Backend:** NestJS (TypeScript), TypeORM
- **Database:** PostgreSQL (Strict ACID compliance)
- **Frontend:** Next.js, Tailwind CSS, Shadcn UI
- **Testing:** FastCheck (Property-based testing)
- **Infrastructure:** Docker Compose

## Features
- **Double-Entry Core:** Every transaction must be balanced.
- **Idempotency:** `Idempotency-Key` header ensures safe retries. Requests with the same key return the cached response without re-processing.
- **Concurrency Control:** Pessimistic locking and Serializable isolation level prevent race conditions (e.g., double spending).
- **Audit Trail:** Complete history of all financial movements (Immutable ledger).

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js & pnpm

### Installation
1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the database:
   ```bash
   docker-compose up -d
   ```

3. Run migrations (Backend):
   ```bash
   cd backend
   pnpm run migration:run
   cd ..
   ```
   *(Note: This happens automatically if `migrationsRun: true` is set in app module, but manual run is safer)*

4. Seed the database (Backend):
   ```bash
   cd backend
   pnpm run seed
   cd ..
   ```

5. Start the application (Frontend + Backend):
   ```bash
   pnpm dev
   ```
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Architecture Highlights
- **Monorepo:** Managed by pnpm workspaces.
- **Strict Mode:** The backend uses `SERIALIZABLE` isolation validation to fail fast on concurrency conflicts.
- **Validation:** Joi for env vars, Class-Validator for DTOs.
