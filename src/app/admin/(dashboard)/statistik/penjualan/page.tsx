import { createAdminClient } from "@/lib/supabase/admin";
import PenjualanClient from './PenjualanClient';

export const dynamic = 'force-dynamic';

export default async function PenjualanPage() {
  const supabase = createAdminClient();
  
  // Fetch orders with payment_status = 'paid'
  const { data: orders, error } = await supabase
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
    
  if (error) {
    console.error('Error fetching sales statistics:', error);
  }

  return <PenjualanClient initialOrders={orders || []} />;
}
