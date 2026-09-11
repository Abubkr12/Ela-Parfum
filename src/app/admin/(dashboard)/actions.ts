"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type DashboardKpi = {
  totalRevenueToday: number;
  totalRevenueYesterday: number;
  revenueGrowthPct: number;
  totalRevenueAll: number;
  totalOrdersToday: number;
  totalOrdersYesterday: number;
  ordersGrowthPct: number;
  totalOrdersAll: number;
  aovToday: number;
  totalCustomers: number;
};

export type DashboardTodo = {
  pendingVerificationCount: number;
  pendingVerificationOrders: {
    id: number;
    order_code: string;
    customer_name: string;
    total: number;
    payment_method: string | null;
    created_at: string;
  }[];
  processingCount: number;
  shippedCount: number;
  completedTodayCount: number;
};

export type DashboardRecentOrder = {
  id: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  courier_name: string | null;
  waybill_number: string | null;
  notes: string | null;
  created_at: string;
  store_name: string;
};

export type CriticalStockItem = {
  id: number;
  item_type: 'bibit' | 'botol' | 'pelarut';
  item_name: string;
  store_id: number;
  store_name: string;
  current_stock: number;
  unit: string;
  threshold: number;
  urgency: 'critical' | 'warning';
};

export type StoreBreakdownItem = {
  store_id: number;
  store_name: string;
  revenue: number;
  orders_count: number;
};

export type DailyTrendPoint = {
  date: string;
  label: string;
  revenue: number;
  orders: number;
};

export type SystemHealthStatus = {
  database: boolean;
  biteship: boolean;
  mayar: boolean;
  gemini: boolean;
};

export type DashboardData = {
  kpi: DashboardKpi;
  todo: DashboardTodo;
  recentOrders: DashboardRecentOrder[];
  criticalStocks: CriticalStockItem[];
  stores: { id: number; name: string }[];
  storeBreakdown: StoreBreakdownItem[];
  trendChart30Days: DailyTrendPoint[];
  systemHealth: SystemHealthStatus;
  lastUpdated: string;
};

