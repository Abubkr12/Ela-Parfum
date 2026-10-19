"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductOrderStock } from "@/lib/stock/refill-stock";
import QRCode from "qrcode";

export interface PosProductItem {
  id: number;
  name: string;
  slug: string;
  collection: string;
  image_url: string | null;
  sizes: {
    id: number;
    perfume_id: number;
    size_ml: number;
    size_label: string;
    price: number;
    stock: number;
  }[];
}

export interface PosBibitItem {
  id: number;
  name: string;
  slug: string;
  collection: string;
  intensity: string | null;
  main_accord: string | null;
  price_per_ml: number;
  stock_ml: number;
  top_notes?: any;
  middle_notes?: any;
  base_notes?: any;
}

export interface PosBottleItem {
  id: number;
  name: string;
  capacity_ml: number;
  price: number;
  stock: number;
  image_url: string | null;
}

export interface PosInitialData {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    assigned_store_ids: number[];
  };
  stores: {
    id: number;
    name: string;
    address: string | null;
  }[];
  activeStoreId: number;
  products: PosProductItem[];
  bibits: PosBibitItem[];
  bottles: PosBottleItem[];
  recentOrders: any[];
}

export async function getPosInitialData(requestedStoreId?: number): Promise<{ data?: PosInitialData; error?: string }> {
  try {
    const supabaseUser = await createClient(true);
    const { data: { user: authUser } } = await supabaseUser.auth.getUser();

    if (!authUser) {
      return { error: "Sesi kasir tidak valid. Silakan login kembali." };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Ambil data staf dari admin_users
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, full_name, role, assigned_store_ids")
      .eq("id", authUser.id)
      .single();

    if (staffErr || !staff) {
      return { error: "Akun ini tidak memiliki hak akses kasir toko." };
    }

    const assigned = staff.assigned_store_ids && staff.assigned_store_ids.length > 0
      ? staff.assigned_store_ids
      : [1, 2, 3];

    // 2. Ambil seluruh data toko
    const { data: storesData } = await supabaseAdmin
      .from("stores")
      .select("id, name, address")
      .eq("is_active", true)
      .order("id", { ascending: true });

    const availableStores = (storesData || []).filter((s) => assigned.includes(s.id));
    if (availableStores.length === 0) {
      return { error: "Akun Anda belum ditugaskan ke cabang toko manapun." };
    }

    let activeStoreId = requestedStoreId && assigned.includes(requestedStoreId)
      ? requestedStoreId
      : availableStores[0].id;

    // 3. Ambil Katalog Produk Jadi beserta stok di cabang aktif
    const { data: rawPerfumes } = await supabaseAdmin
      .from("perfumes")
      .select(`
        id, name, slug, collection, image_url, is_active,
        sizes:perfume_sizes (
          id, perfume_id, size_ml, size_label, price, is_active,
          product_stocks ( store_id, stock_qty )
        )
      `)
      .eq("is_active", true)
      .order("name", { ascending: true });

    const products: PosProductItem[] = (rawPerfumes || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      collection: p.collection || "Signature",
      image_url: p.image_url,
      sizes: (p.sizes || [])
        .filter((s: any) => s.is_active)
        .map((s: any) => {
          const branchStock = (s.product_stocks || []).find((ps: any) => ps.store_id === activeStoreId);
          return {
            id: s.id,
            perfume_id: s.perfume_id,
            size_ml: s.size_ml,
            size_label: s.size_label,
            price: Number(s.price),
            stock: branchStock ? Number(branchStock.stock_qty || 0) : 0,
          };
        }),
    }));

    // 4. Ambil 740+ Bibit dengan stok ml di cabang aktif
    const { data: rawBibits } = await supabaseAdmin
      .from("bibit")
      .select(`
        id, name, slug, collection, intensity, main_accord, price_per_ml, top_notes, middle_notes, base_notes,
        bibit_stocks!inner ( store_id, stock_ml )
      `)
      .eq("bibit_stocks.store_id", activeStoreId)
      .order("name", { ascending: true });

    const bibits: PosBibitItem[] = (rawBibits || []).map((b: any) => {
      const stockItem = Array.isArray(b.bibit_stocks) ? b.bibit_stocks[0] : b.bibit_stocks;
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        collection: b.collection || "Artisan",
        intensity: b.intensity,
        main_accord: b.main_accord,
        price_per_ml: Number(b.price_per_ml || 1000),
        stock_ml: Number(stockItem?.stock_ml || 0),
        top_notes: b.top_notes,
        middle_notes: b.middle_notes,
        base_notes: b.base_notes,
      };
    });

    // 5. Ambil 19 Botol dengan stok pcs di cabang aktif
    const { data: rawBottles } = await supabaseAdmin
      .from("bottles")
      .select(`
        id, name, capacity_ml, price, image_url, is_active,
        bottle_stocks!inner ( store_id, stock_qty )
      `)
      .eq("is_active", true)
      .eq("bottle_stocks.store_id", activeStoreId)
      .order("capacity_ml", { ascending: true });

    const bottles: PosBottleItem[] = (rawBottles || []).map((bt: any) => {
      const stockItem = Array.isArray(bt.bottle_stocks) ? bt.bottle_stocks[0] : bt.bottle_stocks;
      return {
        id: bt.id,
        name: bt.name,
        capacity_ml: bt.capacity_ml,
        price: Number(bt.price),
        stock: Number(stockItem?.stock_qty || 0),
        image_url: bt.image_url,
      };
    });

    // 6. Ambil 10 pesanan kasir terakhir hari ini untuk shift cabang ini
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: recentOrders } = await supabaseAdmin
      .from("orders")
      .select("id, order_code, customer_name, total, payment_method, payment_status, created_at, cashier_name")
      .eq("store_id", activeStoreId)
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      data: {
        user: {
          id: staff.id,
          email: staff.email,
          full_name: staff.full_name,
          role: staff.role,
          assigned_store_ids: assigned,
        },
        stores: availableStores,
        activeStoreId,
        products,
        bibits,
        bottles,
        recentOrders: recentOrders || [],
      },
    };
  } catch (err: any) {
    console.error("Error in getPosInitialData:", err);
    return { error: err.message || "Gagal memuat data kasir." };
  }
}

