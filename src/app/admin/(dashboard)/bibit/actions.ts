"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function saveBibit(payload: any, id?: string) {
  try {
    const supabaseAdmin = createAdminClient();
    if (id) {
      const { error } = await supabaseAdmin
        .from("bibit")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("bibit")
        .insert(payload);
      if (error) throw error;
    }
    
    revalidatePath("/admin/bibit");
    return { success: true };
  } catch (err: any) {
    console.error("Error saveBibit:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteBibit(id: string) {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("bibit")
      .delete()
      .eq("id", id);
    if (error) throw error;
    
    revalidatePath("/admin/bibit");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleteBibit:", err);
    return { success: false, error: err.message };
  }
}
