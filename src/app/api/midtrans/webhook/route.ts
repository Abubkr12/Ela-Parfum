import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractBaseOrderCode,
  isMidtransFailedStatus,
  isMidtransPaidStatus,
  verifyMidtransSignature,
} from "@/lib/midtrans";
import { fulfillPaidOrder } from "@/lib/order-fulfillment";

function formatMidtransMethod(paymentType?: string): string {
  if (!paymentType) return "Midtrans";
  const map: Record<string, string> = {
    qris: "Midtrans (QRIS)",
    gopay: "Midtrans (GoPay)",
    bank_transfer: "Midtrans (Virtual Account)",
    echannel: "Midtrans (Mandiri Bill)",
    permata_va: "Midtrans (Permata VA)",
    bca_va: "Midtrans (BCA VA)",
    bni_va: "Midtrans (BNI VA)",
    bri_va: "Midtrans (BRI VA)",
    cimb_va: "Midtrans (CIMB VA)",
    credit_card: "Midtrans (Kartu Kredit)",
    shopeepay: "Midtrans (ShopeePay)",
    dana: "Midtrans (DANA)",
    cstore: "Midtrans (Minimarket)",
  };
  return map[paymentType] || `Midtrans (${paymentType.toUpperCase()})`;
}

export async function GET() {
  return NextResponse.json(
    { success: true, message: "Midtrans webhook endpoint is active" },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as {
      order_id?: string;
      status_code?: string;
      gross_amount?: string;
      signature_key?: string;
      transaction_status?: string;
      fraud_status?: string;
      payment_type?: string;
      transaction_id?: string;
    };

    const rawOrderId = String(data.order_id || "");
    const statusCode = String(data.status_code || "");
    const grossAmount = String(data.gross_amount || "");
    const signatureKey = String(data.signature_key || "");

    if (!rawOrderId) {
      return NextResponse.json({ message: "Order ID not found" }, { status: 400 });
    }

    const isValidSig = verifyMidtransSignature(
      rawOrderId,
      statusCode,
      grossAmount,
      signatureKey
    );

    if (!isValidSig) {
      return NextResponse.json({ message: "Invalid signature key" }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    try {
      await supabaseAdmin.from("webhook_logs").insert({
        source: "midtrans",
        event_type: data.transaction_status || "unknown",
        payload: {
          order_id: rawOrderId,
          transaction_status: data.transaction_status,
          fraud_status: data.fraud_status,
          payment_type: data.payment_type,
          status_code: statusCode,
          gross_amount: grossAmount,
          transaction_id: data.transaction_id,
        },
      });
    } catch (e) {
      console.error("Failed to insert Midtrans webhook log:", e);
    }

    const baseOrderCode = extractBaseOrderCode(rawOrderId);
    const txStatus = data.transaction_status;
    const fraudStatus = data.fraud_status;

    if (isMidtransPaidStatus(txStatus, fraudStatus)) {
      const res = await fulfillPaidOrder(baseOrderCode, {
        paymentMethodLabel: formatMidtransMethod(data.payment_type),
      });

      if (!res.found) {
        return NextResponse.json({ message: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({ message: "OK" }, { status: 200 });
    }

    if (isMidtransFailedStatus(txStatus)) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, status, payment_status")
        .eq("order_code", baseOrderCode)
        .single();

      // Monotonic: never overwrite already paid/fulfilled orders
      if (order && order.status === "pending" && order.payment_status !== "paid") {
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "rejected",
            payment_method: formatMidtransMethod(data.payment_type),
          })
          .eq("id", order.id);
      }

      return NextResponse.json({ message: "OK" }, { status: 200 });
    }

    // Pending / challenge state: record payment type if still pending
    if (txStatus === "pending" || (txStatus === "capture" && fraudStatus === "challenge")) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, status, payment_status")
        .eq("order_code", baseOrderCode)
        .single();

      if (order && order.status === "pending" && order.payment_status !== "paid") {
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "unpaid",
            payment_method: formatMidtransMethod(data.payment_type),
          })
          .eq("id", order.id);
      }
    }

    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (error) {
    console.error("Midtrans webhook error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
