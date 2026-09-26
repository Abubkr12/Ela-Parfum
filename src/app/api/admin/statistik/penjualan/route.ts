import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30 Hari';

    const supabase = createAdminClient();

    let startDate: Date | null = null;
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
    // If range === 'Semua', startDate remains null

    let query = supabase
      .from('orders')
      .select(`
        id,
        order_code,
        customer_name,
        customer_phone,
        total,
        subtotal,
        shipping_cost,
        status,
        payment_method,
        payment_status,
        paid_at,
        created_at,
        notes,
        order_items (
          id,
          perfume_name,
          size_label,
          quantity,
          price,
          subtotal
        )
      `)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('[API /admin/statistik/penjualan] Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, data: orders || [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /admin/statistik/penjualan] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
