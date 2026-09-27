import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();

    const [bibitsRes, bottlesRes] = await Promise.all([
      supabase
        .from("bibit")
        .select("id, name, slug, collection, intensity, main_accord, price_per_ml, top_notes, middle_notes, base_notes")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("bottles")
        .select("id, name, capacity_ml, price, image_url, is_active")
        .eq("is_active", true)
        .order("capacity_ml", { ascending: true })
        .order("name", { ascending: true })
    ]);

    if (bibitsRes.error) {
      console.error("Error fetching bibits:", bibitsRes.error);
      return NextResponse.json({ error: bibitsRes.error.message }, { status: 500 });
    }

    const response = NextResponse.json({
      bibits: bibitsRes.data || [],
      bottles: bottlesRes.data || []
    });

    // Cache header: cache for 60s in browser, 300s in Cloudflare Edge CDN
    response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");

    return response;
  } catch (err: any) {
    console.error("API /api/bibits error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
