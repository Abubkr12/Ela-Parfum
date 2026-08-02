import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing Biteship Order ID", { status: 400 });
  }

  const isSandbox = process.env.NODE_ENV === "development";
  const biteshipUrl = "https://api.biteship.com/v1/orders/" + id;
  const apiKey = isSandbox 
    ? process.env.BITESHIP_SANDBOX_API_KEY 
    : process.env.BITESHIP_API_KEY;

  try {
    const res = await fetch(biteshipUrl, {
      method: "GET",
      headers: {
        "Authorization": apiKey || "",
      },
    });

    if (!res.ok) {
      console.error("Biteship fetch error:", await res.text());
      return new NextResponse("Failed to fetch order from Biteship", { status: 500 });
    }

    const data = await res.json();
    
    // Some couriers might not have waybill immediately in sandbox, but let's check
    if (data.waybill_url) {
      return NextResponse.redirect(data.waybill_url);
    } else {
      // In sandbox for testing or before pickup
      return new NextResponse("Resi belum tersedia atau kurir belum di-pickup. Coba lagi nanti.", { status: 404 });
    }
  } catch (err: any) {
    console.error("Waybill fetch error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
