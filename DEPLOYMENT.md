# ARB ResearchHub Deployment

Deploy this monorepo as two Vercel projects from the same Git repository.

## 1. Backend Project

- Root directory: `backend`
- Framework preset: Other
- Build command: `npm run build`
- Start command: `npm start`
- Health check path: `/health`

Required production environment variables:

```bash
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
JWT_ACCESS_SECRET=generate-a-long-random-secret
JWT_REFRESH_SECRET=generate-a-different-long-random-secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
ALLOWED_EMAIL_DOMAIN=unilag.edu.ng
STORAGE_DRIVER=supabase
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET=papers
ENABLE_PASSWORD_RESET=false
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
EMBEDDING_MODEL=hashing-v1
EMBEDDING_DIM=384
WARM_EMBEDDINGS_ON_START=false
```

If the database password contains `@`, encode it as `%40` in `DATABASE_URL`.

Run migrations once before or after the first deploy:

```bash
cd backend
NODE_ENV=production DATABASE_URL="postgresql://..." JWT_ACCESS_SECRET="..." JWT_REFRESH_SECRET="..." npm run migrate
```

Create the first admin without demo data:

```bash
cd backend
NODE_ENV=production DATABASE_URL="postgresql://..." JWT_ACCESS_SECRET="..." JWT_REFRESH_SECRET="..." SEED_ADMIN_EMAIL="admin@unilag.edu.ng" SEED_ADMIN_PASSWORD="change-this" npm run bootstrap:admin
```

Do not run `npm run seed` in production.

## 2. Frontend Project

- Root directory: `frontend`
- Framework preset: Next.js
- Build command: `npm run build`

Required production environment variable:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

After both projects are deployed, update backend `FRONTEND_URL` to the final frontend domain and redeploy the backend.
