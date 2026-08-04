const axios = require('axios');

const BITESHIP_TEST_KEY = 'biteship_test.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiRWxhIFBhcmZ1bSBUZXN0aW5nIiwidXNlcklkIjoiNmEyNmY1YmYzYTgyNjA0OGM5MjU1NTMyIiwiaWF0IjoxNzg1NTUzNjk0fQ.HDwttu9rrcCMOe2UgKBgxslAhZvwSfU_vIaydJtM7rU';
const BITESHIP_API_URL = 'https://api.biteship.com/v1';

async function createTestOrder(note) {
  try {
    const response = await axios.post(`${BITESHIP_API_URL}/orders`, {
      origin_contact_name: "Ela Parfum",
      origin_contact_phone: "08123456789",
      origin_address: "Jalan Melati No 1, Jakarta",
      origin_postal_code: 12440,
      destination_contact_name: "Customer Test",
      destination_contact_phone: "08987654321",
      destination_address: "Jalan Anggrek No 2, Jakarta",
      destination_postal_code: 12440,
      courier_company: "jne",
      courier_type: "reg",
      delivery_type: "now",
      items: [
        {
          name: "Parfum Test",
          description: "Testing Order Biteship",
          value: 150000,
          quantity: 1,
          weight: 200
        }
      ],
      note: note
    }, {
      headers: {
        'Authorization': `Bearer ${BITESHIP_TEST_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Order Created Successfully!`);
    console.log(`Order ID: ${response.data.id}`);
    console.log(`Status: ${response.data.status}`);
    return response.data.id;
  } catch (error) {
    console.error(`Error creating order:`, error.response ? error.response.data : error.message);
    return null;
  }
}

async function run() {
  console.log("=== Membuat Order untuk Status Delivered ===");
  const orderId1 = await createTestOrder("Untuk simulasi delivered");
  
  console.log("\n=== Membuat Order untuk Status Cancelled ===");
  const orderId2 = await createTestOrder("Untuk simulasi cancelled");

  console.log("\n=======================================================");
  console.log("Langkah Selanjutnya:");
  console.log("1. Buka Dashboard Biteship (Mode Testing)");
  console.log("2. Pergi ke menu Orders / Pengiriman");
  console.log(`3. Cari Order ID: ${orderId1} dan ubah statusnya menjadi 'delivered' (terkirim)`);
  console.log(`4. Cari Order ID: ${orderId2} dan ubah statusnya menjadi 'cancelled' (dibatalkan)`);
  console.log("5. Setelah itu, masukkan kedua ID tersebut ke form aktivasi API.");
}

run();
