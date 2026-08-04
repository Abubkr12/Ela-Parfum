import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { OrderHistoryClient } from './OrderHistoryClient'

export const metadata = {
  title: 'Riwayat Pesanan — Ela Parfum',
  description: 'Seluruh riwayat pesanan Anda',
}

export default async function RiwayatPesananPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Ambil data pesanan lengkap
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  // Post-process to inject custom_requests data for legacy orders
  const enhancedOrders = await Promise.all((orders || []).map(async (order) => {
    if ((!order.order_items || order.order_items.length === 0) && order.notes && order.notes.includes('CustomRequestID:')) {
      const match = order.notes.match(/CustomRequestID:\s*([a-zA-Z0-9-]+)/);
      if (match && match[1]) {
        const customReqId = match[1];
        const { data: reqData } = await supabase.from('custom_requests').select('base_note, volume_ml, bottle_type').eq('id', customReqId).single();
        if (reqData) {
          order.order_items = [{
            id: 'legacy-custom-' + customReqId,
            perfume_name: reqData.base_note ? `Custom Refill: ${reqData.base_note.toUpperCase()}` : 'Pesanan Custom Refill',
            size_label: `${reqData.volume_ml || 0}ml (${reqData.bottle_type || 'Botol'})`,
            quantity: 1,
            price: order.subtotal,
            subtotal: order.subtotal
          }];
        }
      }
    }
    return order;
  }));

  return (
    <div className="customer-page">
      <PageHeader />

      <main className="workspace" style={{ paddingTop: '100px' }}>
        <div className="workspace-grid" style={{ gridTemplateColumns: 'min(100%, 1000px)', justifyContent: 'center' }}>
          
          <div className="catalog-col">
            <OrderHistoryClient initialOrders={enhancedOrders || []} />
          </div>
          
        </div>
      </main>
    </div>
  )
}
