# Identity Reconciliation Service

Backend implementation of the Bitespeed Identity Reconciliation task.

## Tech Stack

* Bun
* Hono
* PostgreSQL
* Prisma 7 (`prisma-client` + pg adapter)
* TypeScript

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Create PostgreSQL database

```bash
createdb identity_dev
```

### 3. Configure environment

Create `.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/identity_dev"
```

### 4. Run migrations

```bash
bunx prisma migrate dev
```

### 5. Start server

```bash
bun run src/index.ts
```

Server runs on:

```
http://localhost:3000
```

## API

### POST `/identify`

Request body:

```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

At least one field must be provided.

Response:

```json
{
  "contact": {
    "primaryContactId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}
```

## Run Tests

```bash
bun test
```
