import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Mutex in-flight deduction map untuk mencegah eksekusi paralel pada order_id yang sama
 * di level runtime Node.js instance (menghilangkan potensi race-condition antara Webhook Mayar dan Polling Kasir).
 */
const inFlightDeductions = new Map<number, Promise<{ success: boolean; error?: string }>>();

/**
 * Helper ekstraksi JSON array aman dengan balanced bracket parsing.
 * Kebal terhadap delimiter pipe `|` atau bracket dalam teks nama (cth: "Mix [Special]").
 */
function extractJsonArrayFromNotes(notes: string | null | undefined, tag: string): any[] | null {
  if (!notes) return null;
  const marker = `${tag}:`;
  const idx = notes.indexOf(marker);
  if (idx === -1) return null;

  const startBracket = notes.indexOf('[', idx + marker.length);
  if (startBracket === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startBracket; i < notes.length; i++) {
    const char = notes[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '[') depth++;
      else if (char === ']') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(notes.substring(startBracket, i + 1));
          } catch (e) {
            console.error(`[extractJsonArrayFromNotes] Error parsing ${tag}:`, e);
            return null;
          }
        }
      }
    }
  }

  // Fallback regex jika balanced parser tidak mencapai depth 0
  const match = notes.substring(idx).match(new RegExp(`${tag}:\\s*(\\[.+?\\])(?:\\s*\\||$)`));
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Engine Pemotongan Stok Terpadu Multi-Cabang Ela Parfum (Condet = 1, Rawa Belong = 2, Tangerang = 3)
 * Mencakup 4 Entitas:
 * 1. Produk Jadi (product_stocks + sinkronisasi agregat perfume_sizes.stock)
 * 2. Botol Kemasan (bottle_stocks + sinkronisasi agregat bottles.stock)
 * 3. Bibit Racik (bibit_stocks.stock_ml presisi per mililiter)
 * 4. Pelarut (solvent_stocks.stock_ml presisi per mililiter)
 * 
 * Fitur:
 * - Agregasi entitas menyeluruh sebelum pemotongan (mencegah bug item berganda dalam 1 order)
 * - Proteksi idempotensi berlapis berbasis `stock_changelog`
 * - In-flight concurrency lock untuk mencegah race condition antar-channel
 */
