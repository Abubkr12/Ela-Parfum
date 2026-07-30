"use server";

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createAdminClient();

export async function updateResiStatus(formData: FormData) {
  const orderId = formData.get('orderId') as string;
  const waybillNumber = formData.get('waybillNumber') as string;

  if (!orderId) throw new Error('Order ID hilang');

  const newStatus = waybillNumber && waybillNumber.trim().length > 0 ? 'shipped' : 'processing';

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ 
      waybill_number: waybillNumber,
      status: newStatus
    })
    .eq('id', orderId);

  if (error) {
    throw new Error('Gagal update resi: ' + error.message);
  }

  revalidatePath('/admin/pesanan');
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath('/pesanan'); // update the customer side too
}

export async function markAsPaid(payload: string | FormData) {
  const orderId = typeof payload === 'string' ? payload : payload.get('orderId') as string;
  if (!orderId) throw new Error('Order ID hilang');

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'processing',
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      payment_verified_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    throw new Error('Gagal update status: ' + error.message);
  }

  revalidatePath('/admin/pesanan');
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath('/pesanan');
}

export async function rejectPayment(payload: string | FormData) {
  const orderId = typeof payload === 'string' ? payload : payload.get('orderId') as string;
  if (!orderId) throw new Error('Order ID hilang');

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'rejected',
      status: 'cancelled'
    })
    .eq('id', orderId);

  if (error) {
    throw new Error('Gagal update status: ' + error.message);
  }

  revalidatePath('/admin/pesanan');
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath('/pesanan');
}

export async function retryWebhook(orderCode: string) {
  try {
    const url = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000';
    const res = await fetch(`${url}/api/webhooks/mayar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'payment.received',
        data: { referenceId: orderCode, status: 'SUCCESS' }
      })
    });
    
    if (!res.ok) {
      return { error: 'Gagal memicu webhook sinkronisasi (Status: ' + res.status + ')' };
    }
    
    revalidatePath('/admin/pesanan');
    return { success: true };
  } catch (error: any) {
    return { error: 'Terjadi kesalahan sistem: ' + error.message };
  }
}
