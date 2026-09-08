'use server'
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createAdminClient();

export async function getSolvents() {
  const { data, error } = await supabaseAdmin.from('solvents').select('*').order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function getSolventStocks(storeId: number) {
  const { data, error } = await supabaseAdmin
    .from('solvent_stocks')
    .select(`
      id,
      store_id,
      stock_ml,
      solvents (
        id,
        name,
        type,
        price_per_ml
      )
    `)
    .eq('store_id', storeId)
    .order('id');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSolventStock(id: number, newMl: number) {
  const { data: currentStock, error: fetchError } = await supabaseAdmin
    .from('solvent_stocks')
    .select('stock_ml, store_id, solvents (name)')
    .eq('id', id)
    .single();
    
  if (fetchError || !currentStock) throw new Error(fetchError?.message || 'Stock not found');
  
  const changeQty = newMl - currentStock.stock_ml;

  const { error } = await supabaseAdmin
    .from('solvent_stocks')
    .update({ stock_ml: newMl, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  
  await supabaseAdmin.from('stock_changelog').insert({
    entity_type: 'solvent',
    entity_id: id,
    entity_name: (Array.isArray(currentStock.solvents) ? currentStock.solvents[0]?.name : (currentStock.solvents as any)?.name) || 'Unknown Solvent',
    store_id: currentStock.store_id,
    change_qty: changeQty,
    new_qty: newMl,
    reason: 'adjustment'
  });

  revalidatePath('/admin/stok');
  return { success: true };
}

export async function addSolvent(name: string, type: string, pricePerMl: number) {
  const { data: newSolvent, error: insertError } = await supabaseAdmin
    .from('solvents')
    .insert({
      name,
      type,
      price_per_ml: pricePerMl,
      is_active: true
    })
    .select('id')
    .single();
    
  if (insertError) throw new Error(insertError.message);
  
  const stores = [1, 2, 3];
  const stockInserts = stores.map(storeId => ({
    solvent_id: newSolvent.id,
    store_id: storeId,
    stock_ml: 0
  }));
  
  const { error: stockError } = await supabaseAdmin
    .from('solvent_stocks')
    .insert(stockInserts);
    
  if (stockError) throw new Error(stockError.message);
  
  revalidatePath('/admin/stok');
  return { success: true };
}
