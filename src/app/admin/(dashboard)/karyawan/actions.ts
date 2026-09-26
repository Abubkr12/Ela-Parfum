"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function addEmployee(formData: FormData) {
  try {
    const supabaseAdmin = createAdminClient();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("full_name") as string;
    const role = formData.get("role") as string;

    if (!email || !password || !fullName || !role) {
      return { error: "Semua kolom wajib diisi" };
    }

    let authUserId = "";

    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Bypass email verification! User requirement
      user_metadata: {
        full_name: fullName,
      }
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already been registered")) {
        // Artinya email ini sudah dipakai mendaftar sebagai PELANGGAN (Customer)
        // Kita cari ID user-nya lalu jadikan dia Karyawan, dan update passwordnya
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listData.users.find(u => u.email === email);
        
        if (existingUser) {
          authUserId = existingUser.id;
          // Update password & metadata sesuai inputan owner
          await supabaseAdmin.auth.admin.updateUserById(authUserId, { 
            password: password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
          });
        } else {
          return { error: `Gagal membuat akun: ${authError.message}` };
        }
      } else {
        return { error: `Gagal membuat akun: ${authError.message}` };
      }
    } else {
      if (authData.user) {
        authUserId = authData.user.id;
      }
    }

    // 2. Insert into admin_users table
    const { error: dbError } = await supabaseAdmin
      .from("admin_users")
      .insert({
        id: authUserId,
        email: email,
        full_name: fullName,
        role: role,
      });

    if (dbError) {
      // Rollback if needed, though rare
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      return { error: `Gagal menyimpan data profil: ${dbError.message}` };
    }

    revalidatePath("/admin/karyawan");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Terjadi kesalahan internal" };
  }
}

export async function deleteEmployee(userId: string) {
  try {
    const supabaseAdmin = createAdminClient();
    // 1. Delete from Auth (Cascade should handle the admin_users table, but we can do both)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      return { error: `Gagal menghapus akun: ${authError.message}` };
    }

    revalidatePath("/admin/karyawan");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Terjadi kesalahan internal" };
  }
}
