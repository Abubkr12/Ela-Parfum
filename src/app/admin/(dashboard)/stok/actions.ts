"use server";

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createAdminClient();

export async function getStores() {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('*')
    .order('id');
  if (error) throw new Error(error.message);
  return data;
}

export async function getProductStocks(storeId: number) {
  const { data, error } = await supabaseAdmin
    .from('product_stocks')
    .select(`
      id,
      store_id,
      stock_qty,
      perfume_sizes (
        id,
        size_label,
        perfumes (
          id,
          name,
          image_url
        )
      )
    `)
    .eq('store_id', storeId)
    .order('id');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getBibitStocks(storeId: number) {
  const { data, error } = await supabaseAdmin
    .from('bibit_stocks')
    .select(`
      id,
      store_id,
      stock_ml,
      bibit (
        id,
        name,
        collection
      )
    `)
    .eq('store_id', storeId)
    .order('id');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getBottleStocks(storeId: number) {
  const { data, error } = await supabaseAdmin
    .from('bottle_stocks')
    .select(`
      id,
      store_id,
      stock_qty,
      bottles (
        id,
        name,
        capacity_ml
      )
    `)
    .eq('store_id', storeId)
    .order('id');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProductStock(id: number, qty: number) {
  const { data: currentStock, error: fetchError } = await supabaseAdmin
    .from('product_stocks')
    .select('stock_qty, store_id, perfume_size_id, perfume_sizes (size_label, perfumes (name))')
    .eq('id', id)
    .single();
    
  if (fetchError || !currentStock) throw new Error(fetchError?.message || 'Stock not found');
  
  const changeQty = qty - currentStock.stock_qty;

  const { error } = await supabaseAdmin
    .from('product_stocks')
    .update({ stock_qty: qty, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);

  // Sync aggregate stock to perfume_sizes.stock for backward compatibility
  if (currentStock.perfume_size_id) {
    const { data: allStocks } = await supabaseAdmin
      .from('product_stocks')
      .select('stock_qty')
      .eq('perfume_size_id', currentStock.perfume_size_id);
    const totalQty = (allStocks || []).reduce((sum, s) => sum + (s.stock_qty || 0), 0);
    await supabaseAdmin
      .from('perfume_sizes')
      .update({ stock: totalQty })
      .eq('id', currentStock.perfume_size_id);
  }
  
  const _ps = Array.isArray(currentStock.perfume_sizes) ? currentStock.perfume_sizes[0] : (currentStock.perfume_sizes as any);
  const _pName = _ps ? (Array.isArray(_ps.perfumes) ? _ps.perfumes[0]?.name : _ps.perfumes?.name) : 'Unknown';
  const entityName = `${_pName} - ${_ps?.size_label || 'Size'}`;
  await supabaseAdmin.from('stock_changelog').insert({
    entity_type: 'product',
    entity_id: id,
    entity_name: entityName,
    store_id: currentStock.store_id,
    change_qty: changeQty,
    new_qty: qty,
    reason: 'adjustment'
  });
  
  revalidatePath('/admin/stok');
  revalidatePath('/admin/produk');
  revalidatePath('/katalog');
  revalidatePath('/parfum');
  
  return { success: true };
}

export async function updateBottleStock(id: number, qty: number) {
  const { data: currentStock, error: fetchError } = await supabaseAdmin
    .from('bottle_stocks')
    .select('stock_qty, store_id, bottles (name)')
    .eq('id', id)
    .single();
    
  if (fetchError || !currentStock) throw new Error(fetchError?.message || 'Stock not found');
  
  const changeQty = qty - currentStock.stock_qty;

  const { error } = await supabaseAdmin
    .from('bottle_stocks')
    .update({ stock_qty: qty, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  
  await supabaseAdmin.from('stock_changelog').insert({
    entity_type: 'bottle',
    entity_id: id,
    entity_name: (Array.isArray(currentStock.bottles) ? currentStock.bottles[0]?.name : (currentStock.bottles as any)?.name) || 'Unknown Bottle',
    store_id: currentStock.store_id,
    change_qty: changeQty,
    new_qty: qty,
    reason: 'adjustment'
  });
  
  revalidatePath('/admin/stok');
  revalidatePath('/admin/botol');
  
  return { success: true };
}

export async function updateBibitStock(id: number, newStockMl: number) {
  const { data: currentStock, error: fetchError } = await supabaseAdmin
    .from('bibit_stocks')
    .select('stock_ml, store_id, bibit (name)')
    .eq('id', id)
    .single();
    
  if (fetchError || !currentStock) throw new Error(fetchError?.message || 'Stock not found');

  const oldTotal = Number(currentStock.stock_ml || 0);
  const newTotal = Number(newStockMl || 0);
  const changeQty = newTotal - oldTotal;

  const { error } = await supabaseAdmin
    .from('bibit_stocks')
    .update({ 
      stock_ml: newTotal,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  
  await supabaseAdmin.from('stock_changelog').insert({
    entity_type: 'bibit',
    entity_id: id,
    entity_name: (Array.isArray(currentStock.bibit) ? currentStock.bibit[0]?.name : (currentStock.bibit as any)?.name) || 'Unknown Bibit',
    store_id: currentStock.store_id,
    change_qty: changeQty,
    new_qty: newTotal,
    reason: 'adjustment'
  });
  
  revalidatePath('/admin/stok');
  revalidatePath('/admin/bibit');
  
  return { success: true };
}
