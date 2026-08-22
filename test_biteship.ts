import { getBiteshipKey, BITESHIP_API_URL } from './src/lib/biteship.ts';

const run = async () => {
    try {
        const payload1 = {
            origin_area_id: "IDNP6IDNC146IDND825",
            destination_area_id: "IDNP6IDNC146IDND825",
            origin_latitude: -6.2031,
            origin_longitude: 106.7829,
            destination_latitude: -6.2050,
            destination_longitude: 106.7850,
            couriers: "gojek,grab,lalamove",
            items: [{ name: "Parfum", description: "Parfum", value: 50000, length: 10, width: 10, height: 10, weight: 700, quantity: 1 }]
        };

        const apiKey = process.env.BITESHIP_SANDBOX_API_KEY || 'biteship_test.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiRWxhIFBhcmZ1bSBUZXN0aW5nIiwidXNlcklkIjoiNmEyNmY1YmYzYTgyNjA0OGM5MjU1NTMyIiwiaWF0IjoxNzg1NTUzNjk0fQ.HDwttu9rrcCMOe2UgKBgxslAhZvwSfU_vIaydJtM7rU';

        const res = await fetch(`https://api.biteship.com/v1/rates/couriers`, {
            method: 'POST',
            headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload1)
        });

        const data = await res.json();
        console.log("Services:");
        data.pricing?.forEach((p: any) => {
            console.log(`- ${p.company}: ${p.type} (${p.courier_service_name})`);
        });
    } catch (e) {
        console.error(e);
    }
};

run();
