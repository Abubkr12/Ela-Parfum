"use server";

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Cart } from '@/lib/types';

const supabaseAdmin = createAdminClient();

function generateOrderCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MW-${timestamp}-${random}`;
}

export async function validateVoucher(code: string, subtotal: number, shippingCost: number) {
  try {
    const { data: voucher, error } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !voucher) return { error: 'Voucher tidak ditemukan.' };
    
    if (!voucher.is_active) return { error: 'Voucher tidak aktif.' };
    
    const now = new Date();
    if (voucher.valid_from && new Date(voucher.valid_from) > now) return { error: 'Voucher belum berlaku.' };
    if (voucher.valid_until && new Date(voucher.valid_until) < now) return { error: 'Voucher sudah kadaluarsa.' };
    
    if (voucher.quota > 0 && voucher.used_count >= voucher.quota) return { error: 'Kuota voucher telah habis.' };
    if (voucher.min_purchase > 0 && subtotal < voucher.min_purchase) return { error: `Minimal belanja Rp ${voucher.min_purchase.toLocaleString('id-ID')}` };

    let discountAmount = 0;
    if (voucher.type === 'percentage') {
      discountAmount = Math.floor(subtotal * (voucher.value / 100));
      if (voucher.max_discount > 0 && discountAmount > voucher.max_discount) {
        discountAmount = voucher.max_discount;
      }
    } else if (voucher.type === 'fixed') {
      discountAmount = voucher.value;
    } else if (voucher.type === 'free_shipping') {
      discountAmount = shippingCost; // Assuming free shipping covers the entire shipping cost or up to `value`?
      // If `value` > 0, it might mean Max Free Shipping Discount.
      if (voucher.value > 0 && shippingCost > voucher.value) {
        discountAmount = voucher.value;
      }
    }

    if (discountAmount <= 0) return { error: 'Voucher tidak memberikan potongan.' };

    return { success: true, voucher, discountAmount };
  } catch (err: any) {
    return { error: 'Terjadi kesalahan sistem.' };
  }
}

export async function processCheckout(formData: FormData, cart: Cart, subtotal: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Harap login terlebih dahulu untuk checkout.' };
    if (!cart || cart.items.length === 0) return { error: 'Keranjang belanja kosong.' };

    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const shippingCostStr = formData.get('shippingCost') as string;
    const courierInfo = formData.get('courierInfo') as string;
    const voucherCode = formData.get('voucherCode') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const originAreaId = formData.get('originAreaId') as string;
    const originName = formData.get('originName') as string;
    const destinationAreaId = formData.get('destinationAreaId') as string;
    
    const shippingCost = parseInt(shippingCostStr || "0", 10);
    let discount = 0;
    let appliedVoucherId = null;

    if (voucherCode) {
      const vRes = await validateVoucher(voucherCode, subtotal, shippingCost);
      if (vRes.success && vRes.discountAmount) {
        discount = vRes.discountAmount;
        appliedVoucherId = vRes.voucher.id;
      } else {
        return { error: 'Voucher tidak valid: ' + vRes.error };
      }
    }

    // Hitung total dan 1% fee jika QRIS
    let total = subtotal + shippingCost - discount;
    if (paymentMethod === "QRIS") {
      const fee = Math.floor(total * 0.01);
      total += fee;
    }

    const orderCode = generateOrderCode();

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_code: orderCode,
        customer_id: user.id,
        customer_name: fullName,
        customer_phone: phone,
        customer_address: address,
        subtotal: subtotal,
        discount: discount,
        shipping_cost: shippingCost,
        courier_name: courierInfo,
        total: total,
        status: paymentMethod === 'TUNAI' ? 'pending_verification' : 'pending',
        payment_method: paymentMethod === 'TUNAI' ? 'Bayar Tunai di Toko' : 'QRIS (Mayar)',
        notes: `Kurir: ${courierInfo} | Origin: ${originName} | Dest: ${destinationAreaId} | Pembayaran: ${paymentMethod}${voucherCode ? ` | Voucher: ${voucherCode}` : ''}`
      })
      .select('id, order_code')
      .single();

    if (orderError) return { error: 'Gagal membuat pesanan: ' + orderError.message };

    const orderItemsData = cart.items.map(item => ({
      order_id: orderData.id,
      perfume_id: item.perfumeId,
      size_id: item.sizeId,
      perfume_name: item.perfumeName,
      size_label: item.sizeLabel,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity
    }));

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemsData);
    if (itemsError) return { error: 'Gagal menyimpan detail pesanan: ' + itemsError.message };

    // --- Deduct Stock ---
    // Asumsikan pesanan online dikurangi dari store utama (store_id = 1, Condet)
    for (const item of cart.items) {
      const { data: stockData } = await supabaseAdmin
        .from('product_stocks')
        .select('stock_qty')
        .eq('perfume_size_id', item.sizeId)
        .eq('store_id', 1)
        .single();
        
      if (stockData) {
        await supabaseAdmin
          .from('product_stocks')
          .update({ stock_qty: Math.max(0, stockData.stock_qty - item.quantity) })
          .eq('perfume_size_id', item.sizeId)
          .eq('store_id', 1);
      }
    }
    // --------------------

    // Increment voucher used_count
    if (appliedVoucherId) {
      const { data: v } = await supabaseAdmin.from('vouchers').select('used_count').eq('id', appliedVoucherId).single();
      if (v) {
        await supabaseAdmin.from('vouchers').update({ used_count: v.used_count + 1 }).eq('id', appliedVoucherId);
      }
    }

    // Jika TUNAI, langsung success
    if (paymentMethod === 'TUNAI') {
      return { url: `/checkout/success?id=${orderData.id}`, success: true };
    }

    // Jika QRIS, create Mayar Invoice
    try {
      const isSandbox = process.env.MAYAR_IS_SANDBOX === 'true';
      const mayarKey = isSandbox ? process.env.MAYAR_SANDBOX_API_KEY : process.env.MAYAR_API_KEY;
      const mayarUrl = isSandbox ? 'https://api.mayar.club/hl/v1/invoice/create' : 'https://api.mayar.id/hl/v1/invoice/create';
      
      const invoiceData = {
        name: fullName,
        email: user.email || 'customer@elaparfum.com',
        amount: total,
        mobile: phone,
        description: `Pesanan ${orderCode}`,
        referenceId: orderData.order_code,
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/success?id=${orderData.id}`,
        successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/success?id=${orderData.id}`,
        items: [
            { name: `Total Pesanan ${orderCode}`, description: `Checkout Ela Parfum: ${orderCode}`, quantity: 1, rate: total }
        ]
      };

      const res = await fetch(mayarUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mayarKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });

      const resData = await res.json();
      if (resData.statusCode === 200 && resData.data && resData.data.link) {
        // Return Mayar Link
        return { url: resData.data.link, success: true };
      } else {
        console.error("Mayar API Error:", resData);
        // Fallback if Mayar fails
        return { error: 'Gagal membuat link pembayaran: ' + (resData.message || resData.messages || 'Unknown Error') };
      }
    } catch (e) {
      console.error("Error creating Mayar invoice:", e);
      return { error: 'Terjadi kesalahan saat memproses pembayaran.' };
    }

  } catch (err: any) {
    console.error("Checkout Error:", err);
    return { error: 'Terjadi kesalahan sistem internal: ' + err.message };
  }
}

export async function processCustomCheckout(formData: FormData, customRequestId: string, subtotal: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Harap login terlebih dahulu untuk checkout.' };

    // Fetch custom request
    const { data: request, error: reqErr } = await supabaseAdmin
      .from('custom_requests')
      .select('*')
      .eq('id', customRequestId)
      .single();

    if (reqErr || !request) return { error: 'Data pesanan custom tidak ditemukan.' };

    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const shippingCostStr = formData.get('shippingCost') as string;
    const courierInfo = formData.get('courierInfo') as string;
    const voucherCode = formData.get('voucherCode') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const originName = formData.get('originName') as string;
    const destinationAreaId = formData.get('destinationAreaId') as string;

    const shippingCost = parseInt(shippingCostStr || "0", 10);
    let discount = 0;
    let appliedVoucherId = null;

    if (voucherCode) {
      const vRes = await validateVoucher(voucherCode, subtotal, shippingCost);
      if (vRes.success && vRes.discountAmount) {
        discount = vRes.discountAmount;
        appliedVoucherId = vRes.voucher.id;
      } else {
        return { error: 'Voucher tidak valid: ' + vRes.error };
      }
    }

    // Hitung total dan 1% fee jika QRIS
    let total = subtotal + shippingCost - discount;
    if (paymentMethod === "QRIS") {
      const fee = Math.floor(total * 0.01);
      total += fee;
    }

    const orderCode = generateOrderCode();

    // 1. Create order record in orders table
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_code: orderCode,
        customer_id: user.id,
        customer_name: fullName,
        customer_phone: phone,
        customer_address: address,
        subtotal: subtotal,
        discount: discount,
        shipping_cost: shippingCost,
        courier_name: courierInfo,
        total: total,
        status: paymentMethod === 'TUNAI' ? 'pending_verification' : 'pending',
        payment_method: paymentMethod === 'TUNAI' ? 'Bayar Tunai di Toko' : 'QRIS (Mayar)',
        notes: `[Custom Refill] ${request.description} | Kurir: ${courierInfo} | Origin: ${originName} | Dest: ${destinationAreaId} | Pembayaran: ${paymentMethod}${voucherCode ? ` | Voucher: ${voucherCode}` : ''} | CustomRequestID: ${customRequestId}`
      })
      .select('id, order_code')
      .single();

    if (orderError) return { error: 'Gagal membuat pesanan: ' + orderError.message };

    // 1.5 Create order items for the custom refill
    let parsedRecipe: any = {};
    try {
      parsedRecipe = typeof request.ai_recipe === "string" ? JSON.parse(request.ai_recipe) : (request.ai_recipe || {});
    } catch (e) {}

    const bibitsList = parsedRecipe.bibits || [];
    const bottleObj = parsedRecipe.bottle || null;
    const ratioStr = parsedRecipe.ratio || "50/50";
    const isOwnBottle = parsedRecipe.own_bottle === true;
    
    const itemsToInsert = [];
    
    // Add Bibit items
    for (const b of bibitsList) {
      const ratioPercent = ratioStr === "100/0" ? 1.0 : ratioStr === "70/30" ? 0.7 : ratioStr === "50/50" ? 0.5 : 0.3;
      const vol = (bottleObj?.capacity_ml || 0) * ratioPercent / (bibitsList.length || 1);
      const cost = vol * (b.price_per_ml || 0);
      itemsToInsert.push({
        order_id: orderData.id,
        perfume_id: null,
        size_id: null,
        perfume_name: `Bibit: ${b.name}`,
        size_label: `${vol.toFixed(1)}ml`,
        quantity: 1,
        price: cost,
        subtotal: cost
      });
    }
    
    // Add Pelarut
    if (bottleObj?.capacity_ml && ratioStr !== "100/0") {
      const solventPercent = ratioStr === "30/70" ? 0.7 : ratioStr === "50/50" ? 0.5 : 0.3;
      const solventVol = bottleObj.capacity_ml * solventPercent;
      itemsToInsert.push({
        order_id: orderData.id,
        perfume_id: null,
        size_id: null,
        perfume_name: `Pelarut: Absolute`,
        size_label: `${solventVol.toFixed(1)}ml`,
        quantity: 1,
        price: 0,
        subtotal: 0
      });
    }
    
    // Add Botol
    itemsToInsert.push({
      order_id: orderData.id,
      perfume_id: null,
      size_id: null,
      perfume_name: isOwnBottle ? `Botol Sendiri` : `Botol: ${bottleObj?.name || request.bottle_type || 'Botol'}`,
      size_label: `${bottleObj?.capacity_ml || request.volume || 0}ml`,
      quantity: 1,
      price: isOwnBottle ? 0 : (bottleObj?.price || request.price_bottle || 0),
      subtotal: isOwnBottle ? 0 : (bottleObj?.price || request.price_bottle || 0)
    });
    
    // Add Biaya Layanan if there is a discrepancy in total
    const itemTotal = itemsToInsert.reduce((sum, it) => sum + it.price, 0);
    const diff = subtotal - itemTotal;
    if (diff > 0) {
      itemsToInsert.push({
        order_id: orderData.id,
        perfume_id: null,
        size_id: null,
        perfume_name: `Biaya Layanan (Racikan)`,
        size_label: `-`,
        quantity: 1,
        price: diff,
        subtotal: diff
      });
    } else if (itemsToInsert.length === 1 && itemsToInsert[0].price === 0) {
      // Fallback if recipe parsing completely failed
      itemsToInsert[0] = {
        order_id: orderData.id,
        perfume_id: null,
        size_id: null,
        perfume_name: `Custom Refill: ${request.base_note || 'Pesanan Custom'}`,
        size_label: `${request.volume || 0}ml (${request.bottle_type || 'Botol'})`,
        quantity: 1,
        price: subtotal,
        subtotal: subtotal
      };
    }

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(itemsToInsert);

    if (itemsError) {
      console.error("Gagal menyimpan detail custom pesanan:", itemsError.message);
    }

    // 2. Update custom_requests status
    await supabaseAdmin
      .from('custom_requests')
      .update({
        status: paymentMethod === 'TUNAI' ? 'paid' : 'quoted',
        total_price: total,
        customer_name: fullName,
        customer_whatsapp: phone
      })
      .eq('id', customRequestId);

    // 3. Increment voucher used_count
    if (appliedVoucherId) {
      const { data: v } = await supabaseAdmin.from('vouchers').select('used_count').eq('id', appliedVoucherId).single();
      if (v) {
        await supabaseAdmin.from('vouchers').update({ used_count: v.used_count + 1 }).eq('id', appliedVoucherId);
      }
    }

    // 4. Jika TUNAI, langsung success
    if (paymentMethod === 'TUNAI') {
      return { url: `/checkout/success?id=${orderData.id}`, success: true };
    }

    // 5. Jika QRIS, create Mayar Invoice
    try {
      const isSandbox = process.env.MAYAR_IS_SANDBOX === 'true';
      const mayarKey = isSandbox ? process.env.MAYAR_SANDBOX_API_KEY : process.env.MAYAR_API_KEY;
      const mayarUrl = isSandbox ? 'https://api.mayar.club/hl/v1/invoice/create' : 'https://api.mayar.id/hl/v1/invoice/create';

      const invoiceData = {
        name: fullName,
        email: user.email || 'customer@elaparfum.com',
        amount: total,
        mobile: phone,
        description: `Pesanan Custom Refill ${orderCode}`,
        referenceId: orderData.order_code,
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/success?id=${orderData.id}`,
        successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/success?id=${orderData.id}`,
        items: [
          { name: `Pesanan Custom Refill (${orderCode})`, description: request.base_note, quantity: 1, rate: total }
        ]
      };

      const res = await fetch(mayarUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mayarKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });

      const resData = await res.json();
      if (resData.statusCode === 200 && resData.data && resData.data.link) {
        return { url: resData.data.link, success: true };
      } else {
        console.error("Mayar API Error:", resData);
        return { error: 'Gagal membuat link pembayaran: ' + (resData.message || resData.messages || 'Unknown Error') };
      }
    } catch (e) {
      console.error("Error creating Mayar invoice:", e);
      return { error: 'Terjadi kesalahan saat memproses pembayaran.' };
    }

  } catch (err: any) {
    console.error("Custom Checkout Error:", err);
    return { error: 'Terjadi kesalahan sistem internal: ' + err.message };
  }
}
