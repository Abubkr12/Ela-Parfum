import { NextResponse } from 'next/server';
import { ELA_STORES } from '@/lib/stores';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        if (!body.destination_area_id) {
            return NextResponse.json({ error: 'destination_area_id is required' }, { status: 400 });
        }

        // Tentukan toko asal pengiriman berdasarkan origin_store_id (Default: Rawa Belong / ID 2)
        const storeId = body.origin_store_id ? Number(body.origin_store_id) : 2;
        const originStore = ELA_STORES.find(loc => loc.id === storeId) || ELA_STORES[1];

        const fetchRatesForOrigin = async (origin: typeof originStore) => {
            const payload: any = {
                "origin_area_id": origin.areaId,
                "origin_latitude": origin.latitude,
                "origin_longitude": origin.longitude,
                "destination_area_id": body.destination_area_id,
                "couriers": "gojek,grab,lalamove,jnt,jne,ninja,wahana,jnt_cargo",
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
                payload.destination_latitude = parseFloat(body.destination_latitude);
                payload.destination_longitude = parseFloat(body.destination_longitude);
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
                console.error(`Biteship Error for origin ${origin.shortName}:`, await response.json().catch(()=>({})));
                return [];
            }

            const data = await response.json();
            return (data.pricing || []).map((rate: any) => ({
                ...rate,
                origin_store_id: origin.id,
                origin_area_id: origin.areaId,
                origin_name: origin.shortName
            }));
        };

        const rates = await fetchRatesForOrigin(originStore);
        
        // Filter out instant/sameday couriers if coordinates are missing
        let finalPricing = rates;
        
        if (!body.destination_latitude || !body.destination_longitude) {
            // Remove couriers that require coordinates (grab, gojek, lalamove)
            finalPricing = finalPricing.filter((rate: any) => {
                const company = rate.courier_company || rate.courier_name?.toLowerCase();
                return !['grab', 'gojek', 'lalamove'].includes(company);
            });
        }

        const pickupOption = {
            courier_name: "Toko Ela Parfum",
            courier_service_name: `Ambil di Tempat (${originStore.shortName})`,
            courier_service_code: "pickup",
            price: 0,
            duration: "Tersedia Sekarang",
            origin_store_id: originStore.id,
            origin_area_id: "pickup",
            origin_name: originStore.shortName
        };

        // Fallback testing logic (mock) jika Biteship sandbox / error
        if (finalPricing.length === 0) {
            let mocks = [
                pickupOption,
                { courier_name: "J&T", courier_service_name: "EZ", courier_service_code: "ez", price: 10000, duration: "2-3 Hari", origin_store_id: originStore.id, origin_area_id: originStore.areaId, origin_name: originStore.shortName },
                { courier_name: "JNE", courier_service_name: "REG", courier_service_code: "reg", price: 15000, duration: "1-2 Hari", origin_store_id: originStore.id, origin_area_id: originStore.areaId, origin_name: originStore.shortName },
                { courier_name: "Gojek", courier_service_name: "Instant", courier_service_code: "instant", price: 35000, duration: "1-3 Jam", origin_store_id: originStore.id, origin_area_id: originStore.areaId, origin_name: originStore.shortName },
                { courier_name: "Grab", courier_service_name: "Instant", courier_service_code: "instant", price: 25000, duration: "1-2 Jam", origin_store_id: originStore.id, origin_area_id: originStore.areaId, origin_name: originStore.shortName },
                { courier_name: "Lalamove", courier_service_name: "Motorcycle", courier_service_code: "motorcycle", price: 30000, duration: "1-3 Jam", origin_store_id: originStore.id, origin_area_id: originStore.areaId, origin_name: originStore.shortName },
            ];

            if (!body.destination_latitude || !body.destination_longitude) {
                mocks = mocks.filter((rate: any) => {
                    const company = rate.courier_name?.toLowerCase();
                    return !['grab', 'gojek', 'lalamove'].includes(company);
                });
            }
            return NextResponse.json({ pricing: mocks, origin_store: originStore });
        }

        finalPricing.unshift(pickupOption);

        return NextResponse.json({ pricing: finalPricing, origin_store: originStore });
    } catch (error) {
        console.error('Error fetching Biteship rates:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
