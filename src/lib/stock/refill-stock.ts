import { createAdminClient } from '@/lib/supabase/admin';

export async function deductRefillStock(orderId: number, preferredStoreId?: number) {
  const supabase = createAdminClient();

  try {
    // 1. Idempotency check: pastikan pesanan ini belum pernah memotong stok
    const { data: existingLog } = await supabase
      .from('stock_changelog')
      .select('id')
      .eq('order_id', orderId)
      .eq('reason', 'sale')
      .limit(1);

    if (existingLog && existingLog.length > 0) {
      console.log(`[deductRefillStock] Order ${orderId} stok sudah pernah dipotong. Melewati.`);
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

    // 3. Tentukan store_id
    let storeId = preferredStoreId;
    if (!storeId) {
      const originMatch = order.notes?.match(/Origin:\s*([^|]+)/);
      if (originMatch && originMatch[1]) {
        const originName = originMatch[1].trim().toLowerCase();
        if (originName.includes('condet')) storeId = 1;
        else if (originName.includes('rawa belong') || originName.includes('rawabelong')) storeId = 2;
        else if (originName.includes('tangerang')) storeId = 3;
      }
    }
    // Default fallback ke cabang 1 (Condet) jika tidak terdeteksi
    if (!storeId) storeId = 1;

    // 4. Cari custom request ID dari notes
    const customReqMatch = order.notes?.match(/CustomRequestID:\s*([^|]+)/);
    if (!customReqMatch || !customReqMatch[1]) {
      console.log(`[deductRefillStock] Order ${orderId} bukan custom refill.`);
      return { success: true, isCustomRefill: false };
    }

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

    // 5. Parse ai_recipe
    let recipe: any = {};
    try {
      recipe = typeof customReq.ai_recipe === 'string' ? JSON.parse(customReq.ai_recipe) : (customReq.ai_recipe || {});
    } catch (e) {
      console.error(`[deductRefillStock] Gagal parse ai_recipe:`, e);
    }

    const bibitsList: any[] = recipe.bibits || [];
    const bottleObj = recipe.bottle || null;
    const ratioStr: string = recipe.ratio || '50/50';
    const isOwnBottle: boolean = recipe.own_bottle === true;
    const capacityMl: number = Number(recipe.volume_ml || recipe.capacity_ml || customReq.volume_ml || 30);

    const ratioPercent = ratioStr === '100/0' ? 1.0 : ratioStr === '70/30' ? 0.7 : ratioStr === '50/50' ? 0.5 : 0.3;
    const totalBibitMl = capacityMl * ratioPercent;
    const mlPerBibit = totalBibitMl / (bibitsList.length || 1);
    const totalSolventMl = ratioStr === '100/0' ? 0 : Math.max(0, capacityMl - totalBibitMl);

    // 6. Potong stok bibit
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
          notes: `Refill racikan: ${mlPerBibit.toFixed(1)}ml`
        });
      }
    }

    // 7. Potong stok pelarut (jika rasio bukan 100/0)
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

    // 8. Potong stok botol kosong (jika bukan bawa botol sendiri)
    if (!isOwnBottle && bottleObj && bottleObj.id) {
      const { data: bottleStock } = await supabase
        .from('bottle_stocks')
        .select('id, stock_qty, bottles (name)')
        .eq('bottle_id', bottleObj.id)
        .eq('store_id', storeId)
        .single();

      if (bottleStock) {
        const currentQty = Number(bottleStock.stock_qty || 0);
        const newQty = Math.max(0, currentQty - 1);

        await supabase
          .from('bottle_stocks')
          .update({ stock_qty: newQty, updated_at: new Date().toISOString() })
          .eq('id', bottleStock.id);

        await supabase.from('stock_changelog').insert({
          entity_type: 'bottle',
          entity_id: bottleStock.id,
          entity_name: (Array.isArray(bottleStock.bottles) ? bottleStock.bottles[0]?.name : (bottleStock.bottles as any)?.name) || 'Botol Kosong',
          store_id: storeId,
          change_qty: -1,
          new_qty: newQty,
          reason: 'sale',
          order_id: orderId,
          notes: `Botol packaging refill`
        });
      }
    }

    console.log(`[deductRefillStock] Berhasil memotong stok refill untuk order ${order.order_code} di Store ${storeId}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[deductRefillStock] Error memotong stok refill:`, err);
    return { success: false, error: err.message };
  }
}