function getWibDateString(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

function getStoreNameFromNotes(notes: string | null, storeMap: Map<number, string>): { storeId: number; storeName: string } {
  const text = notes || '';
  if (/origin:\s*condet/i.test(text)) {
    return { storeId: 1, storeName: storeMap.get(1) || 'Condet' };
  }
  if (/origin:\s*tangerang/i.test(text)) {
    return { storeId: 3, storeName: storeMap.get(3) || 'Tangerang' };
  }
  return { storeId: 2, storeName: storeMap.get(2) || 'Rawa Belong' };
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createAdminClient();

  // 1. Fetch stores
  const { data: storesData } = await supabase
    .from('stores')
    .select('id, name')
    .order('id');
  const stores = storesData || [
    { id: 1, name: 'Condet' },
    { id: 2, name: 'Rawabelong' },
    { id: 3, name: 'Tangerang' }
  ];
  const storeMap = new Map<number, string>();
  stores.forEach(s => storeMap.set(s.id, s.name));

  // 2. Fetch all non-cancelled orders for accurate statistics & pipeline
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      order_code,
      customer_id,
      customer_name,
      customer_phone,
      total,
      status,
      payment_method,
      payment_status,
      payment_proof,
      courier_name,
      waybill_number,
      notes,
      paid_at,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('Error fetching dashboard orders:', ordersError);
  }

  const allOrders = ordersData || [];

  // Determine dates in WIB
  const now = new Date();
  const todayWib = getWibDateString(now);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayWib = getWibDateString(yesterdayDate);

  // Helper: check if order is paid
  const isOrderPaid = (o: any) => {
    return (
      o.payment_status === 'paid' ||
      ['processing', 'confirmed', 'shipped', 'completed'].includes(o.status)
    );
  };

  // Helper: check if order requires manual payment verification
  const isOrderPendingVerification = (o: any) => {
    if (o.status === 'cancelled') return false;
    if (o.status === 'pending_verification') return true;
    if (o.payment_status === 'waiting_confirmation') return true;
    if (o.status === 'pending' && o.payment_proof && String(o.payment_proof).startsWith('http')) return true;
    return false;
  };

  // 3. Compute KPI metrics
  let totalRevenueToday = 0;
  let totalRevenueYesterday = 0;
  let totalRevenueAll = 0;
  let totalOrdersToday = 0;
  let totalOrdersYesterday = 0;
  let totalOrdersAll = 0;

  const uniqueCustomerIds = new Set<string>();

  // Store breakdown tracker
  const storeBreakdownMap: Record<number, { revenue: number; count: number }> = {};
  stores.forEach(s => {
    storeBreakdownMap[s.id] = { revenue: 0, count: 0 };
  });

  // Trend tracker for 30 days
  const trendDaysMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = getWibDateString(d);
    trendDaysMap.set(dateStr, { revenue: 0, orders: 0 });
  }

  const pendingVerificationList: DashboardTodo['pendingVerificationOrders'] = [];
  let processingCount = 0;
  let shippedCount = 0;
  let completedTodayCount = 0;

  for (const o of allOrders) {
    if (o.customer_id) uniqueCustomerIds.add(o.customer_id);
    else if (o.customer_phone) uniqueCustomerIds.add(o.customer_phone);

    const orderDateWib = getWibDateString(o.created_at);
    const isCancelled = o.status === 'cancelled';
    const paid = isOrderPaid(o);

    if (!isCancelled) {
      totalOrdersAll++;

      if (orderDateWib === todayWib) {
        totalOrdersToday++;
      } else if (orderDateWib === yesterdayWib) {
        totalOrdersYesterday++;
      }
    }

    if (paid && !isCancelled) {
      const amount = Number(o.total || 0);
      totalRevenueAll += amount;

      if (orderDateWib === todayWib) {
        totalRevenueToday += amount;
      } else if (orderDateWib === yesterdayWib) {
        totalRevenueYesterday += amount;
      }

      // Store breakdown
      const { storeId } = getStoreNameFromNotes(o.notes, storeMap);
      if (storeBreakdownMap[storeId]) {
        storeBreakdownMap[storeId].revenue += amount;
        storeBreakdownMap[storeId].count += 1;
      }

      // Trend data
      if (trendDaysMap.has(orderDateWib)) {
        const point = trendDaysMap.get(orderDateWib)!;
        point.revenue += amount;
        point.orders += 1;
      }
    }

    // Pipeline classification
    if (isOrderPendingVerification(o)) {
      pendingVerificationList.push({
        id: o.id,
        order_code: o.order_code,
        customer_name: o.customer_name || 'Pelanggan',
        total: Number(o.total || 0),
        payment_method: o.payment_method || 'Manual Transfer',
        created_at: o.created_at
      });
    }

    if (paid && o.status === 'processing') {
      processingCount++;
    }

    if (o.status === 'shipped') {
      shippedCount++;
    }

    if (o.status === 'completed' && orderDateWib === todayWib) {
      completedTodayCount++;
    }
  }

  // Growth calculations
  const revenueGrowthPct = totalRevenueYesterday > 0
    ? Math.round(((totalRevenueToday - totalRevenueYesterday) / totalRevenueYesterday) * 100)
    : (totalRevenueToday > 0 ? 100 : 0);

  const ordersGrowthPct = totalOrdersYesterday > 0
    ? Math.round(((totalOrdersToday - totalOrdersYesterday) / totalOrdersYesterday) * 100)
    : (totalOrdersToday > 0 ? 100 : 0);

  const aovToday = totalOrdersToday > 0 ? Math.round(totalRevenueToday / totalOrdersToday) : 0;

  // 4. Format Recent Orders (Top 10)
  const recentOrders: DashboardRecentOrder[] = allOrders.slice(0, 10).map(o => {
    const { storeName } = getStoreNameFromNotes(o.notes, storeMap);
    return {
      id: o.id,
      order_code: o.order_code,
      customer_name: o.customer_name || 'Pelanggan',
      customer_phone: o.customer_phone || '-',
      total: Number(o.total || 0),
      status: o.status,
      payment_status: o.payment_status || 'unpaid',
      payment_method: o.payment_method,
      courier_name: o.courier_name,
      waybill_number: o.waybill_number,
      notes: o.notes,
      created_at: o.created_at,
      store_name: storeName
    };
  });

  // 5. Critical Stocks Radar (Multi-Cabang)
  const criticalStocks: CriticalStockItem[] = [];

  try {
    // 5a. Bibit stocks (< 500ml)
    const { data: bibitStocks } = await supabase
      .from('bibit_stocks')
      .select(`
        id,
        store_id,
        stock_ml,
        bibit:bibit_id (id, name)
      `)
      .lt('stock_ml', 500)
      .order('stock_ml', { ascending: true })
      .limit(20);

    if (bibitStocks) {
      for (const item of bibitStocks) {
        const bibitData = Array.isArray(item.bibit) ? item.bibit[0] : item.bibit;
        if (bibitData && bibitData.name) {
          const qty = Number(item.stock_ml || 0);
          criticalStocks.push({
            id: item.id,
            item_type: 'bibit',
            item_name: bibitData.name,
            store_id: item.store_id,
            store_name: storeMap.get(item.store_id) || `Cabang ${item.store_id}`,
            current_stock: qty,
            unit: 'ml',
            threshold: 500,
            urgency: qty <= 200 ? 'critical' : 'warning'
          });
        }
      }
    }

    // 5b. Bottle stocks (< 20 pcs)
    const { data: bottleStocks } = await supabase
      .from('bottle_stocks')
      .select(`
        id,
        store_id,
        stock_qty,
        bottles:bottle_id (id, name)
      `)
      .lt('stock_qty', 20)
      .order('stock_qty', { ascending: true })
      .limit(20);

    if (bottleStocks) {
      for (const item of bottleStocks) {
        const bottleData = Array.isArray(item.bottles) ? item.bottles[0] : item.bottles;
        if (bottleData && bottleData.name) {
          const qty = Number(item.stock_qty || 0);
          criticalStocks.push({
            id: item.id,
            item_type: 'botol',
            item_name: bottleData.name,
            store_id: item.store_id,
            store_name: storeMap.get(item.store_id) || `Cabang ${item.store_id}`,
            current_stock: qty,
            unit: 'pcs',
            threshold: 20,
            urgency: qty <= 5 ? 'critical' : 'warning'
          });
        }
      }
    }

    // 5c. Solvent stocks (< 1000ml)
    const { data: solventStocks } = await supabase
      .from('solvent_stocks')
      .select(`
        id,
        store_id,
        stock_ml,
        solvents:solvent_id (id, name)
      `)
      .lt('stock_ml', 1000)
      .order('stock_ml', { ascending: true })
      .limit(10);

    if (solventStocks) {
      for (const item of solventStocks) {
        const solventData = Array.isArray(item.solvents) ? item.solvents[0] : item.solvents;
        if (solventData && solventData.name) {
          const qty = Number(item.stock_ml || 0);
          criticalStocks.push({
            id: item.id,
            item_type: 'pelarut',
            item_name: solventData.name,
            store_id: item.store_id,
            store_name: storeMap.get(item.store_id) || `Cabang ${item.store_id}`,
            current_stock: qty,
            unit: 'ml',
            threshold: 1000,
            urgency: qty <= 300 ? 'critical' : 'warning'
          });
        }
      }
    }
  } catch (stockErr) {
    console.error('Error fetching critical stock alerts:', stockErr);
  }

  // Sort critical stocks: 'critical' first, then lowest stock percentage
  criticalStocks.sort((a, b) => {
    if (a.urgency === 'critical' && b.urgency !== 'critical') return -1;
    if (a.urgency !== 'critical' && b.urgency === 'critical') return 1;
    return (a.current_stock / a.threshold) - (b.current_stock / b.threshold);
  });

  // 6. Format Store Breakdown
  const storeBreakdown: StoreBreakdownItem[] = stores.map(s => ({
    store_id: s.id,
    store_name: s.name,
    revenue: storeBreakdownMap[s.id]?.revenue || 0,
    orders_count: storeBreakdownMap[s.id]?.count || 0
  }));

  // 7. Format Trend Chart (30 Days)
  const trendChart30Days: DailyTrendPoint[] = Array.from(trendDaysMap.entries()).map(([dateStr, val]) => {
    const d = new Date(dateStr + 'T00:00:00+07:00');
    const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    return {
      date: dateStr,
      label,
      revenue: val.revenue,
      orders: val.orders
    };
  });

  // 8. System Health Checks
  const systemHealth: SystemHealthStatus = {
    database: !ordersError,
    biteship: !!(process.env.BITESHIP_API_KEY || process.env.BITESHIP_SECRET_KEY),
    mayar: !!(process.env.MAYAR_API_KEY || process.env.MAYAR_SANDBOX_API_KEY),
    gemini: !!(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)
  };

  return {
    kpi: {
      totalRevenueToday,
      totalRevenueYesterday,
      revenueGrowthPct,
      totalRevenueAll,
      totalOrdersToday,
      totalOrdersYesterday,
      ordersGrowthPct,
      totalOrdersAll,
      aovToday,
      totalCustomers: uniqueCustomerIds.size
    },
    todo: {
      pendingVerificationCount: pendingVerificationList.length,
      pendingVerificationOrders: pendingVerificationList,
      processingCount,
      shippedCount,
      completedTodayCount
    },
    recentOrders,
    criticalStocks,
    stores,
    storeBreakdown,
    trendChart30Days,
    systemHealth,
    lastUpdated: new Date().toISOString()
  };
}
