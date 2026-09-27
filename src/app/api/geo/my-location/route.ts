import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cf = (request as any).cf;
    const lat = cf?.latitude ? parseFloat(cf.latitude) : null;
    const lng = cf?.longitude ? parseFloat(cf.longitude) : null;
    const city = cf?.city || null;
    const region = cf?.region || null;

    // 1. Edge geolocation dari Cloudflare Workers (Produksi)
    if (lat && lng) {
      return NextResponse.json({
        success: true,
        source: "cloudflare-edge",
        latitude: lat,
        longitude: lng,
        city,
        region,
      });
    }

    // 2. Fallback untuk Local Development atau jika Cloudflare edge lat/lng kosong
    try {
      const clientIp =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      // Jika ada IP publik klien, gunakan IP tersebut, jika tidak (localhost/private IP) gunakan IP publik pemanggil
      const url =
        clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1" && !clientIp.startsWith("192.168.")
          ? `http://ip-api.com/json/${clientIp}?fields=status,country,regionName,city,lat,lon`
          : `http://ip-api.com/json/?fields=status,country,regionName,city,lat,lon`;

      const ipRes = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.status === "success" && typeof ipData.lat === "number" && typeof ipData.lon === "number") {
          return NextResponse.json({
            success: true,
            source: "ip-lookup",
            latitude: ipData.lat,
            longitude: ipData.lon,
            city: ipData.city || ipData.regionName || "Jabodetabek",
            region: ipData.regionName || null,
          });
        }
      }
    } catch {
      // Abaikan jika network timeout
    }

    // 3. Default fallback Jakarta jika IP tidak dapat dilokalisasi
    return NextResponse.json({
      success: true,
      source: "fallback",
      latitude: -6.2088,
      longitude: 106.8456,
      city: "Jakarta",
      region: "DKI Jakarta",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        latitude: -6.2088,
        longitude: 106.8456,
      },
      { status: 500 }
    );
  }
}
