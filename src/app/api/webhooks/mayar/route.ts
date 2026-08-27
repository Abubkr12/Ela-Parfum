import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';


const supabaseAdmin = createAdminClient();

import { STORE_LOCATIONS } from '@/lib/biteship';

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
    if (validEvents.includes(payload.event) || payload.status === 'SUCCESS' || (payload.data && payload.data.status === 'SUCCESS')) {
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
        
        // Find Destination Area ID & Coordinates
        let destinationAreaId = '';
        const destMatch = order.notes?.match(/Dest:\s*([^|]+)/);
        if (destMatch && destMatch[1]) {
            destinationAreaId = destMatch[1].trim();
        }

        // We NEED the latitude and longitude for Gojek/Grab, so query customer_addresses
        let destLat: number | null = null;
        let destLng: number | null = null;
        
        const { data: addresses } = await supabaseAdmin
          .from('customer_addresses')
          .select('region_code, maps_latitude, maps_longitude')
          .eq('customer_id', order.customer_id)
          .eq('full_address', order.customer_address)
          .limit(1);
          
        if (addresses && addresses.length > 0) {
            if (!destinationAreaId) {
                destinationAreaId = addresses[0].region_code || '';
            }
            destLat = addresses[0].maps_latitude || null;
            destLng = addresses[0].maps_longitude || null;
        }

        console.log(`[Biteship Debug] Order: ${orderCode}, Origin: ${originAreaId}, Dest: ${destinationAreaId}, Courier: ${order.courier_name}`);

        if (originAreaId && destinationAreaId) {
          const { data: items } = await supabaseAdmin
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);
            
          let mappedItems: any[] = [];
          const isCustomOrder = order.notes?.includes('[Custom Refill]');
          
          const allItems = items || [];
          
          const DEFAULT_DIMENSIONS = { length: 25, width: 25, height: 20 };
          const calcPackageWeight = (bottleSize: number) => {
            return 500 + (bottleSize + 5);
          };
          
          if (isCustomOrder) {
            let totalBottleSize = 50;
            let totalValue = order.subtotal || 0;
            let ingredientNames: string[] = [];
            
            allItems.forEach((i: any) => {
               totalValue += i.subtotal || (i.price * i.quantity);
               if (i.perfume_name) {
                 ingredientNames.push(`${i.perfume_name} (${i.size_label})`);
               }
               if (i.perfume_name?.toLowerCase().includes('botol')) {
                 const match = (i.size_label || i.perfume_name || "").match(/(\d+)\s*ml/i);
                 if (match && match[1]) {
                   totalBottleSize = parseInt(match[1], 10);
                 }
               }
            });
            
            const detailDescription = ingredientNames.join(", ");
            
            mappedItems.push({
              name: `Custom Refill (${orderCode})`,
              description: `Racikan ${totalBottleSize}ml: ${detailDescription}`,
              value: Math.max(1, totalValue),
              quantity: 1,
              weight: calcPackageWeight(totalBottleSize),
              ...DEFAULT_DIMENSIONS
            });
          } else {
            mappedItems = allItems.map((i: any) => {
              const sizeStr = (i.size_label || order.notes || "").toLowerCase();
              let bottleSize = 50;
              const match = sizeStr.match(/(\d+)\s*ml/);
              if (match && match[1]) {
                bottleSize = parseInt(match[1], 10);
              }
              
              return {
                name: i.perfume_name,
                description: i.size_label || "-",
                value: Math.max(1, i.price || 0),
                quantity: i.quantity,
                weight: calcPackageWeight(bottleSize),
                ...DEFAULT_DIMENSIONS
              };
            });
          }
          
          // Parse courier details using the shared helper that normalizes 'same day' -> 'sameday'
          const { parseCourier } = require('@/lib/biteship');
          const { company: courierCompany, type: courierType } = parseCourier(order.courier_name);

          
          const originDetails = STORE_LOCATIONS[originAreaId as keyof typeof STORE_LOCATIONS] || { name: 'Ela Parfum', address: 'Jl. Condet Raya' };

          // Extract 5-digit postal code from customer address
          const postalMatch = (order.customer_address || "").match(/\b\d{5}\b/);
          const destinationPostalCode = postalMatch ? parseInt(postalMatch[0], 10) : undefined;

          // Auto-schedule logic for Same Day couriers past cutoff time
          let deliveryType = "now";
          let deliveryDate = undefined;
          let deliveryTime = undefined;

          if (courierType === 'same_day') {
            const now = new Date();
            // Convert to Jakarta time (UTC+7)
            const jakartaHour = (now.getUTCHours() + 7) % 24;
            
            // If it's 14:00 or later, Grab/Gojek Same Day will reject "now". Schedule for tomorrow 09:00.
            if (jakartaHour >= 14) {
              deliveryType = "later";
              const tomorrow = new Date(now);
              tomorrow.setUTCDate(now.getUTCDate() + 1);
              deliveryDate = tomorrow.toISOString().split('T')[0];
              deliveryTime = "09:00";
              console.log(`[Biteship Debug] Past same_day cutoff (${jakartaHour}:00). Scheduling for tomorrow ${deliveryDate} 09:00`);
            }
          }

          const biteshipPayload: any = {
            shipper_contact_name: 'Ela Parfum',
            shipper_contact_phone: '+6281384104147',
            shipper_contact_email: 'elaparfum@gmail.com',
            shipper_organization: 'Ela Parfum',
            origin_contact_name: "Ela Parfum",
            origin_contact_phone: "+6281384104147",
            origin_address: originDetails.address,
            origin_note: originDetails.name,
            origin_area_id: originAreaId,
            destination_contact_name: order.customer_name || "Customer",
            destination_contact_phone: order.customer_phone || "+6280000000000",
            destination_address: order.customer_address || "Alamat belum diisi",
            destination_area_id: destinationAreaId,
            courier_company: courierCompany,
            courier_type: courierType,
            delivery_type: deliveryType,
            items: mappedItems
          };

          if (deliveryDate && deliveryTime) {
            biteshipPayload.delivery_date = deliveryDate;
            biteshipPayload.delivery_time = deliveryTime;
          }

          if (originDetails.latitude && originDetails.longitude) {
            biteshipPayload.origin_coordinate = {
              latitude: originDetails.latitude,
              longitude: originDetails.longitude
            };
          }

          if (destLat && destLng) {
            biteshipPayload.destination_coordinate = {
              latitude: destLat,
              longitude: destLng
            };
          }

          if (destinationPostalCode) {
            biteshipPayload.destination_postal_code = destinationPostalCode;
          }

          // Sandboxing handles the API key, no need to override payload fields

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



