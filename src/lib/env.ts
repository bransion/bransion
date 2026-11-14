// =====================================================================
// BRANSION — Environment variable guard.
// =====================================================================
import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid URL (https://xxx.supabase.co)",
    ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short"),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z
    .string()
    .startsWith("pk_", "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY must start with pk_"),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL must be a valid URL"),

  // V3 Additions
  NEXT_PUBLIC_WHATSAPP_SUPPORT: z.string().optional(),
  NEXT_PUBLIC_STORAGE_BUCKET_STYLES: z.string().default("style-previews"),
});

const serverSchema = clientSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, "SUPABASE_SERVICE_ROLE_KEY looks too short"),
  PAYSTACK_SECRET_KEY: z
    .string()
    .startsWith("sk_", "PAYSTACK_SECRET_KEY must start with sk_"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  CRON_SECRET: z
    .string()
    .min(16, "CRON_SECRET must be at least 16 chars")
    .optional(),
});

// ── Friendly error formatter ─────────────────────────────────────────
function parseOrDie<T extends z.ZodTypeAny>(
  schema: T,
  data: Record<string, unknown>,
  label: "client" | "server",
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const lines = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\n\n❌ Invalid ${label} environment variables:\n${lines}\n\n` +
        `Fix your .env.local file and restart the dev server.\n`,
    );
  }
  return result.data;
}

// ── CLIENT-SAFE export (runs on both client and server) ──────────────
export const clientEnv = parseOrDie(
  clientSchema,
  {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_WHATSAPP_SUPPORT: process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT,
    NEXT_PUBLIC_STORAGE_BUCKET_STYLES:
      process.env.NEXT_PUBLIC_STORAGE_BUCKET_STYLES,
  },
  "client",
);

// ── SERVER-ONLY export (null on the browser — hard guard) ────────────
export const serverEnv =
  typeof window === "undefined"
    ? parseOrDie(
        serverSchema,
        {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
            process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
          NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
          NEXT_PUBLIC_WHATSAPP_SUPPORT:
            process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT,
          NEXT_PUBLIC_STORAGE_BUCKET_STYLES:
            process.env.NEXT_PUBLIC_STORAGE_BUCKET_STYLES,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
          PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
          ADMIN_EMAIL: process.env.ADMIN_EMAIL,
          CRON_SECRET: process.env.CRON_SECRET,
        },
        "server",
      )
    : (null as unknown as z.infer<typeof serverSchema>);

// ── Helper for server-only files ─────────────────────────────────────
export function requireServerEnv() {
  if (!serverEnv) {
    throw new Error(
      'This file is server-only. Do not import it from a "use client" component.',
    );
  }
  return serverEnv;
}