async function _executeDeductOrderStock(orderId: number, preferredStoreId?: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  try {
    // 1. Ambil data pesanan
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      console.error(`[deductOrderStock] Order ${orderId} tidak ditemukan:`, orderErr?.message);
      return { success: false, error: 'Order not found' };
    }

    // 2. Tentukan store_id (prioritaskan preferredStoreId, order.store_id, StoreID di notes, lalu Origin di notes)
    let storeId = preferredStoreId || order.store_id;
    if (!storeId && order.notes) {
      const storeIdMatch = order.notes.match(/StoreID:\s*(\d+)/i);
      if (storeIdMatch && storeIdMatch[1]) {
        storeId = parseInt(storeIdMatch[1], 10);
      }
    }
    if (!storeId && order.notes) {
      const originMatch = order.notes.match(/Origin:\s*([^|]+)/i);
      if (originMatch && originMatch[1]) {
        const originName = originMatch[1].trim().toLowerCase();
        if (originName.includes('condet')) storeId = 1;
        else if (originName.includes('rawa belong') || originName.includes('rawabelong')) storeId = 2;
        else if (originName.includes('tangerang')) storeId = 3;
      }
    }
    // Default fallback ke cabang 2 (Rawa Belong) jika tidak terdeteksi
    if (!storeId) storeId = 2;

    // 3. Cek entitas yang sudah pernah dipotong di changelog untuk order ini (Idempotency Guard)
    const { data: existingLogs } = await supabase
      .from('stock_changelog')
      .select('entity_type, entity_id')
      .eq('order_id', orderId)
      .eq('reason', 'sale');

    const alreadyDeducted = new Set<string>(
      (existingLogs || []).map((l: any) => `${l.entity_type}:${l.entity_id}`)
    );

    // ==========================================
    // AGREGASI SELURUH KEBUTUHAN STOK UNTUK ORDER INI
    // ==========================================

    // A. Agregasi Produk Jadi (dari order_items dengan size_id)
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    interface ProductItemAgg {
      sizeId: number;
      perfumeName: string;
      sizeLabel: string;
      totalQty: number;
    }
    const productMap = new Map<number, ProductItemAgg>();

    for (const item of (orderItems || [])) {
      if (item.size_id) {
        const existing = productMap.get(item.size_id);
        const qty = Number(item.quantity || 1);
        if (existing) {
          existing.totalQty += qty;
        } else {
          productMap.set(item.size_id, {
            sizeId: item.size_id,
            perfumeName: item.perfume_name || 'Parfum',
            sizeLabel: item.size_label || '',
            totalQty: qty,
          });
        }
      }
    }

    // B. Agregasi Botol Kemasan Mandiri (PosBottleItems)
    interface BottleItemAgg {
      bottleId: number;
      bottleName: string;
      totalQty: number;
    }
    const bottleMap = new Map<number, BottleItemAgg>();

    const posBottleItems = extractJsonArrayFromNotes(order.notes, 'PosBottleItems');
    if (posBottleItems && Array.isArray(posBottleItems)) {
      for (const bItem of posBottleItems) {
        const bottleId = bItem.bottleId || bItem.id;
        if (!bottleId) continue;
        const qty = Number(bItem.quantity || 1);
        const existing = bottleMap.get(bottleId);
        if (existing) {
          existing.totalQty += qty;
        } else {
          bottleMap.set(bottleId, {
            bottleId,
            bottleName: bItem.name || 'Botol Kemasan',
            totalQty: qty,
          });
        }
      }
    }

    // C. Agregasi Refill Racikan (Bibit, Pelarut, Botol Kemasan)
    interface BibitItemAgg {
      bibitId: number;
      bibitName: string;
      totalMl: number;
    }
    const bibitMap = new Map<number, BibitItemAgg>();
    let totalOrderSolventMl = 0;
    let solventRefillCount = 0;

    const processRefillItem = (
      bibitsList: any[],
      bottleObj: any,
      ratioStr: string,
      isOwnBottle: boolean,
      capacityMl: number,
      quantity: number = 1
    ) => {
      // Perhitungan persentase rasio bibit secara dinamis & presisi
      let ratioPercent = 0.5;
      if (ratioStr) {
        const r = ratioStr.toLowerCase();
        if (r.includes('100/0') || r.includes('murni') || r.includes('elixir')) ratioPercent = 1.0;
        else if (r.includes('70/30') || r.includes('extrait')) ratioPercent = 0.7;
        else if (r.includes('50/50') || r.includes('edp')) ratioPercent = 0.5;
        else if (r.includes('30/70') || r.includes('edt')) ratioPercent = 0.3;
        else {
          const match = r.match(/(\d+)%/);
          if (match) ratioPercent = Number(match[1]) / 100;
        }
      }

      // 1. Akumulasi Bibit
      let calculatedTotalBibitMl = 0;
      for (const b of bibitsList) {
        if (!b.id) continue;
        let mlPerBibitUnit = 0;
        if (b.volumeMl && !isNaN(Number(b.volumeMl)) && Number(b.volumeMl) > 0) {
          mlPerBibitUnit = Number(b.volumeMl);
        } else if (b.volume_ml && !isNaN(Number(b.volume_ml)) && Number(b.volume_ml) > 0) {
          mlPerBibitUnit = Number(b.volume_ml);
        } else {
          const totalBibitInBottle = capacityMl * ratioPercent;
          mlPerBibitUnit = totalBibitInBottle / (bibitsList.length || 1);
        }

        const totalMlToDeduct = parseFloat((mlPerBibitUnit * quantity).toFixed(2));
        calculatedTotalBibitMl += totalMlToDeduct;

        const existingBibit = bibitMap.get(b.id);
        if (existingBibit) {
          existingBibit.totalMl += totalMlToDeduct;
        } else {
          bibitMap.set(b.id, {
            bibitId: b.id,
            bibitName: b.name || 'Bibit Racik',
            totalMl: totalMlToDeduct,
          });
        }
      }

      // 2. Akumulasi Pelarut (jika rasio bukan 100/0 murni)
      if (ratioPercent < 1.0) {
        const totalSolventMlPerUnit = Math.max(0, capacityMl - (calculatedTotalBibitMl / quantity));
        const totalSolventMl = parseFloat((totalSolventMlPerUnit * quantity).toFixed(2));
        if (totalSolventMl > 0) {
          totalOrderSolventMl += totalSolventMl;
          solventRefillCount += quantity;
        }
      }

      // 3. Akumulasi Botol Packaging Refill (jika tidak bawa botol sendiri)
      if (!isOwnBottle && bottleObj && bottleObj.id) {
        const bottleId = bottleObj.id;
        const existingBottle = bottleMap.get(bottleId);
        if (existingBottle) {
          existingBottle.totalQty += quantity;
        } else {
          bottleMap.set(bottleId, {
            bottleId,
            bottleName: bottleObj.name || 'Botol Packaging',
            totalQty: quantity,
          });
        }
      }
    };

    // Parse RefillCartItems atau PosRefillItems dari notes
    const refillItems = extractJsonArrayFromNotes(order.notes, 'RefillCartItems') ||
                        extractJsonArrayFromNotes(order.notes, 'PosRefillItems');
    if (refillItems && Array.isArray(refillItems)) {
      for (const item of refillItems) {
        processRefillItem(
          item.bibits || [],
          item.bottle || null,
          item.ratio || '50/50',
          item.useOwnBottle === true,
          Number(item.volumeMl || item.capacityMl || 30),
          Number(item.quantity || 1)
        );
      }
    }

    // Parse CustomRequestID jika ada (alur custom wizard)
    const customReqMatch = order.notes?.match(/CustomRequestID:\s*([^|]+)/i);
    if (customReqMatch && customReqMatch[1]) {
      const customRequestId = customReqMatch[1].trim();
      const { data: customReq } = await supabase
        .from('custom_requests')
        .select('*')
        .eq('id', customRequestId)
        .single();

      if (customReq) {
        let recipe: any = {};
        try {
          recipe = typeof customReq.ai_recipe === 'string' ? JSON.parse(customReq.ai_recipe) : (customReq.ai_recipe || {});
        } catch (e) {}

        processRefillItem(
          recipe.bibits || [],
          recipe.bottle || null,
          recipe.ratio || '50/50',
          recipe.own_bottle === true,
          Number(recipe.volume_ml || recipe.capacity_ml || customReq.volume_ml || 30),
          1
        );
      }
    }

    // ==========================================
    // EKSEKUSI PEMOTONGAN STOK DENGAN IDEMPOTENCY GUARD
    // ==========================================

    // 1. Potong Stok Produk Jadi
    for (const prod of productMap.values()) {
      const { data: pStock } = await supabase
        .from('product_stocks')
        .select('id, stock_qty')
        .eq('perfume_size_id', prod.sizeId)
        .eq('store_id', storeId)
        .maybeSingle();

      if (pStock && !alreadyDeducted.has(`product:${pStock.id}`)) {
        const currentQty = Number(pStock.stock_qty || 0);
        const newQty = Math.max(0, currentQty - prod.totalQty);

        await supabase
          .from('product_stocks')
          .update({ stock_qty: newQty, updated_at: new Date().toISOString() })
          .eq('id', pStock.id);

        // Sinkronkan agregat di perfume_sizes.stock
        const { data: allPStocks } = await supabase
          .from('product_stocks')
          .select('stock_qty')
          .eq('perfume_size_id', prod.sizeId);
        const totalPQty = (allPStocks || []).reduce((sum: number, s: any) => sum + Number(s.stock_qty || 0), 0);
        await supabase
          .from('perfume_sizes')
          .update({ stock: totalPQty, updated_at: new Date().toISOString() })
          .eq('id', prod.sizeId);

        await supabase.from('stock_changelog').insert({
          entity_type: 'product',
          entity_id: pStock.id,
          entity_name: `${prod.perfumeName} - ${prod.sizeLabel || ''}`,
          store_id: storeId,
          change_qty: -prod.totalQty,
          new_qty: newQty,
          reason: 'sale',
          order_id: orderId,
          notes: `Penjualan produk jadi (${prod.totalQty} pcs)`
        });
        alreadyDeducted.add(`product:${pStock.id}`);
      }
    }

    // 2. Potong Stok Botol Kemasan (Mandiri + Refill Packaging)
    for (const bData of bottleMap.values()) {
      const { data: bStock } = await supabase
        .from('bottle_stocks')
        .select('id, stock_qty, bottles (name)')
        .eq('bottle_id', bData.bottleId)
        .eq('store_id', storeId)
        .maybeSingle();

      if (bStock && !alreadyDeducted.has(`bottle:${bStock.id}`)) {
        const currentQty = Number(bStock.stock_qty || 0);
        const newQty = Math.max(0, currentQty - bData.totalQty);

        await supabase
          .from('bottle_stocks')
          .update({ stock_qty: newQty, updated_at: new Date().toISOString() })
          .eq('id', bStock.id);

        // Sinkronkan agregat di tabel bottles
        const { data: allBStocks } = await supabase
          .from('bottle_stocks')
          .select('stock_qty')
          .eq('bottle_id', bData.bottleId);
        const totalBQty = (allBStocks || []).reduce((sum: number, s: any) => sum + Number(s.stock_qty || 0), 0);
        await supabase
          .from('bottles')
          .update({ stock: totalBQty, updated_at: new Date().toISOString() })
          .eq('id', bData.bottleId);

        const bottleName = (Array.isArray(bStock.bottles) ? bStock.bottles[0]?.name : (bStock.bottles as any)?.name) || bData.bottleName || 'Botol Kemasan';
        await supabase.from('stock_changelog').insert({
          entity_type: 'bottle',
          entity_id: bStock.id,
          entity_name: bottleName,
          store_id: storeId,
          change_qty: -bData.totalQty,
          new_qty: newQty,
          reason: 'sale',
          order_id: orderId,
          notes: `Penjualan botol kemasan (${bData.totalQty} pcs)`
        });
        alreadyDeducted.add(`bottle:${bStock.id}`);
      }
    }

    // 3. Potong Stok Bibit Racik
    for (const bData of bibitMap.values()) {
      const { data: bibitStock } = await supabase
        .from('bibit_stocks')
        .select('id, stock_ml')
        .eq('bibit_id', bData.bibitId)
        .eq('store_id', storeId)
        .maybeSingle();

      if (bibitStock && !alreadyDeducted.has(`bibit:${bibitStock.id}`)) {
        const currentMl = Number(bibitStock.stock_ml || 0);
        const deductMl = parseFloat(bData.totalMl.toFixed(2));
        const newMl = Math.max(0, parseFloat((currentMl - deductMl).toFixed(2)));

        await supabase
          .from('bibit_stocks')
          .update({ stock_ml: newMl, updated_at: new Date().toISOString() })
          .eq('id', bibitStock.id);

        await supabase.from('stock_changelog').insert({
          entity_type: 'bibit',
          entity_id: bibitStock.id,
          entity_name: bData.bibitName || 'Bibit Racik',
          store_id: storeId,
          change_qty: -deductMl,
          new_qty: newMl,
          reason: 'sale',
          order_id: orderId,
          notes: `Refill racikan: ${deductMl.toFixed(1)}ml`
        });
        alreadyDeducted.add(`bibit:${bibitStock.id}`);
      }
    }

    // 4. Potong Stok Pelarut
    if (totalOrderSolventMl > 0) {
      const { data: solventStock } = await supabase
        .from('solvent_stocks')
        .select('id, stock_ml, solvents (name)')
        .eq('store_id', storeId)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (solventStock && !alreadyDeducted.has(`solvent:${solventStock.id}`)) {
        const currentSolvent = Number(solventStock.stock_ml || 0);
        const deductSolvent = parseFloat(totalOrderSolventMl.toFixed(2));
        const newSolvent = Math.max(0, parseFloat((currentSolvent - deductSolvent).toFixed(2)));

        await supabase
          .from('solvent_stocks')
          .update({ stock_ml: newSolvent, updated_at: new Date().toISOString() })
          .eq('id', solventStock.id);

        const solventName = (Array.isArray(solventStock.solvents) ? solventStock.solvents[0]?.name : (solventStock.solvents as any)?.name) || 'Pelarut Absolute';
        await supabase.from('stock_changelog').insert({
          entity_type: 'solvent',
          entity_id: solventStock.id,
          entity_name: solventName,
          store_id: storeId,
          change_qty: -deductSolvent,
          new_qty: newSolvent,
          reason: 'sale',
          order_id: orderId,
          notes: `Pelarut refill: ${deductSolvent.toFixed(1)}ml (${solventRefillCount}x racikan)`
        });
        alreadyDeducted.add(`solvent:${solventStock.id}`);
      }
    }

    console.log(`[deductOrderStock] Selesai memproses pemotongan stok untuk Order #${orderId} (${order.order_code}) di Store #${storeId}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[deductOrderStock] Error memotong stok order:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Entrypoint aman dengan concurrency guard per order_id
 */
export async function deductOrderStock(orderId: number, preferredStoreId?: number): Promise<{ success: boolean; error?: string }> {
  if (inFlightDeductions.has(orderId)) {
    return inFlightDeductions.get(orderId)!;
  }
  const promise = _executeDeductOrderStock(orderId, preferredStoreId);
  inFlightDeductions.set(orderId, promise);
  try {
    return await promise;
  } finally {
    inFlightDeductions.delete(orderId);
  }
}

/**
 * Backward compatibility wrapper untuk deductRefillStock
 */
export async function deductRefillStock(orderId: number, preferredStoreId?: number) {
  return deductOrderStock(orderId, preferredStoreId);
}
