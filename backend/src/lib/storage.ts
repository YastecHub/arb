import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export interface StoredFile {
  key: string;
  url: string;
}

interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<StoredFile>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  publicUrl(key: string): string;
}

// ---------------- Local disk (dev fallback) ----------------
class LocalDriver implements StorageDriver {
  dir = path.resolve(process.cwd(), env.storage.localDir);
  constructor() {
    fs.mkdirSync(this.dir, { recursive: true });
  }
  async put(key: string, body: Buffer): Promise<StoredFile> {
    const full = path.join(this.dir, key);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
    return { key, url: this.publicUrl(key) };
  }
  async get(key: string): Promise<Buffer> {
    return fs.readFileSync(path.join(this.dir, key));
  }
  async remove(key: string): Promise<void> {
    const full = path.join(this.dir, key);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
  publicUrl(key: string): string {
    const base = `http://localhost:${env.port}`;
    return `${base}/files/${key}`;
  }
}

// ---------------- AWS S3 ----------------
class S3Driver implements StorageDriver {
  private client: any;
  private bucket = env.storage.s3.bucket;
  constructor() {
    // Lazy require so local dev doesn't need AWS creds loaded.
    const { S3Client } = require('@aws-sdk/client-s3');
    this.client = new S3Client({
      region: env.storage.s3.region,
      credentials: {
        accessKeyId: env.storage.s3.accessKeyId,
        secretAccessKey: env.storage.s3.secretAccessKey,
      },
    });
  }
  async put(key: string, body: Buffer, contentType: string): Promise<StoredFile> {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType })
    );
    return { key, url: this.publicUrl(key) };
  }
  async get(key: string): Promise<Buffer> {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const chunks: Buffer[] = [];
    for await (const c of res.Body as any) chunks.push(Buffer.from(c));
    return Buffer.concat(chunks);
  }
  async remove(key: string): Promise<void> {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
  publicUrl(key: string): string {
    const base = env.storage.s3.publicBaseUrl ||
      `https://${this.bucket}.s3.${env.storage.s3.region}.amazonaws.com`;
    return `${base}/${key}`;
  }
}

// ---------------- Supabase Storage ----------------
class SupabaseDriver implements StorageDriver {
  private client: any;
  private bucket = env.storage.supabase.bucket;
  constructor() {
    const { createClient } = require('@supabase/supabase-js');
    this.client = createClient(env.storage.supabase.url, env.storage.supabase.serviceRoleKey);
  }
  async put(key: string, body: Buffer, contentType: string): Promise<StoredFile> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, body, { contentType, upsert: true });
    if (error) throw error;
    return { key, url: this.publicUrl(key) };
  }
  async get(key: string): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }
  async remove(key: string): Promise<void> {
    await this.client.storage.from(this.bucket).remove([key]);
  }
  publicUrl(key: string): string {
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(key);
    return data.publicUrl;
  }
}

function build(): StorageDriver {
  switch (env.storage.driver) {
    case 's3':
      return new S3Driver();
    case 'supabase':
      return new SupabaseDriver();
    default:
      return new LocalDriver();
  }
}

export const storage: StorageDriver = build();
