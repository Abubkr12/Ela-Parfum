import { createAdminClient } from "@/lib/supabase/admin";
import BarangClient from "./BarangClient";

export const dynamic = 'force-dynamic';

export default async function StatistikBarangPage() {
  const supabase = createAdminClient();

  // Fetch stores
  const { data: stores } = await supabase.from("stores").select("*");

  // Fetch stock changelog
  const { data: stockChangelog } = await supabase
    .from("stock_changelog")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch product stocks
  const { data: productStocks } = await supabase
    .from("product_stocks")
    .select(`
      *,
      perfume_sizes:perfume_size_id (
        *,
        perfumes:perfume_id (*)
      )
    `);

  // Fetch bibit stocks
  const { data: bibitStocks } = await supabase
    .from("bibit_stocks")
    .select(`
      *,
      bibit:bibit_id (*)
    `);

  // Fetch bottle stocks
  const { data: bottleStocks } = await supabase
    .from("bottle_stocks")
    .select(`
      *,
      bottles:bottle_id (*)
    `);

  // Fetch solvent stocks
  const { data: solventStocks } = await supabase
    .from("solvent_stocks")
    .select(`
      *,
      solvents:solvent_id (*)
    `);

  // Fetch orders that are paid
  const { data: paidOrders } = await supabase
    .from("orders")
    .select("id, payment_status, status, created_at, notes")
    .in("payment_status", ["paid", "confirmed", "processing", "shipped", "completed"]);

  const paidOrderIds = paidOrders?.map(o => o.id) || [];

  let orderItems: any[] = [];
  if (paidOrderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("*");
      
    if (items) {
      orderItems = items.filter(item => paidOrderIds.includes(item.order_id));
    }
  }

  // Combine order timestamps and store origin with orderItems
  const orderItemsWithDate = orderItems.map((item) => {
    const order = paidOrders?.find((o) => o.id === item.order_id);
    const notes = order?.notes || '';
    let storeId = 2; // Default Rawabelong
    if (/origin:\s*condet/i.test(notes)) storeId = 1;
    else if (/origin:\s*tangerang/i.test(notes)) storeId = 3;
    else if (/origin:\s*rawa\s*belong/i.test(notes)) storeId = 2;

    return {
      ...item,
      created_at: order?.created_at,
      store_id: storeId
    };
  });

  return (
    <BarangClient
      stores={stores || []}
      stockChangelog={stockChangelog || []}
      productStocks={productStocks || []}
      bibitStocks={bibitStocks || []}
      bottleStocks={bottleStocks || []}
      solventStocks={solventStocks || []}
      orderItems={orderItemsWithDate}
    />
  );
}
