import { createAdminClient } from "@/lib/supabase/admin";
import { deductOrderStock } from "@/lib/stock/refill-stock";
import { parseCourier } from "@/lib/biteship";

const STORE_LOCATIONS = {
  IDNP6IDNC149IDND851: {
    name: "Condet",
    address:
      "Jl. Raya Condet No.1, RT.1/RW.15, Cililitan, Kec. Kramat jati, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13640",
    latitude: -6.263216121945289,
    longitude: 106.86483496323179,
  },
  IDNP6IDNC146IDND825: {
    name: "Rawa Belong",
    address:
      "Jl. Raya Kb. Jeruk No.57B, RT.8/RW.15, Palmerah, Kec. Palmerah, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11530",
    latitude: -6.202979537456524,
    longitude: 106.7829307530255,
  },
  IDNP3IDNC446IDND5630: {
    name: "Tangerang",
    address:
      "Jl. Pd. Kacang No.36, RT.002/RW.005, Parung Serab, Kec. Ciledug, Kota Tangerang, Banten 15226",
    latitude: -6.244421216053853,
    longitude: 106.69871051069751,
  },
} as const;

function extractPostalCode(address: string): number | undefined {
  if (!address) return undefined;
  const match = address.match(/\b\d{5}\b/);
  return match ? parseInt(match[0], 10) : undefined;
}

export interface FulfillPaidOrderOptions {
  paymentMethodLabel?: string;
}

export interface FulfillResult {
  found: boolean;
  alreadyPaid: boolean;
  orderId?: number;
}

const ALREADY_FULFILLED_STATUSES = new Set([
  "paid",
  "confirmed",
  "processing",
  "ready_for_pickup",
  "shipped",
  "completed",
]);

/**
 * Idempotently marks an order as paid, deducts branch stock, updates linked custom requests,
 * and triggers Biteship shipment creation for delivery orders.
 */
