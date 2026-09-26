"use server";

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/types';
import { redirect } from 'next/navigation';

export async function saveProduct(formData: FormData) {
  const supabaseAdmin = createAdminClient();
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const collection = formData.get('collection') as string;
  const family_ids = formData.getAll('family_ids').map(id => parseInt(id as string));
  const description = formData.get('description') as string;
  const full_description = formData.get('full_description') as string;
  const mood = formData.get('mood') as string;
  const strength = formData.get('strength') as string;
  const longevity = formData.get('longevity') as string;
  
  const topNotesStr = formData.get('top_notes') as string;
  const top_notes = topNotesStr ? topNotesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
  
  const middleNotesStr = formData.get('middle_notes') as string;
  const middle_notes = middleNotesStr ? middleNotesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
  
  const baseNotesStr = formData.get('base_notes') as string;
  const base_notes = baseNotesStr ? baseNotesStr.split(',').map(s => s.trim()).filter(Boolean) : [];

  const is_active = formData.get('is_active') === 'on';
  const is_featured = formData.get('is_featured') === 'on';
  
  // Sizes JSON
  const sizesJson = formData.get('sizes') as string;
  const sizes = JSON.parse(sizesJson || '[]');

  // Image Upload
  const imageFile = formData.get('image') as File;
  let image_url = formData.get('existing_image_url') as string;

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('products')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error('Gagal upload gambar: ' + uploadError.message);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('products')
      .getPublicUrl(fileName);
      
    image_url = publicUrlData.publicUrl;
  }

  let baseSlug = slugify(name);
  let finalSlug = baseSlug;
  let perfumeId = id ? parseInt(id) : null;

  // Cek apakah slug sudah dipakai oleh produk lain
  const { data: existingSlug } = await supabaseAdmin
    .from('perfumes')
    .select('id')
    .eq('slug', finalSlug)
    .maybeSingle();

  if (existingSlug && existingSlug.id !== perfumeId) {
    finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const perfumeData = {
    name,
    slug: finalSlug,
    collection,
    family_ids, // array of integers
    description,
    full_description,
    mood,
    strength,
    longevity,
    notes: {
      top: top_notes,
      middle: middle_notes,
      base: base_notes
    },
    image_url,
    is_active,
    is_featured,
    updated_at: new Date().toISOString()
  };

  if (perfumeId) {
    // Update
    const { error } = await supabaseAdmin.from('perfumes').update(perfumeData).eq('id', perfumeId);
    if (error) throw new Error('Gagal update parfum: ' + error.message);
    
    // Delete old sizes, insert new ones (simpler than syncing)
    await supabaseAdmin.from('perfume_sizes').delete().eq('perfume_id', perfumeId);
  } else {
    // Insert
    const { data, error } = await supabaseAdmin.from('perfumes').insert(perfumeData).select('id').single();
    if (error) throw new Error('Gagal membuat parfum: ' + error.message);
    perfumeId = data.id;
  }

  // Insert sizes
  if (sizes.length > 0 && perfumeId) {
    const sizeInserts = sizes.map((s: any) => ({
      perfume_id: perfumeId,
      size_ml: parseInt(s.size_ml),
      size_label: s.size_label,
      price: parseInt(s.price),
      stock: parseInt(s.stock),
      is_active: s.is_active
    }));
    const { error: sizeError } = await supabaseAdmin.from('perfume_sizes').insert(sizeInserts);
    if (sizeError) throw new Error('Gagal menyimpan varian ukuran: ' + sizeError.message);
  }

  revalidatePath('/');
  revalidatePath('/katalog');
  revalidatePath('/admin/produk');
  redirect('/admin/produk');
}

export async function deleteProduct(id: number) {
  const supabaseAdmin = createAdminClient();
  const { error: sizesError } = await supabaseAdmin.from('perfume_sizes').delete().eq('perfume_id', id);
  if (sizesError) throw new Error('Gagal menghapus ukuran: ' + sizesError.message);

  const { error } = await supabaseAdmin.from('perfumes').delete().eq('id', id);
  if (error) throw new Error('Gagal menghapus parfum: ' + error.message);

  revalidatePath('/');
  revalidatePath('/katalog');
  revalidatePath('/admin/produk');
}
