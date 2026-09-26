import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function fetchAllBatched<T = any>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const results: T[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await queryFn(from, from + batchSize - 1);
    if (error || !data || data.length === 0) break;
    results.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return results;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30 Hari';

    const supabase = createAdminClient();

    let startDate: Date | null = null;
    const now = new Date();
    if (range === 'Hari Ini') {
      startDate = new Date(new Date().setHours(0, 0, 0, 0));
    } else if (range === '7 Hari') {
      startDate = new Date(Date.now() - 7 * 86400000);
    } else if (range === '30 Hari') {
      startDate = new Date(Date.now() - 30 * 86400000);
    } else if (range === '3 Bulan') {
      startDate = new Date(Date.now() - 90 * 86400000);
    } else if (range === '1 Tahun') {
      startDate = new Date(Date.now() - 365 * 86400000);
    }
    // If range === 'Semua', startDate remains null to fetch all data

    // Concurrent fetching for high performance
    const [
      storesRes,
      productStocksRes,
      bottleStocksRes,
      solventStocksRes,
    ] = await Promise.all([
      supabase.from('stores').select('*').order('id'),
      supabase.from('product_stocks').select('*, perfume_sizes:perfume_size_id (*, perfumes:perfume_id (*))'),
      supabase.from('bottle_stocks').select('*, bottles:bottle_id (*)'),
      supabase.from('solvent_stocks').select('*, solvents:solvent_id (*)'),
    ]);

    // Fetch bibit stocks
    const bibitStocks = await fetchAllBatched(async (from, to) =>
      await supabase
        .from('bibit_stocks')
        .select('*, bibit:bibit_id (*)')
        .range(from, to)
    );

    // Fetch stock changelog with optional date filter
    const stockChangelog = await fetchAllBatched(async (from, to) => {
      let q = supabase
        .from('stock_changelog')
        .select('*')
        .order('created_at', { ascending: false });
      if (startDate) {
        q = q.gte('created_at', startDate.toISOString());
      }
      return await q.range(from, to);
    });

    // Fetch order items with optional date filter
    let orderItemsQuery = supabase
      .from('order_items')
      .select('*, orders!inner(status, payment_status, created_at)')
      .eq('orders.payment_status', 'paid');
    if (startDate) {
      orderItemsQuery = orderItemsQuery.gte('orders.created_at', startDate.toISOString());
    }
    const { data: orderItems } = await orderItemsQuery;

    return NextResponse.json(
      {
        success: true,
        data: {
          stores: storesRes.data || [],
          productStocks: productStocksRes.data || [],
          bottleStocks: bottleStocksRes.data || [],
          solventStocks: solventStocksRes.data || [],
          bibitStocks: bibitStocks || [],
          stockChangelog: stockChangelog || [],
          orderItems: orderItems || [],
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /admin/statistik/barang] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
