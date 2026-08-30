import { NextRequest, NextResponse } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import WaybillTemplate from "./WaybillTemplate";
import React from "react";

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
    
    // Convert React component to HTML string
    const html = renderToStaticMarkup(<WaybillTemplate order={data} />);

    // Wrap in standard HTML boilerplate and auto-trigger print
    const fullHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cetak Resi - ${data.courier?.waybill_id || data.id}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #fff;
    }
    @media print {
      body {
        padding: 0;
      }
      @page {
        size: A4;
        margin: 1cm;
      }
    }
  </style>
</head>
<body onload="window.print()">
  ${html}
</body>
</html>
    `;

    return new NextResponse(fullHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });

  } catch (err: any) {
    console.error("Waybill fetch error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