// Generate Unique POS Order Code: MW-POS-YYMMDD-XXXX
function generatePosOrderCode(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MW-POS-${dateStr}-${rand}`;
}

export interface PosBillItem {
  type: "product" | "refill" | "bottle";
  title: string;
  subtitle?: string;
  price: number;
  quantity: number;
  subtotal: number;
  meta: {
    // Regular
    perfumeId?: number;
    sizeId?: number;
    sizeLabel?: string;
    // Refill
    bottleId?: number | null;
    bottleName?: string;
    capacityMl?: number;
    useOwnBottle?: boolean;
    ratio?: string;
    bibits?: { id: number; name: string; volumeMl: number; pricePerMl: number }[];
    adminRecipe?: string;
  };
}

export interface PosTransactionPayload {
  storeId: number;
  customerName: string;
  customerPhone?: string;
  items: PosBillItem[];
  subtotal: number;
  discount: number;
  total: number;
  cashierName: string;
}

// 1. Eksekusi Pembayaran TUNAI / CASH atau TRANSFER
export async function completePosCashTransaction(
  payload: PosTransactionPayload & { paymentMethod: "TUNAI" | "TRANSFER"; cashReceived: number; cashChange: number }
) {
  try {
    const supabaseAdmin = createAdminClient();
    const orderCode = generatePosOrderCode();

    // Serialisasi racikan refill dan botol kemasan ke notes
    const refillItems = payload.items.filter((i) => i.type === "refill");
    const bottleItems = payload.items.filter((i) => i.type === "bottle");

    let refillNotes = "";
    if (refillItems.length > 0) {
      const compactRefillData = refillItems.map((it) => ({
        customName: it.title,
        quantity: it.quantity,
        volumeMl: it.meta.capacityMl || 30,
        ratio: it.meta.ratio || "50/50",
        useOwnBottle: it.meta.useOwnBottle || false,
        bottle: it.meta.bottleId ? { id: it.meta.bottleId, name: it.meta.bottleName, capacity_ml: it.meta.capacityMl } : null,
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

    // 1. Insert Order
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
        payment_method: payload.paymentMethod,
        store_id: payload.storeId,
        fulfillment_type: "pickup",
        cashier_name: payload.cashierName,
        cash_received: payload.cashReceived,
        cash_change: payload.cashChange,
        paid_at: new Date().toISOString(),
        payment_verified_at: new Date().toISOString(),
        notes: `Transaksi Kasir Toko Cabang #${payload.storeId} [${payload.paymentMethod}]${refillNotes}${bottleNotes}`,
      })
      .select()
      .single();

    if (orderErr || !order) {
      console.error("Error creating POS order:", orderErr);
      return { error: `Gagal menyimpan transaksi: ${orderErr?.message || "Unknown error"}` };
    }

    // 2. Insert Order Items (Batch)
    const orderItemsToInsert = payload.items.map((item) => ({
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

    // 3. Potong seluruh stok cabang secara terpadu (Produk Jadi, Botol Kemasan, Bibit, Pelarut)
    await deductOrderStock(order.id, payload.storeId);

    return { success: true, orderId: order.id, orderCode: order.order_code, createdAt: order.created_at };
  } catch (err: any) {
    console.error("Error in completePosCashTransaction:", err);
    return { error: err.message || "Gagal memproses transaksi kasir." };
  }
}

// 2. Generate Inline Dynamic QRIS Mayar
export async function createPosQrisOrder(payload: PosTransactionPayload) {
  try {
    const supabaseAdmin = createAdminClient();
    const orderCode = generatePosOrderCode();

    // Serialisasi racikan refill dan botol kemasan ke notes
    const refillItems = payload.items.filter((i) => i.type === "refill");
    const bottleItems = payload.items.filter((i) => i.type === "bottle");

    let refillNotes = "";
    if (refillItems.length > 0) {
      const compactRefillData = refillItems.map((it) => ({
        customName: it.title,
        quantity: it.quantity,
        volumeMl: it.meta.capacityMl || 30,
        ratio: it.meta.ratio || "50/50",
        useOwnBottle: it.meta.useOwnBottle || false,
        bottle: it.meta.bottleId ? { id: it.meta.bottleId, name: it.meta.bottleName, capacity_ml: it.meta.capacityMl } : null,
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

    // 1. Simpan order status 'pending' & 'unpaid'
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
      return { error: `Gagal membuat order: ${orderErr?.message || "Database error"}` };
    }

    // Insert order items (Batch)
    const orderItemsToInsert = payload.items.map((item) => ({
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

    // 2. Request Dynamic QRIS ke Mayar API
    const isSandbox = process.env.MAYAR_IS_SANDBOX === "true";
    const mayarKey = isSandbox ? process.env.MAYAR_SANDBOX_API_KEY : process.env.MAYAR_API_KEY;
    const mayarUrl = isSandbox
      ? "https://api.mayar.io/hl/v1/payment/create"
      : "https://api.mayar.id/hl/v1/payment/create";

    const cleanPhone = (payload.customerPhone || "081234567890").replace(/\D/g, "");
    const validPhone = cleanPhone.length >= 10 ? cleanPhone : "081234567890";

    const mayarBody = {
      name: payload.customerName || "Customer Ela Parfum",
      email: "kasir@elaparfum.com",
      mobile: validPhone,
      description: `POS ${orderCode}`,
      amount: payload.total,
      paymentMethod: "qris",
      items: [
        {
          quantity: 1,
          rate: payload.total,
          description: `Tagihan Kasir Toko: ${orderCode}`,
        },
      ],
    };

    const res = await fetch(mayarUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mayarKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mayarBody),
    });

    const resJson = await res.json();

    if (resJson.statusCode !== 200 && resJson.statusCode !== 201) {
      console.error("Mayar Payment API error:", resJson);
      return {
        error: `Gagal membuat QRIS Mayar: ${resJson.message || resJson.messages || "Unknown error"}`,
      };
    }

    const paymentData = resJson.data;
    const qrString = paymentData?.paymentDetail?.qr_code?.channel_properties?.qr_string || "";
    const expiredAt = paymentData?.expiredAt || new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const mayarLink = paymentData?.link || "";

    // Generate high-resolution Data URL QR Code
    let qrDataUrl = "";
    if (qrString) {
      qrDataUrl = await QRCode.toDataURL(qrString, {
        width: 380,
        margin: 2,
        color: {
          dark: "#0F1110",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      });
    }

    return {
      success: true,
      orderId: order.id,
      orderCode: order.order_code,
      qrString,
      qrDataUrl,
      expiredAt,
      mayarLink,
      amount: payload.total,
    };
  } catch (err: any) {
    console.error("Error in createPosQrisOrder:", err);
    return { error: err.message || "Gagal memproses pembayaran QRIS." };
  }
}

// 3. Polling Status Pembayaran QRIS (Auto-detect)
export async function checkPosOrderStatus(orderId: number, storeId: number) {
  try {
    const supabaseAdmin = createAdminClient();
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, status, payment_status, total, order_code, paid_at")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return { isPaid: false, error: "Pesanan tidak ditemukan" };
    }

    const isPaid = order.payment_status === "paid" || order.status === "paid" || order.status === "completed";

    if (isPaid) {
      // Pastikan stok cabang telah terpotong secara idempotent (Produk Jadi, Botol Kemasan, Bibit, Pelarut)
      await deductOrderStock(order.id, storeId);
      return { isPaid: true, orderCode: order.order_code, paidAt: order.paid_at };
    }

    return { isPaid: false };
  } catch (err: any) {
    return { isPaid: false, error: err.message };
  }
}
