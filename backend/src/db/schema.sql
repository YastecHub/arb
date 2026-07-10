-- ARB ResearchHub schema (PRD v2.0)
-- pg_trgm powers typo-tolerant keyword search. Embeddings are stored as real[] and
-- ranked with cosine similarity in the app layer, so no pgvector extension is required
-- (portable to any Postgres, including managed/hosted instances). At larger scale this
-- column can be swapped for pgvector's vector(384) + ivfflat index with no API changes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PostgreSQL marks array_to_string as stable, which prevents its direct use in a
-- generated column even though text-array conversion is deterministic here.
CREATE OR REPLACE FUNCTION immutable_array_to_string(value TEXT[], separator TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$ SELECT array_to_string(value, separator) $$;

-- ---------- enums ----------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM (
    'draft', 'pending_review', 'revision_requested', 'rejected', 'published', 'unpublished'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,        -- stored lowercased by the app
  password_hash     TEXT NOT NULL,
  role              user_role NOT NULL DEFAULT 'student',
  department        TEXT,
  matric_number     TEXT,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token TEXT,
  reset_token       TEXT,
  reset_expires     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- submissions / papers ----------
CREATE TABLE IF NOT EXISTS submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  abstract      TEXT NOT NULL DEFAULT '',
  author_name   TEXT NOT NULL,
  matric_number TEXT,
  department    TEXT,
  session       TEXT,                       -- academic year / session
  tags          TEXT[] NOT NULL DEFAULT '{}',
  pdf_key       TEXT,                        -- storage object key
  pdf_url       TEXT,                        -- public/served URL
  status        submission_status NOT NULL DEFAULT 'draft',
  review_comment TEXT,
  full_text     TEXT NOT NULL DEFAULT '',
  index_status  TEXT NOT NULL DEFAULT 'none', -- none | processing | ready | error
  embedding     REAL[],                        -- 384-dim MiniLM embedding (cosine ranked in app)
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(abstract, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(immutable_array_to_string(tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(author_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(full_text, '')), 'D')
  ) STORED
);

-- ---------- notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email activation is intentionally disabled. Keep legacy columns for backwards
-- compatibility, but activate any accounts created by earlier versions.
UPDATE users
   SET is_verified = TRUE, verification_token = NULL
 WHERE is_verified = FALSE OR verification_token IS NOT NULL;

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS idx_submissions_status      ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_student     ON submissions (student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unique_matric_number
  ON users (lower(matric_number))
  WHERE matric_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_one_active_per_student
  ON submissions (student_id)
  WHERE status IN ('draft', 'pending_review', 'revision_requested');
CREATE INDEX IF NOT EXISTS idx_submissions_search_vec  ON submissions USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_submissions_title_trgm  ON submissions USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_submissions_abs_trgm    ON submissions USING GIN (abstract gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications (user_id, is_read);