export async function fulfillPaidOrder(
  orderCode: string,
  options: FulfillPaidOrderOptions = {}
): Promise<FulfillResult> {
  const supabaseAdmin = createAdminClient();

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("order_code", orderCode)
    .single();

  if (error || !order) {
    return { found: false, alreadyPaid: false };
  }

  if (ALREADY_FULFILLED_STATUSES.has(order.status) && order.payment_status === "paid") {
    return { found: true, alreadyPaid: true, orderId: order.id };
  }

  let storeId = order.store_id;
  if (!storeId) {
    const originNameMatch = order.notes?.match(/Origin:\s*([^|]+)/);
    if (originNameMatch?.[1]) {
      const originName = originNameMatch[1].trim().toLowerCase();
      if (originName.includes("condet")) storeId = 1;
      else if (originName.includes("rawa belong") || originName.includes("rawabelong")) storeId = 2;
      else if (originName.includes("tangerang")) storeId = 3;
    }
  }
  if (!storeId) storeId = 2;

  await deductOrderStock(order.id, storeId);

  const updatePayload: Record<string, unknown> = {
    status: "paid",
    payment_status: "paid",
    paid_at: new Date().toISOString(),
  };

  if (options.paymentMethodLabel) {
    updatePayload.payment_method = options.paymentMethodLabel;
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update(updatePayload)
    .eq("id", order.id);

  if (updateError) {
    console.error("Failed to update order status:", updateError);
  }

  const customReqMatch = order.notes?.match(/CustomRequestID:\s*([a-f0-9-]+)/i);
  if (customReqMatch?.[1]) {
    const customReqId = customReqMatch[1];
    await supabaseAdmin
      .from("custom_requests")
      .update({
        status: "paid",
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", customReqId);
  }

  const isPickup =
    order.fulfillment_type === "pickup" ||
    (order.courier_name &&
      (order.courier_name.toLowerCase().includes("ambil di tempat") ||
        order.courier_name.toLowerCase().includes("pickup")));

  if (!isPickup && !order.waybill_number) {
    await triggerBiteshipOrder(supabaseAdmin, order, orderCode);
  }

  return { found: true, alreadyPaid: false, orderId: order.id };
}

async function triggerBiteshipOrder(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  order: any,
  orderCode: string
) {
  let originAreaId = "";
  const originNameMatch = order.notes?.match(/Origin:\s*([^|]+)/);
  if (originNameMatch?.[1]) {
    const originName = originNameMatch[1].trim();
    const found = Object.entries(STORE_LOCATIONS).find(([, loc]) => loc.name === originName);
    originAreaId = found ? found[0] : "IDNP6IDNC149IDND851";
  } else {
    originAreaId = "IDNP6IDNC149IDND851";
  }

  let destinationAreaId = "";
  const destMatch = order.notes?.match(/Dest:\s*([^|]+)/);
  if (destMatch?.[1]) {
    destinationAreaId = destMatch[1].trim();
  } else {
    const { data: addresses } = await supabaseAdmin
      .from("customer_addresses")
      .select("region_code")
      .eq("customer_id", order.customer_id)
      .eq("full_address", order.customer_address)
      .limit(1);
    destinationAreaId = addresses?.[0]?.region_code || "";
  }

  let destinationPostalCode: number | undefined;
  const destPostalMatch = order.notes?.match(/DestPostal:\s*(\d+)/);
  if (destPostalMatch?.[1]) {
    destinationPostalCode = parseInt(destPostalMatch[1], 10);
  } else {
    destinationPostalCode = extractPostalCode(order.customer_address);
  }

  if (!originAreaId || (!destinationPostalCode && !destinationAreaId)) {
    await supabaseAdmin.from("webhook_logs").insert({
      source: "biteship_skip",
      event_type: "missing_area_ids",
      payload: { orderCode, originAreaId, destinationAreaId },
    });
    return;
  }

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);

  const mappedItems = (items || []).map((i: any, index: number) => {
    let itemWeight = 10;
    if (i.perfume_name?.toLowerCase().includes("botol") || index === 0) {
      const sizeStr = (i.size_label || order.notes || "").toLowerCase();
      let bottleSize = 50;
      const match = sizeStr.match(/(\d+)\s*ml/);
      if (match?.[1]) {
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
      height: 15,
    };
  });

  const { company: courierCompany, type: courierType } = parseCourier(
    order.courier_name,
    order.notes
  );
  const originDetails =
    STORE_LOCATIONS[originAreaId as keyof typeof STORE_LOCATIONS] ||
    STORE_LOCATIONS.IDNP6IDNC149IDND851;

  let deliveryType = "now";
  let orderDate: string | undefined;
  let orderTime: string | undefined;

  const isSameDay =
    Boolean(courierCompany.match(/grab|gojek/i)) &&
    Boolean(courierType.match(/same_day|sameday/i));
  if (isSameDay) {
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    if (jakartaTime.getHours() >= 14) {
      deliveryType = "later";
      const tomorrow = new Date(jakartaTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      orderDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
      orderTime = "09:00";
    }
  }

  const destLatMatch = order.notes?.match(/DestLat:\s*([-\d.]+)/);
  const destLngMatch = order.notes?.match(/DestLng:\s*([-\d.]+)/);
  const destinationLat = destLatMatch?.[1] ? parseFloat(destLatMatch[1]) : undefined;
  const destinationLng = destLngMatch?.[1] ? parseFloat(destLngMatch[1]) : undefined;

  const biteshipOrderPayload: Record<string, unknown> = {
    reference_id: `${orderCode}-${Date.now()}`,
    origin_contact_name: "Ela Parfum",
    origin_contact_phone: "+62 813-8410-4147",
    origin_address: originDetails.address,
    origin_note: originDetails.name,
    origin_area_id: originAreaId,
    origin_coordinate: {
      latitude: originDetails.latitude,
      longitude: originDetails.longitude,
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
    items: mappedItems,
  };

  if (destinationLat !== undefined && destinationLng !== undefined) {
    biteshipOrderPayload.destination_coordinate = {
      latitude: destinationLat,
      longitude: destinationLng,
    };
  }
  if (destinationPostalCode) {
    biteshipOrderPayload.destination_postal_code = destinationPostalCode;
  }

  const isSandbox = process.env.BITESHIP_IS_SANDBOX === "true";
  const biteshipKey = isSandbox
    ? process.env.BITESHIP_SANDBOX_API_KEY
    : process.env.BITESHIP_API_KEY;

  const biteshipResponse = await fetch("https://api.biteship.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: biteshipKey || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(biteshipOrderPayload),
  });

  const bsData = (await biteshipResponse.json()) as any;
  const cleanNotes = (order.notes || "").replace(/\s*\|\s*Biteship Error:[^|]+/g, "");

  if (biteshipResponse.ok && bsData.id) {
    await supabaseAdmin
      .from("orders")
      .update({
        status: "processing",
        waybill_number: bsData.courier?.waybill_id || null,
        resi_number: bsData.courier?.waybill_id || null,
        notes: `${cleanNotes} | Biteship Order ID: ${bsData.id}`,
      })
      .eq("id", order.id);
  } else {
    await supabaseAdmin
      .from("orders")
      .update({
        notes: `${cleanNotes} | Biteship Error: ${JSON.stringify(bsData.error || bsData.message || "Unknown Error")}`,
      })
      .eq("id", order.id);
  }
}
