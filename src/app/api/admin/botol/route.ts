import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: bottles, error } = await supabase
      .from('bottles')
      .select(`
        *,
        bottle_stocks (
          id,
          store_id,
          stock_qty
        )
      `)
      .order('capacity_ml', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    const formatted = (bottles || []).map((b: any) => {
      const bStocks = Array.isArray(b.bottle_stocks) ? b.bottle_stocks : [];
      const totalStock = bStocks.reduce((sum: number, s: any) => sum + (Number(s.stock_qty) || 0), 0);
      const stocksByStore: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
      bStocks.forEach((s: any) => {
        stocksByStore[s.store_id] = Number(s.stock_qty) || 0;
      });
      return {
        ...b,
        stock: totalStock,
        stocks_by_store: stocksByStore,
      };
    });

    return NextResponse.json(
      { success: true, data: formatted },
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

      // Auto-create bottle_stocks for all 3 branches: Condet (1), Rawabelong (2), Tangerang (3)
      if (data && data.id) {
        const storeStocksPayload = [1, 2, 3].map((storeId) => ({
          bottle_id: data.id,
          store_id: storeId,
          stock_qty: 0,
        }));
        await supabase.from('bottle_stocks').insert(storeStocksPayload);
      }

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
