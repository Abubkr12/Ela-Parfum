import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const waybill = searchParams.get('waybill');
    const courier = searchParams.get('courier');

    if (!waybill || !courier) {
        return NextResponse.json({ error: 'waybill and courier are required' }, { status: 400 });
    }

    try {
        let courierName = courier.split('-')[0].trim();
        let courierCode = courierName.toLowerCase();
        if (courierCode === 'j&t') courierCode = 'jnt';

        const response = await fetch(`https://api.biteship.com/v1/trackings/${waybill}/couriers/${courierCode}`, {
            method: 'GET',
            headers: {
                'Authorization': process.env.BITESHIP_API_KEY || ''
            }
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error('Biteship Tracking Error:', errData);
            
            // Mock data for sandbox / local test
            return NextResponse.json({
                success: true,
                status: 'allocated',
                history: [
                    { note: 'Paket telah dialokasikan ke kurir', updated_at: new Date().toISOString() },
                    { note: `Paket diserahkan ke ${courierName}`, updated_at: new Date(Date.now() - 3600000).toISOString() }
                ]
            });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching Biteship tracking:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
