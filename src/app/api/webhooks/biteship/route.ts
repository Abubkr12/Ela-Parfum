import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  return NextResponse.json({ success: true, message: 'Webhook verified' }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    
    // Untuk validasi awal dari Biteship yang ngirim body kosong
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ success: true, message: 'Webhook verified' }, { status: 200 });
    }

    console.log('📦 [BITESHIP WEBHOOK] Received event:', body.event);
    console.log(JSON.stringify(body, null, 2));

    // Todo: Implement logic based on event type (order.status, order.waybill_id)
    if (body.event === 'order.status') {
      // Handle status update
      console.log(`Update status for order ${body.order_id} to ${body.status}`);
    } else if (body.event === 'order.waybill_id') {
      // Handle waybill update
      console.log(`Update waybill for order ${body.order_id} to ${body.courier_waybill_id}`);
    }

    return NextResponse.json({ success: true, message: 'Webhook received' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ [BITESHIP WEBHOOK] Error:', error.message);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
