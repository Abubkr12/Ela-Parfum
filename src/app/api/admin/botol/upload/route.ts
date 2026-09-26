import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: 'File gambar tidak ditemukan' }, { status: 400 });
    }

    const fileExt = file.name ? file.name.split('.').pop() || 'webp' : 'webp';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const supabase = createAdminClient();
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(`bottles/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/webp',
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from('products')
      .getPublicUrl(`bottles/${fileName}`);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
    });
  } catch (err: any) {
    console.error('[API /admin/botol/upload] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
