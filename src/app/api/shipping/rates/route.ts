import { NextResponse } from 'next/server';

const STORE_LOCATIONS = [
  { id: 'IDNP6IDNC149IDND851', name: 'Condet', address: 'Jl. Raya Condet No. 1, RT.001/RW.015, Kelurahan Cililitan, Kecamatan Kramat Jati, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13640', latitude: -6.263281646322936, longitude: 106.86484090895478 },
  { id: 'IDNP6IDNC146IDND825', name: 'Rawa Belong', address: 'Jl. Raya Kb. Jeruk No.57B, RT.8/RW.15, Palmerah, Kec. Palmerah, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11530', latitude: -6.202968871424059, longitude: 106.78298439693361 },
  { id: 'IDNP3IDNC446IDND5630', name: 'Tangerang', address: 'Jl. Pondok Kacang No. 36, RT.002/RW.005, Kelurahan Parung Serab, Kecamatan Ciledug, Kota Tangerang, Provinsi Banten 15226', latitude: -6.244325229406331, longitude: 106.69862467974234 }
];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        if (!body.destination_area_id) {
            return NextResponse.json({ error: 'destination_area_id is required' }, { status: 400 });
        }

        const fetchRatesForOrigin = async (origin: { id: string, name: string, latitude: number, longitude: number }) => {
            const payload: any = {
                "origin_area_id": origin.id,
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

        // Hardcode to Rawa Belong for now as requested
        const rawaBelong = STORE_LOCATIONS.find(loc => loc.name === 'Rawa Belong')!;
        const allRatesPromises = [fetchRatesForOrigin(rawaBelong)];
        const allRatesResults = await Promise.all(allRatesPromises);
        
        // Flatten and find the cheapest for each courier_service_code
        const bestRatesMap = new Map<string, any>();
        
        for (const rates of allRatesResults) {
            for (const rate of rates) {
                const key = `${rate.company}-${rate.courier_service_code}`;
                if (!bestRatesMap.has(key) || rate.price < bestRatesMap.get(key).price) {
                    bestRatesMap.set(key, rate);
                }
            }
        }

        // Filter out instant/sameday couriers if coordinates are missing
        let finalPricing = Array.from(bestRatesMap.values());
        
        if (!body.destination_latitude || !body.destination_longitude) {
            // Remove couriers that require coordinates (grab, gojek, lalamove)
            finalPricing = finalPricing.filter((rate: any) => {
                const company = rate.courier_company || rate.courier_name?.toLowerCase();
                return !['grab', 'gojek', 'lalamove'].includes(company);
            });
        }

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
        if (finalPricing.length === 0) {
            let mocks = [
                pickupOption,
                { courier_name: "J&T", courier_service_name: "EZ", courier_service_code: "ez", price: 10000, duration: "2-3 Hari", origin_area_id: 'IDNP6IDNC146IDND825', origin_name: "Rawa Belong" },
                { courier_name: "JNE", courier_service_name: "REG", courier_service_code: "reg", price: 15000, duration: "1-2 Hari", origin_area_id: 'IDNP6IDNC146IDND825', origin_name: "Rawa Belong" },
                { courier_name: "Gojek", courier_service_name: "Instant", courier_service_code: "instant", price: 35000, duration: "1-3 Jam", origin_area_id: 'IDNP6IDNC146IDND825', origin_name: "Rawa Belong" },
                { courier_name: "Grab", courier_service_name: "Instant", courier_service_code: "instant", price: 25000, duration: "1-2 Jam", origin_area_id: 'IDNP6IDNC146IDND825', origin_name: "Rawa Belong" },
                { courier_name: "Lalamove", courier_service_name: "Motorcycle", courier_service_code: "motorcycle", price: 30000, duration: "1-3 Jam", origin_area_id: 'IDNP6IDNC146IDND825', origin_name: "Rawa Belong" },
            ];

            if (!body.destination_latitude || !body.destination_longitude) {
                mocks = mocks.filter((rate: any) => {
                    const company = rate.courier_name?.toLowerCase();
                    return !['grab', 'gojek', 'lalamove'].includes(company);
                });
            }
            return NextResponse.json({ pricing: mocks });
        }

        finalPricing.unshift(pickupOption);

        return NextResponse.json({ pricing: finalPricing });
    } catch (error) {
        console.error('Error fetching Biteship rates:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
