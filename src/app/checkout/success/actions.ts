"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function uploadPaymentProof(orderId: number, base64Image: string) {
  try {
    const supabase = createAdminClient();
    
    // Check if bucket exists, if not try to create (will fail silently if already exists or no permission, but worth a try)
    try {
      await supabase.storage.createBucket('payment-proofs', { public: true });
    } catch (e) {
      // Ignore if exists
    }

    // Convert base64 to buffer
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    const fileName = `${orderId}-${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(fileName, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    // If bucket payment-proofs fails, try 'payment-assets' as fallback
    let finalBucket = "payment-proofs";
    let finalFileName = fileName;

    if (uploadError) {
        console.error("Failed to upload to payment-proofs, trying payment-assets:", uploadError);
        const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from("payment-assets")
        .upload(`proofs/${fileName}`, buffer, {
            contentType: "image/jpeg",
            upsert: true,
        });

        if (fallbackError) {
             throw fallbackError;
        }
        finalBucket = "payment-assets";
        finalFileName = `proofs/${fileName}`;
    }

    const { data: publicUrlData } = supabase.storage
      .from(finalBucket)
      .getPublicUrl(finalFileName);

    const publicUrl = publicUrlData.publicUrl;

    // Update order with the proof url in payment_proof
    // We will update payment_proof to contain the URL and set payment_status to waiting_confirmation.
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_proof: publicUrl,
        payment_status: "waiting_confirmation"
      })
      .eq("id", orderId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath("/riwayat-pesanan");
    revalidatePath(`/admin/pesanan/${orderId}`);

    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error("uploadPaymentProof error:", err);
    return { error: err.message || "Failed to upload payment proof." };
  }
}
