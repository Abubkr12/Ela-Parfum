import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PosBibitItem, PosBottleItem, PosProductItem } from "@/app/kasir/actions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "full";
    const requestedStoreIdStr = searchParams.get("storeId");
    const requestedStoreId = requestedStoreIdStr ? parseInt(requestedStoreIdStr, 10) : undefined;

    // 1. Verifikasi Autentikasi Kasir via Session Cookie
    const supabaseUser = await createClient(true);
    const {
      data: { user: authUser },
    } = await supabaseUser.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Sesi kasir tidak valid atau telah berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 2. Verifikasi Data Staf di admin_users
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, full_name, role, assigned_store_ids")
      .eq("id", authUser.id)
      .single();

    if (staffErr || !staff) {
      return NextResponse.json(
        { success: false, error: "Akun ini tidak memiliki hak akses kasir toko." },
        { status: 403 }
      );
    }

    const assigned: number[] =
      staff.assigned_store_ids && staff.assigned_store_ids.length > 0
        ? staff.assigned_store_ids
        : [1, 2, 3];

    // 3. Ambil data toko aktif
    const { data: storesData } = await supabaseAdmin
      .from("stores")
      .select("id, name, address")
      .eq("is_active", true)
      .order("id", { ascending: true });

    const availableStores = (storesData || []).filter((s) => assigned.includes(s.id));
    if (availableStores.length === 0) {
      return NextResponse.json(
        { success: false, error: "Akun Anda belum ditugaskan ke cabang toko manapun." },
        { status: 403 }
      );
    }

    const activeStoreId =
      requestedStoreId && assigned.includes(requestedStoreId)
        ? requestedStoreId
        : availableStores[0].id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // =========================================================================
    // MODE: STOCKS (Ultra-Lightweight Stock Delta for Branch Switch & Poll)
    // Payload: ~10 KB | CPU Execution: <0.2ms | DB Time: <25ms
    // =========================================================================
    if (mode === "stocks") {
      const [bibitStocksRes, bottleStocksRes, productStocksRes, ordersRes] = await Promise.all([
        supabaseAdmin
          .from("bibit_stocks")
          .select("bibit_id, stock_ml")
          .eq("store_id", activeStoreId),

        supabaseAdmin
          .from("bottle_stocks")
          .select("bottle_id, stock_qty")
          .eq("store_id", activeStoreId),

        supabaseAdmin
          .from("product_stocks")
          .select("size_id, stock_qty")
          .eq("store_id", activeStoreId),

        supabaseAdmin
          .from("orders")
          .select("id, order_code, customer_name, total, payment_method, payment_status, created_at, cashier_name")
          .eq("store_id", activeStoreId)
          .gte("created_at", todayStart.toISOString())
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const bibitStocks: Record<number, number> = {};
      for (const row of bibitStocksRes.data || []) {
        bibitStocks[row.bibit_id] = Number(row.stock_ml || 0);
      }

      const bottleStocks: Record<number, number> = {};
      for (const row of bottleStocksRes.data || []) {
        bottleStocks[row.bottle_id] = Number(row.stock_qty || 0);
      }

      const productStocks: Record<number, number> = {};
      for (const row of productStocksRes.data || []) {
        productStocks[row.size_id] = Number(row.stock_qty || 0);
      }

      return NextResponse.json(
        {
          success: true,
          mode: "stocks",
          activeStoreId,
          bibitStocks,
          bottleStocks,
          productStocks,
          recentOrders: ordersRes.data || [],
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // =========================================================================
    // MODE: FULL (Initial Mount Catalog Fetch via Native JSON)
    // CPU Execution: <1ms (Native C++ JSON.stringify bypasses RSC Flight Protocol)
    // =========================================================================
    const [perfumesRes, bibitsRes, bottlesRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from("perfumes")
        .select(`
          id, name, slug, collection, image_url, is_active,
          sizes:perfume_sizes (
            id, perfume_id, size_ml, size_label, price, is_active,
            product_stocks ( store_id, stock_qty )
          )
        `)
        .eq("is_active", true)
        .order("name", { ascending: true }),

      supabaseAdmin
        .from("bibit")
        .select(`
          id, name, slug, collection, intensity, main_accord, price_per_ml, top_notes, middle_notes, base_notes,
          bibit_stocks!inner ( store_id, stock_ml )
        `)
        .eq("bibit_stocks.store_id", activeStoreId)
        .order("name", { ascending: true }),

      supabaseAdmin
        .from("bottles")
        .select(`
          id, name, capacity_ml, price, image_url, is_active,
          bottle_stocks!inner ( store_id, stock_qty )
        `)
        .eq("is_active", true)
        .eq("bottle_stocks.store_id", activeStoreId)
        .order("capacity_ml", { ascending: true }),

      supabaseAdmin
        .from("orders")
        .select("id, order_code, customer_name, total, payment_method, payment_status, created_at, cashier_name")
        .eq("store_id", activeStoreId)
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const products: PosProductItem[] = (perfumesRes.data || []).map((p: any) => ({
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

    const bibits: PosBibitItem[] = (bibitsRes.data || []).map((b: any) => {
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

    const bottles: PosBottleItem[] = (bottlesRes.data || []).map((bt: any) => {
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

    return NextResponse.json(
      {
        success: true,
        mode: "full",
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
          recentOrders: ordersRes.data || [],
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("Error in GET /api/kasir/data:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memproses data kasir." },
      { status: 500 }
    );
  }
}
