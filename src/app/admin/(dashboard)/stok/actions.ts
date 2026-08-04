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
      sealed_500ml,
      sealed_1000ml,
      opened_500ml_left,
      opened_1000ml_left,
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
  const { error } = await supabaseAdmin
    .from('product_stocks')
    .update({ stock_qty: qty, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/stok');
  revalidatePath('/admin/produk');
  revalidatePath('/katalog');
  
  return { success: true };
}

export async function updateBottleStock(id: number, qty: number) {
  const { error } = await supabaseAdmin
    .from('bottle_stocks')
    .update({ stock_qty: qty, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/stok');
  revalidatePath('/admin/botol');
  
  return { success: true };
}

export async function updateBibitStock(
  id: number, 
  sealed_500ml: number, 
  sealed_1000ml: number, 
  opened_500ml_left: number, 
  opened_1000ml_left: number
) {
  const { error } = await supabaseAdmin
    .from('bibit_stocks')
    .update({ 
      sealed_500ml, 
      sealed_1000ml, 
      opened_500ml_left, 
      opened_1000ml_left,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/stok');
  revalidatePath('/admin/bibit');
  
  return { success: true };
}
