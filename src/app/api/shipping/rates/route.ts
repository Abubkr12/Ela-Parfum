import { NextResponse } from 'next/server';

const STORE_LOCATIONS = [
  { id: 'IDNP6IDNC149IDND851', name: 'Condet' }, // Kramat Jati
  { id: 'IDNP6IDNC146IDND825', name: 'Rawa Belong' }, // Palmerah
  { id: 'IDNP3IDNC445IDND5590', name: 'Tangerang' } // Ciledug
];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        if (!body.destination_area_id) {
            return NextResponse.json({ error: 'destination_area_id is required' }, { status: 400 });
        }

        const fetchRatesForOrigin = async (origin: { id: string, name: string }) => {
            const payload: any = {
                "origin_area_id": origin.id,
                "destination_area_id": body.destination_area_id,
                "couriers": "gojek,grab,lalamove,jnt,jne,ninja,idx",
                "items": [
                    {
                        "name": "Parfum",
                        "description": "Parfum",
                        "value": 50000,
                        "length": 10,
                        "width": 10,
                        "height": 10,
                        "weight": 200,
                        "quantity": 1
                    }
                ]
            };
            
            if (body.destination_latitude && body.destination_longitude) {
                payload.destination_latitude = body.destination_latitude;
                payload.destination_longitude = body.destination_longitude;
            } else if (body.destination_coordinate?.latitude && body.destination_coordinate?.longitude) {
                payload.destination_latitude = body.destination_coordinate.latitude;
                payload.destination_longitude = body.destination_coordinate.longitude;
            }

            const isSandbox = process.env.BITESHIP_IS_SANDBOX === 'true';
            const biteshipKey = isSandbox ? process.env.BITESHIP_SANDBOX_API_KEY : process.env.BITESHIP_API_KEY;

            const response = await fetch(`https://api.biteship.com/v1/rates/couriers`, {
                method: 'POST',
                headers: {
                    'Authorization': biteshipKey || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error(`Biteship Error for origin ${origin.name}:`, await response.json().catch(()=>({})));
                return [];
            }

            const data = await response.json();
            return (data.pricing || []).map((rate: any) => ({
                ...rate,
                origin_area_id: origin.id,
                origin_name: origin.name
            }));
        };

        const allRatesPromises = STORE_LOCATIONS.map(origin => fetchRatesForOrigin(origin));
        const allRatesResults = await Promise.all(allRatesPromises);
        
        // Flatten and find the cheapest for each courier_service_code
        const bestRatesMap = new Map<string, any>();
        
        for (const rates of allRatesResults) {
            for (const rate of rates) {
                // Filter out cars, vans, trucks because perfumes are small packages
                const serviceLower = (rate.courier_service_code || '').toLowerCase();
                const nameLower = (rate.courier_name || '').toLowerCase();
                if (serviceLower.includes('car') || serviceLower.includes('van') || serviceLower.includes('truck') || nameLower.includes('car') || nameLower.includes('van') || nameLower.includes('truck')) {
                    continue;
                }

                // Use company + service code as key to prevent Grab Instant from overwriting Gojek Instant
                const key = `${rate.courier_company}_${rate.courier_service_code}`;
                
                if (!bestRatesMap.has(key) || rate.price < bestRatesMap.get(key).price) {
                    bestRatesMap.set(key, rate);
                }
            }
        }

        const pricing = Array.from(bestRatesMap.values());

        const pickupOption = {
            courier_name: "Toko Ela Parfum",
            courier_service_name: "Ambil di Tempat",
            courier_service_code: "pickup",
            price: 0,
            duration: "Tersedia Sekarang",
            origin_area_id: "pickup",
            origin_name: "Toko Pilihan Anda"
        };

        // Fallback testing logic (mock)
        if (pricing.length === 0) {
            return NextResponse.json({
                pricing: [
                    pickupOption,
                    { courier_name: "J&T", courier_service_name: "EZ", courier_service_code: "ez", price: 10000, duration: "2-3 Hari", origin_area_id: STORE_LOCATIONS[0].id, origin_name: "Condet" },
                    { courier_name: "JNE", courier_service_name: "REG", courier_service_code: "reg", price: 15000, duration: "1-2 Hari", origin_area_id: STORE_LOCATIONS[0].id, origin_name: "Condet" },
                    { courier_name: "Gojek", courier_service_name: "Instant", courier_service_code: "instant", price: 35000, duration: "1-3 Jam", origin_area_id: STORE_LOCATIONS[1].id, origin_name: "Rawa Belong" },
                    { courier_name: "Grab", courier_service_name: "Same Day", courier_service_code: "sameday", price: 25000, duration: "6-8 Jam", origin_area_id: STORE_LOCATIONS[1].id, origin_name: "Rawa Belong" },
                    { courier_name: "Lalamove", courier_service_name: "Motorcycle", courier_service_code: "motorcycle", price: 30000, duration: "1-3 Jam", origin_area_id: STORE_LOCATIONS[2].id, origin_name: "Tangerang" },
                ]
            });
        }

        pricing.unshift(pickupOption);

        return NextResponse.json({ pricing });
    } catch (error) {
        console.error('Error fetching Biteship rates:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
