import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ELA_STORES } from "@/lib/stores";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // 1. Cek stok untuk keranjang produk (reguler & refill)
    if (body.type === "regular" && Array.isArray(body.items)) {
      const items: any[] = body.items;
      const regularItems = items.filter((it) => it.sizeId);
      const refillItems = items.filter((it) => it.itemType === "refill" && it.refillData);

      let stocks: any[] = [];
      if (regularItems.length > 0) {
        const sizeIds = regularItems.map((it) => it.sizeId);
        const { data: pStocks, error } = await supabase
          .from("product_stocks")
          .select("store_id, perfume_size_id, stock_qty")
          .in("perfume_size_id", sizeIds);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        stocks = pStocks || [];
      }

      // Collect all bibitIds and bottleIds needed for refill items
      const allBibitIds = new Set<number>();
      const allBottleIds = new Set<number>();
      for (const rf of refillItems) {
        if (rf.refillData?.bibits) {
          rf.refillData.bibits.forEach((b: any) => {
            if (b.id) allBibitIds.add(b.id);
          });
        }
        if (!rf.refillData?.useOwnBottle && rf.refillData?.bottle?.id) {
          allBottleIds.add(rf.refillData.bottle.id);
        }
      }

      let bibitStocks: any[] = [];
      if (allBibitIds.size > 0) {
        const { data: bStocks } = await supabase
          .from("bibit_stocks")
          .select("store_id, bibit_id, stock_ml")
          .in("bibit_id", Array.from(allBibitIds));
        bibitStocks = bStocks || [];
      }

      let bottleStocks: any[] = [];
      if (allBottleIds.size > 0) {
        const { data: botStocks } = await supabase
          .from("bottle_stocks")
          .select("store_id, bottle_id, stock_qty")
          .in("bottle_id", Array.from(allBottleIds));
        bottleStocks = botStocks || [];
      }

      const storeStatuses = ELA_STORES.map((store) => {
        const outOfStockItems: string[] = [];

        // Check regular items
        for (const item of regularItems) {
          const matching = stocks.find(
            (s) => s.store_id === store.id && s.perfume_size_id === item.sizeId
          );
          const currentQty = matching?.stock_qty || 0;

          if (currentQty < item.quantity) {
            outOfStockItems.push(
              `${item.name || "Produk"} (Tersisa: ${currentQty}, Dibutuhkan: ${item.quantity})`
            );
          }
        }

        // Check refill items
        for (const rf of refillItems) {
          const data = rf.refillData;
          const qty = rf.quantity || 1;
          const ratioStr = data.ratio || "50/50";
          const ratioPercent = ratioStr === "100/0" ? 1.0 : ratioStr === "70/30" ? 0.7 : ratioStr === "50/50" ? 0.5 : 0.3;
          const capacityMl = Number(data.volumeMl || 30);
          const totalBibitMl = capacityMl * ratioPercent * qty;
          const mlPerBibit = totalBibitMl / ((data.bibits && data.bibits.length) || 1);

          if (data.bibits) {
            for (const b of data.bibits) {
              const bMatch = bibitStocks.find(
                (bs) => bs.store_id === store.id && bs.bibit_id === b.id
              );
              const curMl = bMatch?.stock_ml || 0;
              if (curMl < mlPerBibit) {
                outOfStockItems.push(
                  `Bibit ${b.name || "Bibit"} (Tersisa: ${curMl.toFixed(1)}ml, Dibutuhkan: ${mlPerBibit.toFixed(1)}ml)`
                );
              }
            }
          }

          if (!data.useOwnBottle && data.bottle?.id) {
            const botMatch = bottleStocks.find(
              (bts) => bts.store_id === store.id && bts.bottle_id === data.bottle.id
            );
            const curQty = botMatch?.stock_qty || 0;
            if (curQty < qty) {
              outOfStockItems.push(
                `Botol ${data.bottle.name || "Botol"} (Tersisa: ${curQty}, Dibutuhkan: ${qty})`
              );
            }
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
