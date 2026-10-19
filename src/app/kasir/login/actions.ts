"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function kasirLogin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nextUrl = (formData.get("next") as string) || "/kasir";

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  // Gunakan admin client (sb-admin-auth-token)
  const supabase = await createClient(true);

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !authData.user) {
    if (error?.message.includes("Invalid login credentials")) {
      return { error: "Email atau password staf salah." };
    }
    return { error: error?.message || "Gagal masuk ke terminal kasir." };
  }

  // Verifikasi apakah terdaftar di tabel admin_users
  const { data: adminUser, error: adminErr } = await supabase
    .from("admin_users")
    .select("id, full_name, role, assigned_store_ids")
    .eq("id", authData.user.id)
    .single();

  if (adminErr || !adminUser) {
    await supabase.auth.signOut();
    return { error: "Akun ini tidak memiliki hak akses sebagai staf/kasir toko." };
  }

  revalidatePath("/", "layout");
  redirect(nextUrl);
}

export async function kasirLogout() {
  const supabase = await createClient(true);
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/kasir/login");
}
