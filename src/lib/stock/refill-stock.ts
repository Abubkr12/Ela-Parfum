import { createAdminClient } from '@/lib/supabase/admin';

export async function deductRefillStock(orderId: number, preferredStoreId?: number) {
  const supabase = createAdminClient();

  try {
    // 1. Idempotency check: pastikan pesanan ini belum pernah memotong stok refill
    const { data: existingLog } = await supabase
      .from('stock_changelog')
      .select('id')
      .eq('order_id', orderId)
      .in('entity_type', ['bibit', 'solvent', 'bottle'])
      .eq('reason', 'sale')
      .limit(1);

    if (existingLog && existingLog.length > 0) {
      console.log(`[deductRefillStock] Order ${orderId} stok refill sudah pernah dipotong. Melewati.`);
      return { success: true, alreadyDeducted: true };
    }

    // 2. Ambil data order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      console.error(`[deductRefillStock] Order ${orderId} tidak ditemukan:`, orderErr?.message);
      return { success: false, error: 'Order not found' };
    }

    // 3. Tentukan store_id (prioritaskan kolom resmi order.store_id)
    let storeId = preferredStoreId || order.store_id;
    if (!storeId) {
      const originMatch = order.notes?.match(/Origin:\s*([^|]+)/);
      if (originMatch && originMatch[1]) {
        const originName = originMatch[1].trim().toLowerCase();
        if (originName.includes('condet')) storeId = 1;
        else if (originName.includes('rawa belong') || originName.includes('rawabelong')) storeId = 2;
        else if (originName.includes('tangerang')) storeId = 3;
      }
    }
    // Default fallback ke cabang 2 (Rawa Belong) jika tidak terdeteksi
    if (!storeId) storeId = 2;

    // Helper: potong stok untuk single recipe item
    const deductSingleRefill = async (
      bibitsList: any[],
      bottleObj: any,
      ratioStr: string,
      isOwnBottle: boolean,
      capacityMl: number,
      quantity: number = 1
    ) => {
      const ratioPercent = ratioStr === '100/0' ? 1.0 : ratioStr === '70/30' ? 0.7 : ratioStr === '50/50' ? 0.5 : 0.3;
      const totalBibitMl = capacityMl * ratioPercent * quantity;
      const mlPerBibit = totalBibitMl / (bibitsList.length || 1);
      const totalSolventMl = ratioStr === '100/0' ? 0 : Math.max(0, (capacityMl - (capacityMl * ratioPercent)) * quantity);

      // Potong bibit
      for (const b of bibitsList) {
        if (!b.id) continue;
        const { data: bibitStock } = await supabase
          .from('bibit_stocks')
          .select('id, stock_ml')
          .eq('bibit_id', b.id)
          .eq('store_id', storeId)
          .single();

        if (bibitStock) {
          const currentMl = Number(bibitStock.stock_ml || 0);
          const newMl = Math.max(0, currentMl - mlPerBibit);

          await supabase
            .from('bibit_stocks')
            .update({ stock_ml: newMl, updated_at: new Date().toISOString() })
            .eq('id', bibitStock.id);

          await supabase.from('stock_changelog').insert({
            entity_type: 'bibit',
            entity_id: bibitStock.id,
            entity_name: b.name || 'Bibit',
            store_id: storeId,
            change_qty: -mlPerBibit,
            new_qty: newMl,
            reason: 'sale',
            order_id: orderId,
            notes: `Refill racikan: ${mlPerBibit.toFixed(1)}ml (${quantity}x)`
          });
        }
      }

      // Potong pelarut (jika rasio bukan 100/0)
      if (totalSolventMl > 0) {
        const { data: solventStock } = await supabase
          .from('solvent_stocks')
          .select('id, stock_ml, solvents (name)')
          .eq('store_id', storeId)
          .limit(1)
          .single();

        if (solventStock) {
          const currentSolvent = Number(solventStock.stock_ml || 0);
          const newSolvent = Math.max(0, currentSolvent - totalSolventMl);

          await supabase
            .from('solvent_stocks')
            .update({ stock_ml: newSolvent, updated_at: new Date().toISOString() })
            .eq('id', solventStock.id);

          await supabase.from('stock_changelog').insert({
            entity_type: 'solvent',
            entity_id: solventStock.id,
            entity_name: (Array.isArray(solventStock.solvents) ? solventStock.solvents[0]?.name : (solventStock.solvents as any)?.name) || 'Pelarut Absolute',
            store_id: storeId,
            change_qty: -totalSolventMl,
            new_qty: newSolvent,
            reason: 'sale',
            order_id: orderId,
            notes: `Pelarut refill: ${totalSolventMl.toFixed(1)}ml`
          });
        }
      }

      // Potong botol kosong (jika bukan bawa botol sendiri)
      if (!isOwnBottle && bottleObj && bottleObj.id) {
        const { data: bottleStock } = await supabase
          .from('bottle_stocks')
          .select('id, stock_qty, bottles (name)')
          .eq('bottle_id', bottleObj.id)
          .eq('store_id', storeId)
          .single();

        if (bottleStock) {
          const currentQty = Number(bottleStock.stock_qty || 0);
          const newQty = Math.max(0, currentQty - quantity);

          await supabase
            .from('bottle_stocks')
            .update({ stock_qty: newQty, updated_at: new Date().toISOString() })
            .eq('id', bottleStock.id);

          // Sync aggregate stock in bottles table
          const { data: allBStocks } = await supabase
            .from('bottle_stocks')
            .select('stock_qty')
            .eq('bottle_id', bottleObj.id);
          const totalBottleQty = (allBStocks || []).reduce((sum: number, s: any) => sum + (s.stock_qty || 0), 0);
          await supabase
            .from('bottles')
            .update({ stock: totalBottleQty, updated_at: new Date().toISOString() })
            .eq('id', bottleObj.id);

          await supabase.from('stock_changelog').insert({
            entity_type: 'bottle',
            entity_id: bottleStock.id,
            entity_name: (Array.isArray(bottleStock.bottles) ? bottleStock.bottles[0]?.name : (bottleStock.bottles as any)?.name) || 'Botol Kosong',
            store_id: storeId,
            change_qty: -quantity,
            new_qty: newQty,
            reason: 'sale',
            order_id: orderId,
            notes: `Botol packaging refill (${quantity}x)`
          });
        }
      }
    };

    // 4A. Check jika ada RefillCartItems di notes (Unified Cart flow)
    const refillCartMatch = order.notes?.match(/RefillCartItems:\s*(\[.+?\])(?:\s*\||$)/);
    if (refillCartMatch && refillCartMatch[1]) {
      try {
        const refillItems: any[] = JSON.parse(refillCartMatch[1]);
        for (const item of refillItems) {
          await deductSingleRefill(
            item.bibits || [],
            item.bottle || null,
            item.ratio || '50/50',
            item.useOwnBottle === true,
            Number(item.volumeMl || 30),
            Number(item.quantity || 1)
          );
        }
        console.log(`[deductRefillStock] Berhasil memotong stok cart refill untuk order ${order.order_code} di Store ${storeId}`);
        return { success: true };
      } catch (parseErr) {
        console.error(`[deductRefillStock] Gagal parse RefillCartItems:`, parseErr);
      }
    }

    // 4B. Check jika ada CustomRequestID di notes (Direct checkout flow)
    const customReqMatch = order.notes?.match(/CustomRequestID:\s*([^|]+)/);
    if (customReqMatch && customReqMatch[1]) {
      const customRequestId = customReqMatch[1].trim();
      const { data: customReq, error: reqErr } = await supabase
        .from('custom_requests')
        .select('*')
        .eq('id', customRequestId)
        .single();

      if (reqErr || !customReq) {
        console.error(`[deductRefillStock] Custom request ${customRequestId} tidak ditemukan:`, reqErr?.message);
        return { success: false, error: 'Custom request not found' };
      }

      let recipe: any = {};
      try {
        recipe = typeof customReq.ai_recipe === 'string' ? JSON.parse(customReq.ai_recipe) : (customReq.ai_recipe || {});
      } catch (e) {
        console.error(`[deductRefillStock] Gagal parse ai_recipe:`, e);
      }

      await deductSingleRefill(
        recipe.bibits || [],
        recipe.bottle || null,
        recipe.ratio || '50/50',
        recipe.own_bottle === true,
        Number(recipe.volume_ml || recipe.capacity_ml || customReq.volume_ml || 30),
        1
      );

      console.log(`[deductRefillStock] Berhasil memotong stok direct custom refill untuk order ${order.order_code} di Store ${storeId}`);
      return { success: true };
    }

    console.log(`[deductRefillStock] Order ${orderId} tidak memiliki item refill.`);
    return { success: true, isRefill: false };
  } catch (err: any) {
    console.error(`[deductRefillStock] Error memotong stok refill:`, err);
    return { success: false, error: err.message };
  }
}
