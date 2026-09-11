import { NextResponse } from "next/server";

export async function GET() {
  let cfKeys: string[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env) {
      cfKeys = Object.keys(ctx.env);
    }
  } catch (e: any) {
    cfKeys = ["error: " + e.message];
  }

  const procKeys = Object.keys(process.env).filter(k => !k.startsWith("npm_"));

  return NextResponse.json({
    processEnvKeys: procKeys,
    cloudflareEnvKeys: cfKeys,
    hasServiceRoleKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_),
  });
}
