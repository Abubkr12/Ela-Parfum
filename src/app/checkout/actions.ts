"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Cart, CartItem } from "@/lib/types";
import { deductOrderStock } from "@/lib/stock/refill-stock";
import {
  createMidtransSnapTransaction,
  extractBaseOrderCode,
  getMidtransTransactionStatus,
  isMidtransFailedStatus,
  isMidtransPaidStatus,
  type MidtransSnapItem,
} from "@/lib/midtrans";
import { fulfillPaidOrder } from "@/lib/order-fulfillment";

const supabaseAdmin = createAdminClient();

async function getBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    if (host) {
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
      const proto = headersList.get("x-forwarded-proto") || (isLocal ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // fallback if headers() fails in non-request context
  }
  return process.env.NEXT_PUBLIC_BASE_URL || "https://elaparfum.web.id";
}

function generateOrderCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MW-${timestamp}-${random}`;
}

function getLatestMidtransAttemptId(order: { order_code: string; notes?: string | null }): string {
  if (order.notes) {
    const matches = [...order.notes.matchAll(/MidtransAttemptID:\s*([A-Z0-9-]+)/gi)];
    if (matches.length > 0) {
      return matches[matches.length - 1][1];
    }
  }
  return order.order_code;
}

function upsertAttemptIdInNotes(notes: string | null | undefined, attemptId: string): string {
  const cleaned = (notes || "").replace(/\s*\|\s*MidtransAttemptID:\s*[A-Z0-9-]+/gi, "");
  return `${cleaned} | MidtransAttemptID: ${attemptId}`.trim();
}

export async function validateVoucher(code: string, subtotal: number, shippingCost: number) {
  try {
    const { data: voucher, error } = await supabaseAdmin
      .from("vouchers")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (error || !voucher) return { error: "Voucher tidak ditemukan." };
    if (!voucher.is_active) return { error: "Voucher tidak aktif." };

    const now = new Date();
    if (voucher.valid_from && new Date(voucher.valid_from) > now)
      return { error: "Voucher belum berlaku." };
    if (voucher.valid_until && new Date(voucher.valid_until) < now)
      return { error: "Voucher sudah kadaluarsa." };

    if (voucher.quota > 0 && voucher.used_count >= voucher.quota)
      return { error: "Kuota voucher telah habis." };
    if (voucher.min_purchase > 0 && subtotal < voucher.min_purchase)
      return { error: `Minimal belanja Rp ${voucher.min_purchase.toLocaleString("id-ID")}` };

    let discountAmount = 0;
    if (voucher.type === "percentage") {
      discountAmount = Math.floor(subtotal * (voucher.value / 100));
      if (voucher.max_discount > 0 && discountAmount > voucher.max_discount) {
        discountAmount = voucher.max_discount;
      }
    } else if (voucher.type === "fixed") {
      discountAmount = voucher.value;
    } else if (voucher.type === "free_shipping") {
      discountAmount = shippingCost;
      if (voucher.value > 0 && shippingCost > voucher.value) {
        discountAmount = voucher.value;
      }
    }

    if (discountAmount <= 0) return { error: "Voucher tidak memberikan potongan." };

    return { success: true, voucher, discountAmount };
  } catch {
    return { error: "Terjadi kesalahan sistem." };
  }
}

export async function processCheckout(formData: FormData, cart: Cart, subtotal: number) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Harap login terlebih dahulu untuk checkout." };
    if (!cart || cart.items.length === 0) return { error: "Keranjang belanja kosong." };

    const fullName = ((formData.get("fullName") as string) || "Pelanggan").trim();
    const rawPhone = ((formData.get("phone") as string) || "").trim();
    let cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("62")) {
      cleanPhone = "0" + cleanPhone.substring(2);
    }

    const address = formData.get("address") as string;
    const shippingCostStr = formData.get("shippingCost") as string;
    const courierInfo = formData.get("courierInfo") as string;
    const courierCompany = ((formData.get("courierCompany") as string) || "").trim().toLowerCase();
    const courierServiceCode = ((formData.get("courierServiceCode") as string) || "")
      .trim()
      .toLowerCase();
    const voucherCode = formData.get("voucherCode") as string;
    const paymentMethod = formData.get("paymentMethod") as string;
    const originAreaId = formData.get("originAreaId") as string;
    const originName = formData.get("originName") as string;
    const destinationAreaId = formData.get("destinationAreaId") as string;
    const destinationLat = (formData.get("destinationLatitude") as string) || "";
    const destinationLng = (formData.get("destinationLongitude") as string) || "";

    const shippingCost = parseInt(shippingCostStr || "0", 10);
    let discount = 0;
    let appliedVoucherId = null;

    if (voucherCode) {
      const vRes = await validateVoucher(voucherCode, subtotal, shippingCost);
      if (vRes.success && vRes.discountAmount) {
        discount = vRes.discountAmount;
        appliedVoucherId = vRes.voucher.id;
      } else {
        return { error: "Voucher tidak valid: " + vRes.error };
      }
    }

    let total = subtotal + shippingCost - discount;
    let serviceFee = 0;
    if (paymentMethod === "QRIS") {
      if (cleanPhone.length < 10) {
        return {
          error:
            "Nomor WhatsApp tidak valid (minimal 10 digit angka). Mohon periksa kembali nomor kontak Anda.",
        };
      }
      serviceFee = Math.floor(total * 0.01);
      total += serviceFee;
    }

    const storeIdStr = formData.get("storeId") as string;
    const storeId = storeIdStr ? parseInt(storeIdStr, 10) : 2;
    const fulfillmentType = ((formData.get("fulfillmentType") as string) ||
      (courierInfo?.toLowerCase().includes("ambil") ? "pickup" : "delivery")) as
      | "delivery"
      | "pickup";

    const orderCode = generateOrderCode();

    const refillItems = cart.items.filter((it) => it.itemType === "refill" && it.refillData);
    const hasOwnBottle = refillItems.some((it) => it.refillData?.useOwnBottle);
    if (fulfillmentType === "delivery" && hasOwnBottle) {
      return {
        error:
          "Pesanan yang menggunakan racikan Botol Sendiri wajib diambil langsung di toko cabang (tidak dapat dikirim via kurir ekspedisi).",
      };
    }

    let refillNotes = "";
    if (refillItems.length > 0) {
      const compactRefillData = refillItems.map((it) => ({
        customName: it.refillData?.customName || it.perfumeName,
        quantity: it.quantity,
        volumeMl: it.refillData?.volumeMl || 30,
        ratio: it.refillData?.ratio || "50/50",
        useOwnBottle: it.refillData?.useOwnBottle || false,
        bottle: it.refillData?.bottle,
        bibits: it.refillData?.bibits,
        adminRecipe: it.refillData?.adminRecipe,
        technicalRecipe: it.refillData?.technicalRecipe,
      }));
      refillNotes = ` | RefillCartItems: ${JSON.stringify(compactRefillData)}`;
    }

    const orderNotes = `Kurir: ${courierInfo}${courierCompany ? ` | CourierCompany: ${courierCompany}` : ""}${courierServiceCode ? ` | CourierService: ${courierServiceCode}` : ""} | Origin: ${originName} | StoreID: ${storeId} | Fulfillment: ${fulfillmentType} | Dest: ${destinationAreaId} | DestLat: ${destinationLat} | DestLng: ${destinationLng} | Pembayaran: ${paymentMethod}${voucherCode ? ` | Voucher: ${voucherCode}` : ""}${refillNotes} | MidtransAttemptID: ${orderCode}`;

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_code: orderCode,
        customer_id: user.id,
        customer_name: fullName,
        customer_phone: cleanPhone || rawPhone,
        customer_address: address,
        store_id: storeId,
        fulfillment_type: fulfillmentType,
        subtotal: subtotal,
        discount: discount,
        shipping_cost: shippingCost,
        courier_name: courierInfo,
        total: total,
        status: paymentMethod === "TUNAI" ? "pending_verification" : "pending",
        payment_method:
          paymentMethod === "TUNAI" ? "Bayar Tunai di Toko" : "Midtrans (QRIS / GoPay / VA)",
        notes: orderNotes,
      })
      .select("id, order_code")
      .single();

    if (orderError) return { error: "Gagal membuat pesanan: " + orderError.message };

    const orderItemsData = cart.items.map((item) => ({
      order_id: orderData.id,
      perfume_id: item.itemType === "refill" ? null : item.perfumeId || null,
      size_id: item.itemType === "refill" ? null : item.sizeId || null,
      perfume_name: item.perfumeName,
      size_label: item.sizeLabel,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItemsData);
    if (itemsError) return { error: "Gagal menyimpan detail pesanan: " + itemsError.message };

    if (paymentMethod === "TUNAI") {
      await deductOrderStock(orderData.id, storeId);
    }

    if (appliedVoucherId) {
      const { data: v } = await supabaseAdmin
        .from("vouchers")
        .select("used_count")
        .eq("id", appliedVoucherId)
        .single();
      if (v) {
        await supabaseAdmin
          .from("vouchers")
          .update({ used_count: v.used_count + 1 })
          .eq("id", appliedVoucherId);
      }
    }

    if (paymentMethod === "TUNAI") {
      return { url: `/checkout/success?id=${orderData.id}`, success: true, orderId: orderData.id };
    }

    // Create Midtrans Snap Transaction
    try {
      const baseUrl = await getBaseUrl();
      const snapItems: MidtransSnapItem[] = cart.items.map((item, idx) => ({
        id: `ITEM-${idx + 1}`,
        price: Math.round(item.price),
        quantity: item.quantity,
        name: `${item.perfumeName} (${item.sizeLabel})`,
      }));
      if (shippingCost > 0) {
        snapItems.push({
          id: "SHIPPING",
          price: shippingCost,
          quantity: 1,
          name: `Ongkir (${courierInfo || "Kurir"})`,
        });
      }
      if (serviceFee > 0) {
        snapItems.push({
          id: "SERVICE-FEE",
          price: serviceFee,
          quantity: 1,
          name: "Biaya Layanan Pembayaran (1%)",
        });
      }
      if (discount > 0) {
        snapItems.push({
          id: "DISCOUNT",
          price: -discount,
          quantity: 1,
          name: `Diskon Voucher ${voucherCode || ""}`.trim(),
        });
      }

      const snapRes = await createMidtransSnapTransaction({
        midtransOrderId: orderData.order_code,
        grossAmount: total,
        customerDetails: {
          first_name: fullName,
          email: user.email || "elaparfumid@gmail.com",
          phone: cleanPhone || rawPhone || "081384104147",
        },
        itemDetails: snapItems,
        callbacks: {
          finish: `${baseUrl}/checkout/success?id=${orderData.id}`,
          unfinish: `${baseUrl}/checkout/failed?id=${orderData.id}&reason=unfinish`,
          error: `${baseUrl}/checkout/failed?id=${orderData.id}&reason=error`,
        },
      });

      await supabaseAdmin
        .from("orders")
        .update({
          midtrans_id: snapRes.token,
          midtrans_url: snapRes.redirect_url,
        })
        .eq("id", orderData.id);

      return {
        success: true,
        orderId: orderData.id,
        orderCode: orderData.order_code,
        token: snapRes.token,
        url: snapRes.redirect_url,
      };
    } catch (e: any) {
      console.error("Error creating Midtrans Snap:", e);
      return { error: `Terjadi kesalahan saat memproses pembayaran Midtrans: ${e.message}` };
    }
  } catch (err: any) {
    console.error("Checkout Error:", err);
    return { error: "Terjadi kesalahan sistem internal: " + err.message };
  }
}

export async function processCustomCheckout(
  formData: FormData,
  customRequestId: string,
  subtotal: number
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Harap login terlebih dahulu untuk checkout." };

    const { data: request, error: reqErr } = await supabaseAdmin
      .from("custom_requests")
      .select("*")
      .eq("id", customRequestId)
      .single();

    if (reqErr || !request) return { error: "Data pesanan custom tidak ditemukan." };

    const fullName = ((formData.get("fullName") as string) || request.customer_name || "Pelanggan Ela").trim();
    const rawPhone = ((formData.get("phone") as string) || request.customer_whatsapp || "").trim();
    let cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("62")) {
      cleanPhone = "0" + cleanPhone.substring(2);
    }

    const address = formData.get("address") as string;
    const shippingCostStr = formData.get("shippingCost") as string;
    const courierInfo = formData.get("courierInfo") as string;
    const courierCompany = ((formData.get("courierCompany") as string) || "").trim().toLowerCase();
    const courierServiceCode = ((formData.get("courierServiceCode") as string) || "")
      .trim()
      .toLowerCase();
    const voucherCode = formData.get("voucherCode") as string;
    const paymentMethod = formData.get("paymentMethod") as string;
    const originName = formData.get("originName") as string;
    const destinationAreaId = formData.get("destinationAreaId") as string;
    const destinationLat = (formData.get("destinationLatitude") as string) || "";
    const destinationLng = (formData.get("destinationLongitude") as string) || "";

    const shippingCost = parseInt(shippingCostStr || "0", 10);
    let discount = 0;
    let appliedVoucherId = null;

    if (voucherCode) {
      const vRes = await validateVoucher(voucherCode, subtotal, shippingCost);
      if (vRes.success && vRes.discountAmount) {
        discount = vRes.discountAmount;
        appliedVoucherId = vRes.voucher.id;
      } else {
        return { error: "Voucher tidak valid: " + vRes.error };
      }
    }

    let total = subtotal + shippingCost - discount;
    let serviceFee = 0;
    if (paymentMethod === "QRIS") {
      if (cleanPhone.length < 10) {
        return {
          error:
            "Nomor WhatsApp tidak valid (minimal 10 digit angka). Mohon periksa kembali nomor kontak Anda.",
        };
      }
      serviceFee = Math.floor(total * 0.01);
      total += serviceFee;
    }

    const orderCode = generateOrderCode();

    const { data: existingOrders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("customer_id", user.id)
      .like("notes", `%CustomRequestID: ${customRequestId}%`)
      .neq("status", "paid");

    if (existingOrders && existingOrders.length > 0) {
      const existingIds = existingOrders.map((o) => o.id);
      await supabaseAdmin.from("orders").update({ status: "cancelled" }).in("id", existingIds);
    }

    const storeIdStr = formData.get("storeId") as string;
    const storeId = storeIdStr ? parseInt(storeIdStr, 10) : 2;
    const fulfillmentType = ((formData.get("fulfillmentType") as string) ||
      (courierInfo?.toLowerCase().includes("ambil") ? "pickup" : "delivery")) as
      | "delivery"
      | "pickup";

    let parsedRecipe: any = {};
    try {
      parsedRecipe =
        typeof request.ai_recipe === "string"
          ? JSON.parse(request.ai_recipe)
          : request.ai_recipe || {};
    } catch {}

    const isOwnBottle = parsedRecipe.own_bottle === true;
    if (fulfillmentType === "delivery" && isOwnBottle) {
      return {
        error:
          "Pesanan racikan dengan botol sendiri wajib diambil langsung di toko cabang (tidak dapat dikirim via kurir ekspedisi).",
      };
    }

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_code: orderCode,
        customer_id: user.id,
        customer_name: fullName,
        customer_phone: cleanPhone || rawPhone,
        customer_address: address,
        store_id: storeId,
        fulfillment_type: fulfillmentType,
        subtotal: subtotal,
        discount: discount,
        shipping_cost: shippingCost,
        courier_name: courierInfo,
        total: total,
        status: paymentMethod === "TUNAI" ? "pending_verification" : "pending",
        payment_method:
          paymentMethod === "TUNAI" ? "Bayar Tunai di Toko" : "Midtrans (QRIS / GoPay / VA)",
        notes: `[Custom Refill] ${request.description} | Kurir: ${courierInfo}${courierCompany ? ` | CourierCompany: ${courierCompany}` : ""}${courierServiceCode ? ` | CourierService: ${courierServiceCode}` : ""} | Origin: ${originName} | StoreID: ${storeId} | Fulfillment: ${fulfillmentType} | Dest: ${destinationAreaId} | DestLat: ${destinationLat} | DestLng: ${destinationLng} | Pembayaran: ${paymentMethod}${voucherCode ? ` | Voucher: ${voucherCode}` : ""} | CustomRequestID: ${customRequestId} | MidtransAttemptID: ${orderCode}`,
      })
      .select("id, order_code")
      .single();

    if (orderError) return { error: "Gagal membuat pesanan: " + orderError.message };

    const bibitsList = parsedRecipe.bibits || [];
    const bottleObj = parsedRecipe.bottle || null;
    const ratioStr = parsedRecipe.ratio || "50/50";
    const itemsToInsert = [];

    for (const b of bibitsList) {
      const ratioPercent =
        ratioStr === "100/0" ? 1.0 : ratioStr === "70/30" ? 0.7 : ratioStr === "50/50" ? 0.5 : 0.3;
      const vol = ((bottleObj?.capacity_ml || 0) * ratioPercent) / (bibitsList.length || 1);
      const cost = Math.round(vol * (b.price_per_ml || 0));
      itemsToInsert.push({
        order_id: orderData.id,
        perfume_id: null,
        size_id: null,
        perfume_name: `Bibit: ${b.name}`,
        size_label: `${vol.toFixed(1)}ml`,
        quantity: 1,
        price: cost,
        subtotal: cost,
      });
    }

    if (bottleObj?.capacity_ml && ratioStr !== "100/0") {
      const solventPercent = ratioStr === "30/70" ? 0.7 : ratioStr === "50/50" ? 0.5 : 0.3;
      const solventVol = bottleObj.capacity_ml * solventPercent;
      itemsToInsert.push({
        order_id: orderData.id,
        perfume_id: null,
        size_id: null,
        perfume_name: `Pelarut: Absolute`,
        size_label: `${solventVol.toFixed(1)}ml`,
        quantity: 1,
        price: 0,
        subtotal: 0,
      });
    }

    const botolPrice = isOwnBottle ? 0 : Math.round(bottleObj?.price || request.price_bottle || 0);
    itemsToInsert.push({
      order_id: orderData.id,
      perfume_id: null,
      size_id: null,
      perfume_name: isOwnBottle
        ? `Botol Sendiri`
        : `Botol: ${bottleObj?.name || request.bottle_type || "Botol"}`,
      size_label: `${bottleObj?.capacity_ml || request.volume || 0}ml`,
      quantity: 1,
      price: botolPrice,
      subtotal: botolPrice,
    });

    const itemTotal = itemsToInsert.reduce((sum, it) => sum + it.price, 0);
    const diff = Math.round(subtotal - itemTotal);
    if (diff > 0) {
      itemsToInsert.push({
        order_id: orderData.id,
        perfume_id: null,
        size_id: null,
        perfume_name: `Biaya Layanan (Racikan)`,
        size_label: `-`,
        quantity: 1,
        price: diff,
        subtotal: diff,
      });
    } else if (itemsToInsert.length === 1 && itemsToInsert[0].price === 0) {
      itemsToInsert[0] = {
        order_id: orderData.id,
        perfume_id: null,
        size_id: null,
        perfume_name: `Custom Refill: ${request.base_note || "Pesanan Custom"}`,
        size_label: `${request.volume || 0}ml (${request.bottle_type || "Botol"})`,
        quantity: 1,
        price: subtotal,
        subtotal: subtotal,
      };
    }

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(itemsToInsert);
    if (itemsError) {
      console.error("Gagal menyimpan detail custom pesanan:", itemsError.message);
    }

    await supabaseAdmin
      .from("custom_requests")
      .update({
        status: paymentMethod === "TUNAI" ? "paid" : "quoted",
        total_price: total,
        customer_name: fullName,
        customer_whatsapp: cleanPhone || rawPhone,
      })
      .eq("id", customRequestId);

    if (appliedVoucherId) {
      const { data: v } = await supabaseAdmin
        .from("vouchers")
        .select("used_count")
        .eq("id", appliedVoucherId)
        .single();
      if (v) {
        await supabaseAdmin
          .from("vouchers")
          .update({ used_count: v.used_count + 1 })
          .eq("id", appliedVoucherId);
      }
    }

    if (paymentMethod === "TUNAI") {
      await deductOrderStock(orderData.id, storeId);
      return { url: `/checkout/success?id=${orderData.id}`, success: true, orderId: orderData.id };
    }

    try {
      const baseUrl = await getBaseUrl();
      const snapItems: MidtransSnapItem[] = [
        {
          id: `CUSTOM-${customRequestId}`.slice(0, 50),
          price: Math.round(subtotal),
          quantity: 1,
          name: `Custom Refill (${request.base_note || "Ela Parfum"})`,
        },
      ];
      if (shippingCost > 0) {
        snapItems.push({
          id: "SHIPPING",
          price: shippingCost,
          quantity: 1,
          name: `Ongkir (${courierInfo || "Kurir"})`,
        });
      }
      if (serviceFee > 0) {
        snapItems.push({
          id: "SERVICE-FEE",
          price: serviceFee,
          quantity: 1,
          name: "Biaya Layanan Pembayaran (1%)",
        });
      }
      if (discount > 0) {
        snapItems.push({
          id: "DISCOUNT",
          price: -discount,
          quantity: 1,
          name: `Diskon Voucher ${voucherCode || ""}`.trim(),
        });
      }

      const snapRes = await createMidtransSnapTransaction({
        midtransOrderId: orderData.order_code,
        grossAmount: total,
        customerDetails: {
          first_name: fullName,
          email: user.email || "elaparfumid@gmail.com",
          phone: cleanPhone || rawPhone || "081384104147",
        },
        itemDetails: snapItems,
        callbacks: {
          finish: `${baseUrl}/checkout/success?id=${orderData.id}`,
          unfinish: `${baseUrl}/checkout/failed?id=${orderData.id}&reason=unfinish`,
          error: `${baseUrl}/checkout/failed?id=${orderData.id}&reason=error`,
        },
      });

      await supabaseAdmin
        .from("orders")
        .update({
          midtrans_id: snapRes.token,
          midtrans_url: snapRes.redirect_url,
        })
        .eq("id", orderData.id);

      return {
        success: true,
        orderId: orderData.id,
        orderCode: orderData.order_code,
        token: snapRes.token,
        url: snapRes.redirect_url,
      };
    } catch (e: any) {
      console.error("Error creating Midtrans Snap:", e);
      return { error: `Terjadi kesalahan saat memproses pembayaran: ${e.message}` };
    }
  } catch (err: any) {
    console.error("Custom Checkout Error:", err);
    return { error: "Terjadi kesalahan sistem internal: " + err.message };
  }
}

/**
 * Generates a fresh Midtrans Snap attempt for an existing unpaid/failed order
 * without creating duplicate order records.
 */
export async function retryMidtransPayment(orderId: number) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Harap login terlebih dahulu." };

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .eq("customer_id", user.id)
      .single();

    if (error || !order) return { error: "Pesanan tidak ditemukan." };
    if (order.payment_status === "paid" || order.status === "paid" || order.status === "completed") {
      return { error: "Pesanan ini sudah dibayar.", alreadyPaid: true };
    }

    const baseUrl = await getBaseUrl();
    const attemptSuffix = Date.now().toString().slice(-6);
    const attemptOrderId = `${order.order_code}-A${attemptSuffix}`;

    const snapItems: MidtransSnapItem[] = (order.order_items || []).map((item: any, idx: number) => ({
      id: `ITEM-${idx + 1}`,
      price: Math.round(item.price),
      quantity: Math.max(1, item.quantity || 1),
      name: `${item.perfume_name} (${item.size_label})`,
    }));

    if (order.shipping_cost && order.shipping_cost > 0) {
      snapItems.push({
        id: "SHIPPING",
        price: Math.round(order.shipping_cost),
        quantity: 1,
        name: `Ongkir (${order.courier_name || "Kurir"})`,
      });
    }

    const snapRes = await createMidtransSnapTransaction({
      midtransOrderId: attemptOrderId,
      grossAmount: Math.round(order.total),
      customerDetails: {
        first_name: order.customer_name || "Pelanggan Ela",
        email: user.email || "elaparfumid@gmail.com",
        phone: order.customer_phone || "081384104147",
      },
      itemDetails: snapItems,
      callbacks: {
        finish: `${baseUrl}/checkout/success?id=${order.id}`,
        unfinish: `${baseUrl}/checkout/failed?id=${order.id}&reason=unfinish`,
        error: `${baseUrl}/checkout/failed?id=${order.id}&reason=error`,
      },
    });

    await supabaseAdmin
      .from("orders")
      .update({
        status: "pending",
        payment_status: "unpaid",
        midtrans_id: snapRes.token,
        midtrans_url: snapRes.redirect_url,
        notes: upsertAttemptIdInNotes(order.notes, attemptOrderId),
      })
      .eq("id", order.id);

    return {
      success: true,
      orderId: order.id,
      token: snapRes.token,
      url: snapRes.redirect_url,
    };
  } catch (err: any) {
    console.error("retryMidtransPayment error:", err);
    return { error: err?.message || "Gagal membuat ulang sesi pembayaran." };
  }
}

/**
 * Queries Midtrans Core API status endpoint to reconcile order state server-side.
 */
export async function syncMidtransOrderStatus(orderId: number) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("customer_id", user.id)
      .single();

    if (!order) return { error: "Pesanan tidak ditemukan." };
    if (order.payment_method?.toLowerCase().includes("tunai")) {
      return { success: true, order, transactionStatus: "cash" };
    }

    const attemptId = getLatestMidtransAttemptId(order);
    let statusRes = await getMidtransTransactionStatus(attemptId);
    if (!statusRes && attemptId !== order.order_code) {
      statusRes = await getMidtransTransactionStatus(order.order_code);
    }

    if (!statusRes) {
      return { success: true, order, transactionStatus: "not_attempted" };
    }

    const txStatus = statusRes.transaction_status;
    if (isMidtransPaidStatus(txStatus, statusRes.fraud_status)) {
      await fulfillPaidOrder(order.order_code, {
        paymentMethodLabel: statusRes.payment_type
          ? `Midtrans (${statusRes.payment_type.toUpperCase()})`
          : "Midtrans",
      });
    } else if (isMidtransFailedStatus(txStatus) && order.status === "pending") {
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "rejected" })
        .eq("id", order.id);
    }

    const { data: freshOrder } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    return {
      success: true,
      order: freshOrder || order,
      transactionStatus: txStatus || "pending",
    };
  } catch (err: any) {
    console.error("syncMidtransOrderStatus error:", err);
    return { error: err?.message || "Gagal menyinkronkan status pembayaran." };
  }
}

/**
 * Restores an unpaid order's items back to cart format and cancels the old pending order
 * so the customer can return to /checkout and modify their order cleanly without duplicates.
 */
export async function restoreOrderToCartData(orderId: number) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Harap login terlebih dahulu." };

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .eq("customer_id", user.id)
      .single();

    if (error || !order) return { error: "Pesanan tidak ditemukan." };
    if (order.payment_status === "paid" || order.status === "paid" || order.status === "completed") {
      return { error: "Pesanan sudah dibayar dan tidak dapat dikembalikan ke keranjang." };
    }

    const customMatch = order.notes?.match(/CustomRequestID:\s*([a-f0-9-]+)/i);
    if (customMatch?.[1]) {
      return {
        success: true,
        customRedirectUrl: `/checkout/custom/${customMatch[1]}`,
        items: [] as CartItem[],
      };
    }

    const reconstructedItems: CartItem[] = [];

    // Reconstruct regular items from order_items
    const regularItems = (order.order_items || []).filter(
      (it: any) => it.perfume_id && it.size_id
    );

    if (regularItems.length > 0) {
      const perfumeIds = regularItems.map((it: any) => it.perfume_id);
      const { data: perfumes } = await supabaseAdmin
        .from("perfumes")
        .select("id, name, image_url")
        .in("id", perfumeIds);

      const perfumeMap = new Map((perfumes || []).map((p: any) => [p.id, p]));

      for (const it of regularItems) {
        const p = perfumeMap.get(it.perfume_id);
        reconstructedItems.push({
          id: `regular-${it.size_id}`,
          itemType: "regular",
          perfumeId: it.perfume_id,
          sizeId: it.size_id,
          perfumeName: p?.name || it.perfume_name,
          sizeLabel: it.size_label,
          price: Number(it.price),
          quantity: Number(it.quantity) || 1,
          imageUrl: p?.image_url || "/images/placeholder-perfume.png",
          familyName: "Parfum",
        });
      }
    }

    // Reconstruct refill items if present in notes
    const refillMatch = order.notes?.match(/RefillCartItems:\s*(\[[\s\S]*?\])(?:\s*\||$)/);
    if (refillMatch?.[1]) {
      try {
        const parsedRefills = JSON.parse(refillMatch[1]) as any[];
        for (let idx = 0; idx < parsedRefills.length; idx++) {
          const rf = parsedRefills[idx];
          const matchingOrderItem = (order.order_items || []).find(
            (oi: any) => !oi.perfume_id && oi.perfume_name === rf.customName
          );
          reconstructedItems.push({
            id: `refill-restored-${order.id}-${idx}`,
            itemType: "refill",
            perfumeName: rf.customName || "Racikan Refill Custom",
            sizeLabel: `${rf.volumeMl || 30}ml (${rf.ratio || "50/50"})`,
            price: matchingOrderItem ? Number(matchingOrderItem.price) : Number(order.subtotal),
            quantity: Number(rf.quantity) || 1,
            imageUrl: rf.bottle?.image_url || "/images/placeholder-perfume.png",
            familyName: "Custom Refill",
            refillData: {
              mode: rf.mode || "custom",
              customName: rf.customName,
              volumeMl: rf.volumeMl,
              ratio: rf.ratio,
              useOwnBottle: rf.useOwnBottle,
              bottle: rf.bottle,
              bibits: rf.bibits,
              adminRecipe: rf.adminRecipe,
              technicalRecipe: rf.technicalRecipe,
            },
          });
        }
      } catch (e) {
        console.error("Failed to parse RefillCartItems on restore:", e);
      }
    }

    if (reconstructedItems.length === 0) {
      return {
        error: "Detail item tidak dapat dipulihkan otomatis. Anda dapat melanjutkan bayar dari Riwayat Pesanan.",
      };
    }

    await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);

    return { success: true, items: reconstructedItems };
  } catch (err: any) {
    console.error("restoreOrderToCartData error:", err);
    return { error: err?.message || "Gagal mengembalikan pesanan ke keranjang." };
  }
}

/**
 * Resolves a numeric order ID from a Midtrans order_code (including -Axxxxxx retry suffixes)
 * for the authenticated customer.
 */
export async function resolveOrderIdByCode(midtransOrderCode: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const baseCode = extractBaseOrderCode(midtransOrderCode.trim());
    if (!baseCode) return { error: "Kode pesanan tidak valid." };

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_code", baseCode)
      .eq("customer_id", user.id)
      .single();

    if (!order) return { error: "Pesanan tidak ditemukan." };
    return { success: true, orderId: order.id as number };
  } catch (err: any) {
    return { error: err?.message || "Gagal mencari pesanan." };
  }
}

/**
 * Fetches full order details with order_items for checkout result pages (/checkout/success and /checkout/failed).
 */
export async function getCheckoutOrderDetails(orderId: number) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .eq("customer_id", user.id)
      .single();

    if (error || !order) return { error: "Pesanan tidak ditemukan." };
    return { success: true, order };
  } catch (err: any) {
    return { error: err?.message || "Gagal memuat detail pesanan." };
  }
}
