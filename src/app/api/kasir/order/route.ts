import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductOrderStock } from "@/lib/stock/refill-stock";
import {
  createMayarDynamicQris,
  createMayarInvoice,
  getMayarConfig,
  getMayarInvoiceStatus,
} from "@/lib/mayar";
import { PosBillItem } from "@/app/kasir/actions";

function generatePosOrderCode() {
  const dateStr = new Date()
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MW-POS-${dateStr}-${randomStr}`;
}

// GET: Polling & Cek Status Order Kasir (Ultra-Lightweight & Zero CPU Exhaustion)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderIdStr = searchParams.get("orderId");
    const storeIdStr = searchParams.get("storeId");
    const checkMayar = searchParams.get("checkMayar") === "true";

    if (!orderIdStr) {
      return NextResponse.json({ isPaid: false, error: "Missing orderId" }, { status: 400 });
    }

    const orderId = parseInt(orderIdStr, 10);
    const storeId = storeIdStr ? parseInt(storeIdStr, 10) : 1;

    const supabaseAdmin = createAdminClient();
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, status, payment_status, total, order_code, paid_at, notes")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ isPaid: false, error: "Order not found" }, { status: 404 });
    }

    const isPaid =
      order.payment_status === "paid" ||
      order.status === "paid" ||
      order.status === "completed";

    // Jika sudah tercatat lunas di database, langsung return (tanpa kalkulasi stok ulang di endpoint GET)
    if (isPaid) {
      return NextResponse.json({
        isPaid: true,
        orderCode: order.order_code,
        paidAt: order.paid_at,
      });
    }

    // Jika belum lunas dan ada permintaan sinkronisasi Mayar resmi (dari tombol Cek Status Lunas)
    if (checkMayar && order.notes) {
      const invoiceIdMatch = order.notes.match(/MayarInvoiceID:\s*([a-f0-9-]+)/i);
      if (invoiceIdMatch && invoiceIdMatch[1]) {
        const invoiceId = invoiceIdMatch[1].trim();
        const mayarCheck = await getMayarInvoiceStatus(invoiceId);

        if (mayarCheck.isPaid) {
          const nowIso = new Date().toISOString();
          // Update order menjadi lunas
          await supabaseAdmin
            .from("orders")
            .update({
              status: "completed",
              payment_status: "paid",
              paid_at: nowIso,
              payment_verified_at: nowIso,
            })
            .eq("id", order.id);

          // Potong stok cabang secara aman & idempotent
          try {
            await deductOrderStock(order.id, storeId);
          } catch (stkErr) {
            console.error("[GET /api/kasir/order] Gagal memotong stok setelah verifikasi Mayar:", stkErr);
          }

          return NextResponse.json({
            isPaid: true,
            orderCode: order.order_code,
            paidAt: nowIso,
            source: "mayar_invoice_reconciliation",
          });
        }
      }
    }

    return NextResponse.json({ isPaid: false });
  } catch (err: any) {
    console.error("Error in GET /api/kasir/order:", err);
    return NextResponse.json({ isPaid: false, error: err.message }, { status: 500 });
  }
}

// POST: Buat Order Kasir (QRIS Mayar Dinamis / Tunai / Transfer / Simulasi Sandbox)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    // ── AKSI KHUSUS: SIMULASI BAYAR QRIS (HANYA AKTIF DI MODE SANDBOX TESTING) ──
    if (action === "simulate_sandbox_pay") {
      const config = getMayarConfig();
      if (!config.isSandbox) {
        return NextResponse.json(
          { success: false, error: "Simulasi pembayaran ditolak: hanya diizinkan dalam mode Sandbox!" },
          { status: 403 }
        );
      }

      const orderId = payload?.orderId;
      const storeId = payload?.storeId || 1;

      if (!orderId) {
        return NextResponse.json({ success: false, error: "Parameter orderId tidak valid." }, { status: 400 });
      }

      const supabaseAdmin = createAdminClient();
      const nowIso = new Date().toISOString();
      const { data: updatedOrder, error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          status: "completed",
          payment_status: "paid",
          paid_at: nowIso,
          payment_verified_at: nowIso,
        })
        .eq("id", orderId)
        .select()
        .single();

      if (updateErr || !updatedOrder) {
        return NextResponse.json(
          { success: false, error: updateErr?.message || "Gagal mengupdate status order simulasi." },
          { status: 500 }
        );
      }

      // Potong stok cabang secara aman & idempotent
      try {
        await deductOrderStock(updatedOrder.id, storeId);
      } catch (stkErr) {
        console.error("[POST simulate_sandbox_pay] Warning gagal potong stok:", stkErr);
      }

      return NextResponse.json({
        success: true,
        orderId: updatedOrder.id,
        orderCode: updatedOrder.order_code,
      });
    }

    if (!payload || !payload.storeId || !payload.items || !payload.total) {
      return NextResponse.json(
        { success: false, error: "Payload transaksi kasir tidak lengkap." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const orderCode = generatePosOrderCode();

    const refillItems = (payload.items as PosBillItem[]).filter((i) => i.type === "refill");
    const bottleItems = (payload.items as PosBillItem[]).filter((i) => i.type === "bottle");

    let refillNotes = "";
    if (refillItems.length > 0) {
      const compactRefillData = refillItems.map((it) => ({
        customName: it.title,
        quantity: it.quantity,
        volumeMl: it.meta.capacityMl || 30,
        ratio: it.meta.ratio || "50/50",
        useOwnBottle: it.meta.useOwnBottle || false,
        bottle: it.meta.bottleId
          ? { id: it.meta.bottleId, name: it.meta.bottleName, capacity_ml: it.meta.capacityMl }
          : null,
        bibits: (it.meta.bibits || []).map((b) => ({
          id: b.id,
          name: b.name,
          volumeMl: b.volumeMl,
          price_per_ml: b.pricePerMl,
        })),
        adminRecipe: it.meta.adminRecipe,
      }));
      refillNotes = ` | RefillCartItems: ${JSON.stringify(compactRefillData)}`;
    }

    let bottleNotes = "";
    if (bottleItems.length > 0) {
      const compactBottleData = bottleItems.map((it) => ({
        bottleId: it.meta.bottleId,
        name: it.title,
        capacityMl: it.meta.capacityMl,
        quantity: it.quantity,
      }));
      bottleNotes = ` | PosBottleItems: ${JSON.stringify(compactBottleData)}`;
    }

    // ── AKSI 1: BUAT ORDER QRIS MAYAR DINAMIS ─────────────────────
    if (action === "create_qris") {
      // 1. Simpan pesanan ke database (pending / unpaid)
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .insert({
          order_code: orderCode,
          customer_name: payload.customerName || "Customer Toko",
          customer_phone: payload.customerPhone || null,
          subtotal: payload.subtotal,
          discount: payload.discount || 0,
          total: payload.total,
          status: "pending",
          payment_status: "unpaid",
          payment_method: "QRIS",
          store_id: payload.storeId,
          fulfillment_type: "pickup",
          cashier_name: payload.cashierName,
          notes: `Transaksi Kasir Toko Cabang #${payload.storeId} [QRIS Mayar Inline]${refillNotes}${bottleNotes}`,
        })
        .select()
        .single();

      if (orderErr || !order) {
        return NextResponse.json(
          { success: false, error: `Gagal membuat order: ${orderErr?.message || "DB Error"}` },
          { status: 500 }
        );
      }

      // 2. Insert items
      const orderItemsToInsert = (payload.items as PosBillItem[]).map((item) => ({
        order_id: order.id,
        perfume_id: item.meta.perfumeId || null,
        size_id: item.meta.sizeId || null,
        perfume_name: item.title,
        size_label: item.meta.sizeLabel || (item.meta.capacityMl ? `${item.meta.capacityMl}ml` : "1 pcs"),
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }));
      if (orderItemsToInsert.length > 0) {
        await supabaseAdmin.from("order_items").insert(orderItemsToInsert);
      }

      // 3. Request Dynamic QRIS ke Mayar API (/hl/v1/qrcode/create) & Mayar Invoice Link secara paralel
      const [qrisRes, invoiceRes] = await Promise.all([
        createMayarDynamicQris(payload.total),
        createMayarInvoice({
          amount: payload.total,
          orderCode: order.order_code,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          redirectUrl: `https://cashier.elaparfum.web.id/?mayar_done=1&code=${order.order_code}`,
        }),
      ]);

      if (!qrisRes.success || !qrisRes.qrUrl) {
        return NextResponse.json(
          {
            success: false,
            error: qrisRes.error || "Gagal mendapatkan gambar QRIS dari Mayar.",
            isSandbox: qrisRes.isSandbox,
          },
          { status: 502 }
        );
      }

      // Catat MayarInvoiceID & MayarInvoiceLink ke order.notes untuk rekonsiliasi realtime
      let invoiceNotes = "";
      if (invoiceRes?.invoiceId) {
        invoiceNotes += ` | MayarInvoiceID: ${invoiceRes.invoiceId}`;
      }
      if (invoiceRes?.link) {
        invoiceNotes += ` | MayarInvoiceLink: ${invoiceRes.link}`;
      }
      if (invoiceNotes) {
        await supabaseAdmin
          .from("orders")
          .update({
            notes: `${order.notes || ""}${invoiceNotes}`,
          })
          .eq("id", order.id);
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        orderCode: order.order_code,
        qrDataUrl: qrisRes.qrUrl,
        qrString: qrisRes.qrString || "",
        mayarLink: invoiceRes?.link || null,
        invoiceId: invoiceRes?.invoiceId || null,
        amount: payload.total,
        isSandbox: qrisRes.isSandbox,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
    }

    // ── AKSI 2: SELESAIKAN ORDER TUNAI / CASH / TRANSFER ──────────
    if (action === "complete_cash" || action === "complete_transfer") {
      const paymentMethod = action === "complete_transfer" ? "TRANSFER" : "TUNAI";
      const cashReceived = payload.cashReceived || payload.total;
      const cashChange = Math.max(0, cashReceived - payload.total);

      // 1. Simpan pesanan lunas
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .insert({
          order_code: orderCode,
          customer_name: payload.customerName || "Customer Toko",
          customer_phone: payload.customerPhone || null,
          subtotal: payload.subtotal,
          discount: payload.discount || 0,
          total: payload.total,
          status: "completed",
          payment_status: "paid",
          payment_method: paymentMethod,
          store_id: payload.storeId,
          fulfillment_type: "pickup",
          cashier_name: payload.cashierName,
          cash_received: cashReceived,
          cash_change: cashChange,
          paid_at: new Date().toISOString(),
          payment_verified_at: new Date().toISOString(),
          notes: `Transaksi Kasir Toko Cabang #${payload.storeId} [${paymentMethod}]${refillNotes}${bottleNotes}`,
        })
        .select()
        .single();

      if (orderErr || !order) {
        return NextResponse.json(
          { success: false, error: `Gagal menyimpan transaksi: ${orderErr?.message || "DB Error"}` },
          { status: 500 }
        );
      }

      // 2. Insert items
      const orderItemsToInsert = (payload.items as PosBillItem[]).map((item) => ({
        order_id: order.id,
        perfume_id: item.meta.perfumeId || null,
        size_id: item.meta.sizeId || null,
        perfume_name: item.title,
        size_label: item.meta.sizeLabel || (item.meta.capacityMl ? `${item.meta.capacityMl}ml` : "1 pcs"),
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }));
      if (orderItemsToInsert.length > 0) {
        await supabaseAdmin.from("order_items").insert(orderItemsToInsert);
      }

      // 3. Potong stok cabang secara aman & idempotent
      await deductOrderStock(order.id, payload.storeId);

      return NextResponse.json({
        success: true,
        orderId: order.id,
        orderCode: order.order_code,
        createdAt: order.created_at,
        cashReceived,
        cashChange,
      });
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (err: any) {
    console.error("Error in POST /api/kasir/order:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
