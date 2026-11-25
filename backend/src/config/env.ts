import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_BASE_URL: z.string().default('http://localhost:4000/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().default('postgresql://worksphere:worksphere_password@localhost:5432/worksphere_db?schema=public'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().default('dev_jwt_access_secret_super_secure_32_characters_minimum_key'),
  JWT_REFRESH_SECRET: z.string().default('dev_jwt_refresh_secret_super_secure_32_characters_minimum_key'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  ANALYTICS_SERVICE_URL: z.string().default('http://localhost:8000'),
  ANALYTICS_INTERNAL_API_KEY: z.string().default('ws_internal_sec_analytics_dev_key_2026'),

  STORAGE_MODE: z.enum(['local', 's3']).default('local'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('worksphere-attachments'),
  S3_ACCESS_KEY_ID: z.string().default('minioadmin'),
  S3_SECRET_ACCESS_KEY: z.string().default('minioadmin'),

  EMAIL_PROVIDER: z.enum(['mock', 'resend']).default('mock'),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('notifications@worksphere.local'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Environment variable validation failed');
}

export const env = parsed.data;

if (env.EMAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
}
