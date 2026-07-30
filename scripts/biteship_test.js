
const API_KEY = 'biteship_test.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiRWxhIFBhcmZ1bSBTYW5kYm94IiwidXNlcklkIjoiNmEyNmY1YmYzYTgyNjA0OGM5MjU1NTMyIiwiaWF0IjoxNzg0ODI5NTk0fQ.g2h3yqHoLmqmiTSJefL63ZRkQETgp4TYJR4krZbAL30';
const BASE_URL = 'https://api.biteship.com/v1';

async function createOrder(referencePrefix) {
  const payload = {
    "shipper_contact_name": "Ela Parfum",
    "shipper_contact_phone": "081234567890",
    "shipper_contact_email": "admin@elaparfum.vercel.app",
    "shipper_organization": "Ela Parfum",
    "origin_contact_name": "Admin Ela Parfum",
    "origin_contact_phone": "081234567890",
    "origin_address": "Jl. Karet Pedurenan No.1, Kuningan, Jakarta Selatan",
    "origin_note": "Toko Ela Parfum",
    "origin_postal_code": 12940,
    "destination_contact_name": "Budi Customer",
    "destination_contact_phone": "089876543210",
    "destination_contact_email": "budi@example.com",
    "destination_address": "Jl. Sudirman No. 10, Jakarta Pusat",
    "destination_postal_code": 10220,
    "destination_note": "Di sebelah gedung bank",
    "courier_company": "jne",
    "courier_type": "reg",
    "delivery_type": "now",
    "order_note": "Fragile, parfume",
    "reference_id": `${referencePrefix}-${Date.now()}`,
    "items": [
      {
        "name": "Parfum Vanilla 30ml",
        "description": "Parfum aroma vanilla",
        "category": "fashion",
        "value": 150000,
        "quantity": 1,
        "height": 10,
        "length": 5,
        "weight": 200,
        "width": 5
      }
    ]
  };

  const response = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  if (!data.success) {
    console.error(`Failed to create order:`, data);
    throw new Error(data.error);
  }
  return data;
}

async function cancelOrder(orderId) {
  const payload = {
    "cancellation_reason_code": "others",
    "cancellation_reason": "Testing cancellation for activation form"
  };

  const response = await fetch(`${BASE_URL}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  if (!data.success) {
    console.error(`Failed to cancel order ${orderId}:`, data);
  }
  return data;
}

async function getOrder(orderId) {
    const response = await fetch(`${BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    return response.json();
  }

async function run() {
  try {
    console.log("=== Creating Order for Delivery ===");
    const orderDelivered = await createOrder("DEL");
    console.log(`Successfully created delivery order. ID: ${orderDelivered.id}`);
    console.log(`Waybill ID: ${orderDelivered.courier.waybill_id}`);

    console.log("\n=== Creating Order for Cancellation ===");
    const orderCancelled = await createOrder("CAN");
    console.log(`Successfully created order to be cancelled. ID: ${orderCancelled.id}`);

    console.log(`\n=== Cancelling Order ${orderCancelled.id} ===`);
    const cancelResult = await cancelOrder(orderCancelled.id);
    if (cancelResult.success) {
      console.log(`Successfully cancelled order ${orderCancelled.id}. Status: ${cancelResult.status}`);
    }

    console.log("\n=== Checking Delivery Order Status ===");
    const getResult = await getOrder(orderDelivered.id);
    console.log(`Order ${orderDelivered.id} status is currently: ${getResult.status || (getResult.success ? getResult.status : "Unknown")}`);

    console.log("\n=================================");
    console.log("RESULTS FOR BITESHIP ACTIVATION FORM:");
    console.log(`ID Pesanan Test Terkirim : ${orderDelivered.id}`);
    console.log(`ID Pesanan Test Dibatalkan : ${orderCancelled.id}`);
    console.log(`Waybill / Resi untuk di-generate : ${orderDelivered.courier.waybill_id}`);
    
  } catch (error) {
    console.error("Script failed:", error);
  }
}

run();
