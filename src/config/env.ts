import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((val) =>
      val
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15),
  RATE_LIMIT_LOGIN: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_REGISTER: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_REFRESH: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_LOGOUT: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_FORGOT_PASSWORD: z.coerce.number().int().positive().default(3),
  RATE_LIMIT_RESET_PASSWORD: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_VERIFY_EMAIL: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_RESEND_VERIFICATION: z.coerce.number().int().positive().default(3),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
