import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function requiredInProd(name: string, fallback?: string): string {
  const value = req(name, fallback);
  if ((process.env.NODE_ENV ?? 'development') === 'production' && value === fallback) {
    throw new Error(`Set ${name} for production`);
  }
  return value;
}

function bool(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: (process.env.NODE_ENV ?? 'development') === 'production',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  databaseUrl: requiredInProd('DATABASE_URL', 'postgres://arb:arb_password@localhost:5433/researchhub'),

  jwt: {
    accessSecret: requiredInProd('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: requiredInProd('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },

  allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN ?? 'unilag.edu.ng',

  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@unilag.edu.ng',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    name: process.env.SEED_ADMIN_NAME ?? 'ARB Administrator',
  },

  storage: {
    driver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 's3' | 'supabase',
    localDir: process.env.LOCAL_STORAGE_DIR ?? './uploads',
    s3: {
      region: process.env.S3_REGION ?? '',
      bucket: process.env.S3_BUCKET ?? '',
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? '',
    },
    supabase: {
      url: process.env.SUPABASE_URL ?? '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      bucket: process.env.SUPABASE_BUCKET ?? 'papers',
    },
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.EMAIL_FROM ?? 'ARB ResearchHub <no-reply@unilag.edu.ng>',
    passwordResetEnabled: bool('ENABLE_PASSWORD_RESET', process.env.NODE_ENV !== 'production'),
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY ?? '',
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  },

  embedding: {
    model: process.env.EMBEDDING_MODEL ?? 'hashing-v1',
    dim: parseInt(process.env.EMBEDDING_DIM ?? '384', 10),
    warmOnStart: bool('WARM_EMBEDDINGS_ON_START', process.env.NODE_ENV !== 'production'),
  },
} as const;
