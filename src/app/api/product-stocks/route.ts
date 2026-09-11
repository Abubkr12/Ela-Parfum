import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const perfumeId = searchParams.get('perfume_id');
    const supabase = createAdminClient();
    
    let query = supabase
      .from('perfume_sizes')
      .select('*, product_stocks(store_id, stock_qty)')
      .eq('is_active', true)
      .order('size_ml', { ascending: true });

    if (perfumeId) {
      query = query.eq('perfume_id', perfumeId);
    }
      
    const { data, error } = await query;
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
