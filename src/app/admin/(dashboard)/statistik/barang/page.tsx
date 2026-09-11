import { createAdminClient } from "@/lib/supabase/admin";
import BarangClient from "./BarangClient";

export const dynamic = 'force-dynamic';

async function fetchAllBatched<T = any>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const results: T[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await queryFn(from, from + batchSize - 1);
    if (error || !data || data.length === 0) break;
    results.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return results;
}

export default async function StatistikBarangPage() {
  const supabase = createAdminClient();

  // Fetch stores
  const { data: stores } = await supabase.from("stores").select("*");

  // Fetch stock changelog
  const stockChangelog = await fetchAllBatched(async (from, to) =>
    await supabase
      .from("stock_changelog")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to)
  );

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
  const bibitStocks = await fetchAllBatched(async (from, to) =>
    await supabase
      .from("bibit_stocks")
      .select(`
        *,
        bibit:bibit_id (*)
      `)
      .range(from, to)
  );

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
