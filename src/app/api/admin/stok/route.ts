import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'produk';
    const storeIdStr = searchParams.get('store_id');
    const storeId = storeIdStr ? parseInt(storeIdStr, 10) : 1;

    const supabase = createAdminClient();

    let data: any[] | null = [];
    let error: any = null;

    if (type === 'stores') {
      const res = await supabase.from('stores').select('*').order('id');
      data = res.data;
      error = res.error;
    } else if (type === 'produk') {
      const res = await supabase
        .from('product_stocks')
        .select(`
          id,
          store_id,
          stock_qty,
          perfume_sizes (
            id,
            size_label,
            perfumes (
              id,
              name,
              image_url
            )
          )
        `)
        .eq('store_id', storeId)
        .order('id');
      data = res.data;
      error = res.error;
    } else if (type === 'bibit') {
      const res = await supabase
        .from('bibit_stocks')
        .select(`
          id,
          store_id,
          stock_ml,
          bibit (
            id,
            name,
            collection
          )
        `)
        .eq('store_id', storeId)
        .order('id');
      data = res.data;
      error = res.error;
    } else if (type === 'botol') {
      const res = await supabase
        .from('bottle_stocks')
        .select(`
          id,
          store_id,
          stock_qty,
          bottles (
            id,
            name,
            capacity_ml
          )
        `)
        .eq('store_id', storeId)
        .order('id');
      data = res.data;
      error = res.error;
    } else if (type === 'pelarut') {
      const res = await supabase
        .from('solvent_stocks')
        .select(`
          id,
          store_id,
          stock_ml,
          solvents (
            id,
            name,
            type,
            price_per_ml
          )
        `)
        .eq('store_id', storeId)
        .order('id');
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error(`[API /admin/stok] Error fetching ${type}:`, error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

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
    console.error('[API /admin/stok] Server Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
