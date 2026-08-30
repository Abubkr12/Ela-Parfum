import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';


const supabaseAdmin = createAdminClient();

function extractPostalCode(address: string): number | undefined {
  if (!address) return undefined;
  const match = address.match(/\b\d{5}\b/);
  return match ? parseInt(match[0], 10) : undefined;
}

const STORE_LOCATIONS = {
  'IDNP6IDNC149IDND851': { name: 'Condet', address: 'Jl. Raya Condet No.1, RT.1/RW.15, Cililitan, Kec. Kramat jati, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13640', latitude: -6.263281646322936, longitude: 106.86484090895478 },
  'IDNP6IDNC146IDND825': { name: 'Rawa Belong', address: 'Jl. Raya Kb. Jeruk No.57B, RT.8/RW.15, Palmerah, Kec. Palmerah, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11530', latitude: -6.202968871424059, longitude: 106.78298439693361 },
  'IDNP3IDNC446IDND5630': { name: 'Tangerang', address: 'Jl. Pd. Kacang No.36, RT.002/RW.005, Parung Serab, Kec. Ciledug, Kota Tangerang, Banten 15226', latitude: -6.244325229406331, longitude: 106.69862467974234 }
};

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Log to Supabase Database
    try {
      await supabaseAdmin.from('webhook_logs').insert({
        source: 'mayar',
        event_type: payload.event || 'unknown',
        payload: payload
      });
    } catch (e) {
      console.error("Failed to insert webhook log:", e);
    }

    console.log("Mayar Webhook Payload:", JSON.stringify(payload));

    if (payload.event === 'testing') {
        return NextResponse.json({ message: 'Testing successful' }, { status: 200 });
    }
    
    // Check if payment success
    const validEvents = ['payment.received', 'invoice.paid', 'payment.success', 'transaction.success'];
    const isSuccessStatus = payload.status === 'SUCCESS' || payload.status === 'PAID' || payload.status === 'SETTLED' || 
                           (payload.data && (payload.data.status === 'SUCCESS' || payload.data.status === 'PAID' || payload.data.status === 'SETTLED'));

    if (validEvents.includes(payload.event) && isSuccessStatus) {
      const data = payload.data || payload;
      
      let orderCode = data.referenceId || data.reference_id || null;
      
      // Mayar doesn't reliably return referenceId in webhooks.
      // Extract MW- code from description fields or transactionId fallback.
      if (!orderCode || !orderCode.startsWith('MW-')) {
        const searchFields = [
          data.description,
          data.productDescription,
          data.product_description,
          data.name,
          data.productName,
          data.mobile_description
        ].filter(Boolean).join(' ');
        
        const match = searchFields.match(/(MW-[A-Z0-9-]+)/);
        if (match) {
          orderCode = match[1];
        }
      }

      if (!orderCode || !orderCode.startsWith('MW-')) {
        console.error("Could not extract order code from Mayar payload:", JSON.stringify(data));
        return NextResponse.json({ error: 'No valid order code found in webhook' }, { status: 400 });
      }

      // 1. Fetch Order from Supabase
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_code', orderCode)
        .single();

      if (error || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // If already paid, ignore
      if (order.status === 'paid' || order.status === 'shipped' || order.status === 'completed') {
        return NextResponse.json({ message: 'Order already processed' }, { status: 200 });
      }

      // 2. Update Order to Paid
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'paid', 
          payment_status: 'paid'
        })
        .eq('id', order.id);

      if (updateError) {
          console.error("Failed to update order status:", updateError);
      }

      // Check if order is linked to a Custom Request
      const customReqMatch = order.notes?.match(/CustomRequestID:\s*([a-f0-9-]+)/i);
      if (customReqMatch && customReqMatch[1]) {
        const customReqId = customReqMatch[1];
        await supabaseAdmin
          .from('custom_requests')
          .update({ 
            status: 'paid',
            payment_status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('id', customReqId);
        console.log(`[Webhook Debug] Updated custom_request ${customReqId} to paid`);
      }


      // 3. Trigger Biteship Order if it's not Pickup
      const isPickup = order.courier_name.toLowerCase().includes('ambil di tempat') || order.courier_name.toLowerCase().includes('pickup');
      
      if (!isPickup) {
        // Extract Origin Name from notes then map to Area ID
        let originAreaId = '';
        const originNameMatch = order.notes?.match(/Origin:\s*([^|]+)/);
        if (originNameMatch && originNameMatch[1]) {
          const originName = originNameMatch[1].trim();
          const found = Object.entries(STORE_LOCATIONS).find(([id, loc]) => loc.name === originName);
          if (found) {
            originAreaId = found[0];
          } else {
            console.error(`Origin name "${originName}" not found in STORE_LOCATIONS, using default Condet`);
            originAreaId = 'IDNP6IDNC149IDND851'; // Default Condet
          }
        } else {
          console.error("No 'Origin:' field found in order notes, using default Condet:", order.notes);
          originAreaId = 'IDNP6IDNC149IDND851'; // Default Condet
        }
        
        // Find Destination Area ID
        let destinationAreaId = '';
        const destMatch = order.notes?.match(/Dest:\s*([^|]+)/);
        if (destMatch && destMatch[1]) {
            destinationAreaId = destMatch[1].trim();
        } else {
            // Fallback for older orders without Dest in notes
            const { data: addresses } = await supabaseAdmin
              .from('customer_addresses')
              .select('region_code')
              .eq('customer_id', order.customer_id)
              .eq('full_address', order.customer_address)
              .limit(1);
              
            destinationAreaId = addresses && addresses.length > 0 ? addresses[0].region_code : '';
        }

        // Extract destination postal code early for validation
        let destinationPostalCode: number | undefined = undefined;
        const destPostalMatch = order.notes?.match(/DestPostal:\s*(\d+)/);
        if (destPostalMatch && destPostalMatch[1]) {
          destinationPostalCode = parseInt(destPostalMatch[1], 10);
        } else {
          const extracted = extractPostalCode(order.customer_address);
          if (extracted) destinationPostalCode = extracted;
        }

        console.log(`[Biteship Debug] Order: ${orderCode}, Origin: ${originAreaId}, Dest: ${destinationAreaId}, DestPostal: ${destinationPostalCode}, Courier: ${order.courier_name}`);

        // Proceed if we have origin (always have via postal code) AND destination (postal code OR area_id)
        if (originAreaId && (destinationPostalCode || destinationAreaId)) {
          // Fetch order items
          const { data: items } = await supabaseAdmin
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);
            
          const mappedItems = (items || []).map((i: any, index: number) => {
            let itemWeight = 10; 
            
            if (i.perfume_name?.toLowerCase().includes('botol') || index === 0) {
              const sizeStr = (i.size_label || order.notes || "").toLowerCase();
              let bottleSize = 50;
              const match = sizeStr.match(/(\d+)\s*ml/);
              if (match && match[1]) {
                bottleSize = parseInt(match[1], 10);
              }
              itemWeight = 300 + bottleSize + (i.quantity > 1 ? (i.quantity - 1) * (200 + bottleSize) : 0);
            }
            
            return {
              name: i.perfume_name,
              description: i.size_label,
              value: i.price,
              quantity: i.quantity,
              weight: itemWeight,
              length: 15,
              width: 15,
              height: 15
            };
          });
          
          // Parse courier details
          // courierInfo pattern: "JNE - REG"
          const courierParts = order.courier_name.split('-');
          let courierCompany = courierParts[0]?.trim().toLowerCase() || 'jne';
          let courierType = courierParts[1]?.trim().toLowerCase() || 'reg';
          const originDetails = STORE_LOCATIONS[originAreaId as keyof typeof STORE_LOCATIONS] || { name: 'Ela Parfum', address: 'Jl. Condet Raya', latitude: -6.2730, longitude: 106.8640 };

          // Extract 5-digit postal code from customer address
          const postalMatch = order.customer_address.match(/\b\d{5}\b/);
          const destinationPostalCode = postalMatch ? parseInt(postalMatch[0], 10) : undefined;

          // Handle Grab/Gojek Same Day cutoff at 14:00 WIB
          let deliveryType = "now";
          let orderDate = undefined;
          let orderTime = undefined;

          const isSameDay = courierCompany.match(/grab|gojek/i) && courierType.match(/same_day|sameday/i);
          if (isSameDay) {
            const now = new Date();
            const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            const jakartaHour = jakartaTime.getHours();

            if (jakartaHour >= 14) {
              deliveryType = "later";
              
              // Set to tomorrow at 09:00
              const tomorrow = new Date(jakartaTime);
              tomorrow.setDate(tomorrow.getDate() + 1);
              
              const yyyy = tomorrow.getFullYear();
              const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
              const dd = String(tomorrow.getDate()).padStart(2, '0');
              
              orderDate = `${yyyy}-${mm}-${dd}`;
              orderTime = "09:00";
            }
          }

          // Extract DestLat and DestLng from notes if available
          const destLatMatch = order.notes?.match(/DestLat:\s*([-\d.]+)/);
          const destLngMatch = order.notes?.match(/DestLng:\s*([-\d.]+)/);
          const destinationLat = destLatMatch && destLatMatch[1] ? parseFloat(destLatMatch[1]) : undefined;
          const destinationLng = destLngMatch && destLngMatch[1] ? parseFloat(destLngMatch[1]) : undefined;

          const biteshipPayload: any = {
            reference_id: orderCode,
            origin_contact_name: "Ela Parfum",
            origin_contact_phone: "+62 813-8410-4147",
            origin_address: originDetails.address,
            origin_note: originDetails.name,
            origin_area_id: originAreaId,
            origin_coordinate: {
              latitude: originDetails.latitude,
              longitude: originDetails.longitude
            },
            destination_contact_name: order.customer_name,
            destination_contact_phone: order.customer_phone,
            destination_address: order.customer_address,
            destination_area_id: destinationAreaId,
            courier_company: courierCompany,
            courier_type: courierType,
            delivery_type: deliveryType,
            order_date: orderDate,
            order_time: orderTime,
            order_note: orderCode,
            items: mappedItems
          };

          if (destinationLat !== undefined && destinationLng !== undefined) {
            biteshipPayload.destination_coordinate = {
              latitude: destinationLat,
              longitude: destinationLng
            };
          }

          if (destinationPostalCode) {
            biteshipPayload.destination_postal_code = destinationPostalCode;
          }



          const isSandbox = process.env.BITESHIP_IS_SANDBOX === 'true';
          const biteshipUrl = 'https://api.biteship.com';
          const biteshipKey = isSandbox ? process.env.BITESHIP_SANDBOX_API_KEY : process.env.BITESHIP_API_KEY;

          // Generate unique code for idempotency
          const biteshipOrderPayload = {
            ...biteshipPayload,
            reference_id: `${orderCode}-${Date.now()}`
          };
          
          console.log("[Biteship Debug] Sending payload:", JSON.stringify(biteshipOrderPayload));
          
          const biteshipResponse = await fetch(`${biteshipUrl}/v1/orders`, {
            method: 'POST',
            headers: {
              'Authorization': biteshipKey || '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(biteshipOrderPayload)
          });

          const bsData = await biteshipResponse.json();
          console.log(`[Biteship Debug] Response status: ${biteshipResponse.status}, data:`, JSON.stringify(bsData));
          
          if (biteshipResponse.ok && bsData.id) {
            // Update order with waybill info
            await supabaseAdmin
              .from('orders')
              .update({
                status: 'processing',
                waybill_number: bsData.courier?.waybill_id || null,
                resi_number: bsData.courier?.waybill_id || null,
                notes: order.notes + ` | Biteship Order ID: ${bsData.id}`
              })
              .eq('id', order.id);
          } else {
            console.error("Biteship Order Creation Failed:", bsData);
            await supabaseAdmin
              .from('orders')
              .update({
                notes: order.notes + ` | Biteship Error: ${JSON.stringify(bsData.error || bsData.message || 'Unknown Error')}`
              })
              .eq('id', order.id);
          }
        } else {
          console.error(`[Biteship Debug] SKIPPED - Missing: originAreaId=${originAreaId}, destinationAreaId=${destinationAreaId}`);
          // Log to webhook_logs for visibility in admin
          await supabaseAdmin.from('webhook_logs').insert({
            source: 'biteship_skip',
            event_type: 'missing_area_ids',
            payload: { orderCode, originAreaId, destinationAreaId, notes: order.notes }
          });
        }
      }

      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Ignored event' }, { status: 200 });
  } catch (err: any) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
