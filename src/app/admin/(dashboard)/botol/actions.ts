"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Kita bikin instance Supabase langsung menggunakan SERVICE ROLE KEY
// Ini buat bypass RLS yang ngeblokir update di tabel bottles
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function saveBotol(formData: FormData) {
  try {
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const capacity_ml = Number(formData.get('capacity_ml'));
    const price = Number(formData.get('price'));
    
    // Image Upload
    const imageFile = formData.get('image') as File;
    let image_url = formData.get('existing_image_url') as string;

    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('products')
        .upload(`bottles/${fileName}`, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Gagal upload gambar: ' + uploadError.message);
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('products')
        .getPublicUrl(`bottles/${fileName}`);
        
      image_url = publicUrlData.publicUrl;
    }

    const payload: any = {
      name,
      capacity_ml,
      price,
    };
    if (image_url) {
      payload.image_url = image_url;
    }

    if (id) {
      // Edit
      const { error } = await supabaseAdmin
        .from("bottles")
        .update(payload)
        .eq("id", id);
        
      if (error) throw error;
    } else {
      // Tambah baru
      const { error } = await supabaseAdmin
        .from("bottles")
        .insert(payload);
        
      if (error) throw error;
    }
    
    // Revalidasi agar tabel di client dapet data terbaru
    revalidatePath("/admin/botol");
    return { success: true };
  } catch (err: any) {
    console.error("Error saveBotol:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteBotol(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from("bottles")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    
    revalidatePath("/admin/botol");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleteBotol:", err);
    return { success: false, error: err.message };
  }
}
