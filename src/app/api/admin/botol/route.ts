import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('bottles')
      .select('*')
      .order('capacity_ml', { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: data || [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /admin/botol GET] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, capacity_ml, price, image_url } = body;

    if (!name || capacity_ml === undefined || price === undefined) {
      return NextResponse.json({ success: false, error: 'Nama, kapasitas, dan harga wajib diisi' }, { status: 400 });
    }

    const payload: any = {
      name: String(name).trim(),
      capacity_ml: Number(capacity_ml),
      price: Number(price),
    };
    if (image_url !== undefined) {
      payload.image_url = image_url;
    }

    const supabase = createAdminClient();

    if (id) {
      const { data, error } = await supabase
        .from('bottles')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else {
      const { data, error } = await supabase
        .from('bottles')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
  } catch (err: any) {
    console.error('[API /admin/botol POST] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID botol wajib disertakan' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('bottles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API /admin/botol DELETE] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
