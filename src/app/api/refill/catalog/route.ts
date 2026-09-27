import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch active bibits with fields needed for the wizard
    const { data: bibits, error: bibitsError } = await supabase
      .from("bibit")
      .select("id, name, slug, collection, intensity, main_accord, price_per_ml, top_notes, middle_notes, base_notes")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (bibitsError) {
      throw bibitsError;
    }

    // Fetch active bottles
    const { data: bottles, error: bottlesError } = await supabase
      .from("bottles")
      .select("id, name, capacity_ml, price, image_url, is_active")
      .eq("is_active", true)
      .order("capacity_ml", { ascending: true });

    if (bottlesError) {
      throw bottlesError;
    }

    return NextResponse.json(
      {
        success: true,
        bibits: bibits || [],
        bottles: bottles || []
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
        }
      }
    );
  } catch (err: any) {
    console.error("Error in /api/refill/catalog:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load catalog" },
      { status: 500 }
    );
  }
}
