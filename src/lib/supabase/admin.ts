import { createClient } from "@supabase/supabase-js";

export function getSecretKey(): string | undefined {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.SUPABASE_SERVICE_ROLE_) return process.env.SUPABASE_SERVICE_ROLE_;
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env) {
      const env = ctx.env as Record<string, unknown>;
      if (env.SUPABASE_SERVICE_ROLE_KEY) return env.SUPABASE_SERVICE_ROLE_KEY as string;
      if (env.SUPABASE_SERVICE_ROLE_) return env.SUPABASE_SERVICE_ROLE_ as string;
    }
  } catch {
    // ignore
  }

  // Check globalThis if injected by runtime
  const g = globalThis as unknown as Record<string, unknown>;
  if (g.SUPABASE_SERVICE_ROLE_KEY) return g.SUPABASE_SERVICE_ROLE_KEY as string;
  if (g.SUPABASE_SERVICE_ROLE_) return g.SUPABASE_SERVICE_ROLE_ as string;
  if (g.env && typeof g.env === "object") {
    const genv = g.env as Record<string, unknown>;
    if (genv.SUPABASE_SERVICE_ROLE_KEY) return genv.SUPABASE_SERVICE_ROLE_KEY as string;
    if (genv.SUPABASE_SERVICE_ROLE_) return genv.SUPABASE_SERVICE_ROLE_ as string;
  }

  return undefined;
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_U || "https://sstduefzeufwmltjzknc.supabase.co";
  const serviceRoleKey = getSecretKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
