# ARB ResearchHub

Web platform for the University of Lagos Faculty of Engineering: students submit completed
research projects, an admin reviews and publishes them, and approved papers become a
publicly searchable research library with **keyword** and **AI-powered semantic** search.

Built to PRD v2.0 (two-role model: Student, Admin + public visitors).

## Stack

| Layer      | Tech |
|------------|------|
| Frontend   | Next.js 15 (App Router, TS), Tailwind, shadcn-style UI |
| Backend    | Express (TS), REST, modular route/controller/service |
| Database   | PostgreSQL 16 + `pgvector` — full-text search (tsvector/GIN/trigram) + vector embeddings |
| Search     | PG FTS (keyword) + local MiniLM embeddings (pgvector recall) + Groq Llama (AI understanding/rerank) |
| Files      | S3 / Supabase Storage (env-driven) with a local-disk fallback for dev |
| Auth       | JWT access + refresh; email verify & password reset via Resend (console fallback) |

## Quick start

```bash
# 1. Postgres + pgvector
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env          # fill in GROQ_API_KEY etc. (works with defaults for local)
npm install
npm run migrate               # creates schema + extensions
npm run seed                  # seeds an admin + demo data
npm run dev                   # http://localhost:4000

# 3. Frontend
cd ../frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

Default seeded admin: `admin@unilag.edu.ng` / `Admin123!`

## Environment

The backend reads all integrations from env (see `backend/.env.example`). It runs fully
locally with no external accounts (local disk storage, console email, local embeddings);
provide `GROQ_API_KEY` to enable the AI search layer, and `S3_*` / `SUPABASE_*` /
`RESEND_API_KEY` to switch to real cloud services.
