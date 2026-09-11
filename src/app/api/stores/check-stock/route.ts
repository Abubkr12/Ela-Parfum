import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ELA_STORES } from "@/lib/stores";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // 1. Cek stok untuk keranjang produk reguler
    if (body.type === "regular" && Array.isArray(body.items)) {
      const items: { sizeId: number; quantity: number; name?: string }[] = body.items;
      const sizeIds = items.map((it) => it.sizeId);

      const { data: stocks, error } = await supabase
        .from("product_stocks")
        .select("store_id, perfume_size_id, stock_qty")
        .in("perfume_size_id", sizeIds);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const storeStatuses = ELA_STORES.map((store) => {
        const outOfStockItems: string[] = [];

        for (const item of items) {
          const matching = (stocks || []).find(
            (s) => s.store_id === store.id && s.perfume_size_id === item.sizeId
          );
          const currentQty = matching?.stock_qty || 0;

          if (currentQty < item.quantity) {
            outOfStockItems.push(
              `${item.name || "Produk"} (Tersisa: ${currentQty}, Dibutuhkan: ${item.quantity})`
            );
          }
        }

        return {
          storeId: store.id,
          name: store.name,
          shortName: store.shortName,
          address: store.address,
          isAvailable: outOfStockItems.length === 0,
          outOfStockItems,
        };
      });

      return NextResponse.json({ stores: storeStatuses });
    }

    // 2. Cek stok untuk pesanan custom refill
    if (body.type === "custom" && body.customRequestId) {
      const { data: customReq, error: reqErr } = await supabase
        .from("custom_requests")
        .select("*")
        .eq("id", body.customRequestId)
        .single();

      if (reqErr || !customReq) {
        return NextResponse.json({ error: "Custom request tidak ditemukan" }, { status: 404 });
      }

      let recipe: any = {};
      try {
        recipe = typeof customReq.ai_recipe === "string" ? JSON.parse(customReq.ai_recipe) : customReq.ai_recipe || {};
      } catch {}

      const bibitsList: any[] = recipe.bibits || [];
      const bottleObj = recipe.bottle || null;
      const ratioStr: string = recipe.ratio || "50/50";
      const isOwnBottle: boolean = recipe.own_bottle === true;
      const capacityMl: number = Number(recipe.volume_ml || recipe.capacity_ml || customReq.volume_ml || 30);

      const ratioPercent = ratioStr === "100/0" ? 1.0 : ratioStr === "70/30" ? 0.7 : ratioStr === "50/50" ? 0.5 : 0.3;
      const totalBibitMl = capacityMl * ratioPercent;
      const mlPerBibit = totalBibitMl / (bibitsList.length || 1);

      const bibitIds = bibitsList.map((b) => b.id).filter(Boolean);

      const { data: bibitStocks } = await supabase
        .from("bibit_stocks")
        .select("store_id, bibit_id, stock_ml")
        .in("bibit_id", bibitIds);

      let bottleStocks: any[] = [];
      if (bottleObj?.id && !isOwnBottle) {
        const { data: bStocks } = await supabase
          .from("bottle_stocks")
          .select("store_id, bottle_id, stock_qty")
          .eq("bottle_id", bottleObj.id);
        bottleStocks = bStocks || [];
      }

      const storeStatuses = ELA_STORES.map((store) => {
        const outOfStockItems: string[] = [];

        // Cek stok bibit
        for (const b of bibitsList) {
          const matching = (bibitStocks || []).find(
            (bs) => bs.store_id === store.id && bs.bibit_id === b.id
          );
          const currentMl = Number(matching?.stock_ml || 0);
          if (currentMl < mlPerBibit) {
            outOfStockItems.push(
              `Bibit ${b.name || "Bibit"} (Tersisa: ${currentMl.toFixed(1)} ml, Dibutuhkan: ${mlPerBibit.toFixed(1)} ml)`
            );
          }
        }

        // Cek stok botol
        if (bottleObj?.id && !isOwnBottle) {
          const matchingBottle = bottleStocks.find(
            (bs) => bs.store_id === store.id && bs.bottle_id === bottleObj.id
          );
          const currentBottleQty = matchingBottle?.stock_qty || 0;
          if (currentBottleQty < 1) {
            outOfStockItems.push(`Botol ${bottleObj.name || "Kemasan"} (Stok botol habis)`);
          }
        }

        return {
          storeId: store.id,
          name: store.name,
          shortName: store.shortName,
          address: store.address,
          isAvailable: outOfStockItems.length === 0,
          outOfStockItems,
        };
      });

      return NextResponse.json({ stores: storeStatuses });
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  } catch (err: any) {
    console.error("Error in check-stock route:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
