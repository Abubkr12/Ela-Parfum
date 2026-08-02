import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data, error } = await supabase
      .from("custom_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // Try to find the associated order based on notes containing the CustomRequestID
    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .ilike('notes', `%CustomRequestID: ${id}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ data, order: orderData || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;
    
    // Check auth (assuming admin)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // Update logic
    const { data, error } = await supabase
      .from("custom_requests")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
