import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cf = (request as any).cf;
    const lat = cf?.latitude ? parseFloat(cf.latitude) : null;
    const lng = cf?.longitude ? parseFloat(cf.longitude) : null;
    const city = cf?.city || null;
    const region = cf?.region || null;

    if (lat && lng) {
      return NextResponse.json({
        success: true,
        source: "cloudflare-edge",
        latitude: lat,
        longitude: lng,
        city,
        region
      });
    }

    // Default fallback Jakarta jika IP tidak dapat dilokalisasi
    return NextResponse.json({
      success: true,
      source: "fallback",
      latitude: -6.2088,
      longitude: 106.8456,
      city: "Jakarta",
      region: "DKI Jakarta"
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        latitude: -6.2088,
        longitude: 106.8456
      },
      { status: 500 }
    );
  }
}
