"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Download, Search, TrendingDown, TrendingUp, Package, AlertCircle } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useTheme } from "@/lib/theme-context";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Tab = "Parfum Jadi" | "Bibit" | "Pelarut" | "Botol";
type TimeRange = "Hari Ini" | "7 Hari" | "30 Hari" | "3 Bulan" | "1 Tahun" | "Semua";
type Granularity = "Menit" | "Jam" | "Harian" | "Mingguan" | "Bulanan" | "Tahunan";

export default function BarangClient({
  stores,
  stockChangelog,
  productStocks,
  bibitStocks,
  bottleStocks,
  solventStocks,
  orderItems,
}: {
  stores: any[];
  stockChangelog: any[];
  productStocks: any[];
  bibitStocks: any[];
  bottleStocks: any[];
  solventStocks: any[];
  orderItems: any[];
}) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("Parfum Jadi");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("30 Hari");
  const [granularity, setGranularity] = useState<Granularity>("Harian");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const TABS: Tab[] = ["Parfum Jadi", "Bibit", "Pelarut", "Botol"];
  const TIME_RANGES: TimeRange[] = ["Hari Ini", "7 Hari", "30 Hari", "3 Bulan", "1 Tahun", "Semua"];
  const GRANULARITIES: Granularity[] = ["Menit", "Jam", "Harian", "Mingguan", "Bulanan", "Tahunan"];

  const formatNumber = (num: number) => new Intl.NumberFormat("id-ID").format(num);

  const getStartDate = (range: TimeRange) => {
    const now = new Date();
    switch (range) {
      case "Hari Ini": return new Date(now.setHours(0, 0, 0, 0));
      case "7 Hari": return new Date(now.setDate(now.getDate() - 7));
      case "30 Hari": return new Date(now.setDate(now.getDate() - 30));
      case "3 Bulan": return new Date(now.setMonth(now.getMonth() - 3));
      case "1 Tahun": return new Date(now.setFullYear(now.getFullYear() - 1));
      case "Semua": return new Date(0);
    }
  };

  const filterByDate = (dateString: string, range: TimeRange) => {
    const date = new Date(dateString);
    const start = getStartDate(range);
    return date >= start;
  };

  const processedData = useMemo(() => {
    let currentStock = [];
    let movements = [];
    let totalOut = 0;
    let lowStockCount = 0;
    let totalCurrentStock = 0;
    let mostSold = { name: "-", qty: 0 };
    let chartData = [];
    let tableData = [];
    let productList: string[] = [];

    const isStoreMatch = (storeId: number) => selectedStore === "all" || storeId.toString() === selectedStore;

    if (activeTab === "Parfum Jadi") {
      // 1. Process Finished Perfume Stocks
      const groupedStocks = new Map();
      productStocks.filter(s => isStoreMatch(s.store_id)).forEach(stock => {
        const name = stock.perfume_sizes?.perfumes?.name;
        if (!name) return;
        
        const existing = groupedStocks.get(name) || { id: name, name, stock: 0, out: 0, in: 0 };
        existing.stock += stock.stock_qty || 0;
        groupedStocks.set(name, existing);
      });

      // 2. Sales of Finished Perfumes (Strictly exclude raw materials: Bibit, Pelarut, Botol)
      const filteredOrders = orderItems.filter(o => 
        filterByDate(o.created_at, timeRange) && 
        isStoreMatch((o as any).store_id)
      );
      
      filteredOrders.forEach(order => {
        const name = (order.perfume_name || '').trim();
        if (!name) return;
        // Ignore raw materials and custom refill parts
        if (/^(Bibit:|Pelarut:|Botol)/i.test(name)) return;

        const existing = groupedStocks.get(name);
        if (existing) {
          existing.out += order.quantity || 0;
        } else {
          groupedStocks.set(name, { id: name, name, stock: 0, out: order.quantity || 0, in: 0 });
        }
      });

      // 3. Stock movements from changelog
      const filteredChangelogs = stockChangelog.filter(c => 
        c.entity_type === "product" && 
        isStoreMatch(c.store_id) &&
        filterByDate(c.created_at, timeRange)
      );
      movements = filteredChangelogs;

      filteredChangelogs.forEach(c => {
        const rawName = c.entity_name || '';
        let matchedName = '';
        for (const pName of groupedStocks.keys()) {
          if (rawName.startsWith(pName)) {
            matchedName = pName;
            break;
          }
        }
        if (matchedName && groupedStocks.has(matchedName)) {
          const existing = groupedStocks.get(matchedName)!;
          if (c.reason !== 'baseline') {
            if (c.change_qty > 0) existing.in += c.change_qty;
            else if (c.reason !== 'sale') existing.out += Math.abs(c.change_qty);
          }
        }
      });

      tableData = Array.from(groupedStocks.values());
      lowStockCount = tableData.filter(d => d.stock <= 5).length;
    } 
    else if (activeTab === "Bibit") {
      const grouped = new Map();
      bibitStocks.filter(s => isStoreMatch(s.store_id)).forEach(stock => {
        const name = stock.bibit?.name;
        if (!name) return;
        const existing = grouped.get(name) || { id: name, name, stock: 0, out: 0, in: 0 };
        const totalMl = Number(stock.stock_ml ?? 0);
        existing.stock += totalMl;
        grouped.set(name, existing);
      });

      // Track bibit usage from custom refill orders
      const filteredOrders = orderItems.filter(o => 
        filterByDate(o.created_at, timeRange) && 
        isStoreMatch((o as any).store_id)
      );
      
      filteredOrders.forEach(order => {
        const raw = (order.perfume_name || '').trim();
        if (!/^Bibit:/i.test(raw)) return;
        const name = raw.replace(/^Bibit:\s*/i, '').trim();

        const match = (order.size_label || '').match(/([\d.]+)\s*ml/i);
        const ml = match ? parseFloat(match[1]) * (order.quantity || 1) : (order.quantity || 1);

        const existing = grouped.get(name) || { id: name, name, stock: 0, out: 0, in: 0 };
        existing.out += Math.round(ml * 10) / 10;
        grouped.set(name, existing);
      });

      const filteredChangelogs = stockChangelog.filter(c => 
        c.entity_type === "bibit" && 
        isStoreMatch(c.store_id) &&
        filterByDate(c.created_at, timeRange)
      );
      movements = filteredChangelogs;

      filteredChangelogs.forEach(c => {
        const name = c.entity_name;
        const existing = grouped.get(name) || { id: name, name, stock: 0, out: 0, in: 0 };
        if (c.reason !== 'baseline') {
          if (c.change_qty < 0 && c.reason !== 'sale') existing.out += Math.abs(c.change_qty);
          else if (c.change_qty > 0) existing.in += c.change_qty;
        }
        grouped.set(name, existing);
      });

      tableData = Array.from(grouped.values());
      lowStockCount = tableData.filter(d => d.stock <= 500).length;
    }
    else if (activeTab === "Pelarut") {
      const grouped = new Map();
      solventStocks.filter(s => isStoreMatch(s.store_id)).forEach(stock => {
        const name = stock.solvents?.name;
        if (!name) return;
        const existing = grouped.get(name) || { id: name, name, stock: 0, out: 0, in: 0 };
        existing.stock += stock.stock_ml || 0;
        grouped.set(name, existing);
      });

      // Track solvent usage from custom refill orders
      const filteredOrders = orderItems.filter(o => 
        filterByDate(o.created_at, timeRange) && 
        isStoreMatch((o as any).store_id)
      );
      
      filteredOrders.forEach(order => {
        const raw = (order.perfume_name || '').trim();
        if (!/^Pelarut:/i.test(raw)) return;
        const name = raw.replace(/^Pelarut:\s*/i, '').trim();

        const match = (order.size_label || '').match(/([\d.]+)\s*ml/i);
        const ml = match ? parseFloat(match[1]) * (order.quantity || 1) : (order.quantity || 1);

        const existing = grouped.get(name) || { id: name, name, stock: 0, out: 0, in: 0 };
        existing.out += Math.round(ml * 10) / 10;
        grouped.set(name, existing);
      });

      const filteredChangelogs = stockChangelog.filter(c => 
        c.entity_type === "solvent" && 
        isStoreMatch(c.store_id) &&
        filterByDate(c.created_at, timeRange)
      );
      movements = filteredChangelogs;

      filteredChangelogs.forEach(c => {
        const name = c.entity_name;
        const existing = grouped.get(name) || { id: name, name, stock: 0, out: 0, in: 0 };
        if (c.reason !== 'baseline') {
          if (c.change_qty < 0 && c.reason !== 'sale') existing.out += Math.abs(c.change_qty);
          else if (c.change_qty > 0) existing.in += c.change_qty;
        }
        grouped.set(name, existing);
      });

      tableData = Array.from(grouped.values());
      lowStockCount = tableData.filter(d => d.stock <= 500).length;
    }
    else if (activeTab === "Botol") {
      const grouped = new Map();
      bottleStocks.filter(s => isStoreMatch(s.store_id)).forEach(stock => {
        const name = stock.bottles?.name;
        if (!name) return;
        const existing = grouped.get(name) || { id: name, name, stock: 0, out: 0, in: 0 };
        existing.stock += stock.stock_qty || 0;
        grouped.set(name, existing);
      });

      // Track bottle usage from custom refill orders
      const filteredOrders = orderItems.filter(o => 
        filterByDate(o.created_at, timeRange) && 
        isStoreMatch((o as any).store_id)
      );
      
      filteredOrders.forEach(order => {
        const raw = (order.perfume_name || '').trim();
        if (!/^Botol:/i.test(raw)) return;
        const name = raw.replace(/^Botol:\s*/i, '').trim();

        const existing = grouped.get(name) || { id: name, name, stock: 0, out: 0, in: 0 };
        existing.out += (order.quantity || 1);
        grouped.set(name, existing);
      });

      const filteredChangelogs = stockChangelog.filter(c => 
        c.entity_type === "bottle" && 
        isStoreMatch(c.store_id) &&
        filterByDate(c.created_at, timeRange)
      );
      movements = filteredChangelogs;

      filteredChangelogs.forEach(c => {
        const name = c.entity_name;
        const existing = grouped.get(name) || { id: name, name, stock: 0, out: 0, in: 0 };
        if (c.reason !== 'baseline') {
          if (c.change_qty < 0 && c.reason !== 'sale') existing.out += Math.abs(c.change_qty);
          else if (c.change_qty > 0) existing.in += c.change_qty;
        }
        grouped.set(name, existing);
      });

      tableData = Array.from(grouped.values());
      lowStockCount = tableData.filter(d => d.stock <= 5).length;
    }

    tableData.sort((a, b) => b.out - a.out);
    
    totalCurrentStock = tableData.reduce((acc, curr) => acc + curr.stock, 0);
    totalOut = tableData.reduce((acc, curr) => acc + curr.out, 0);
    if (tableData.length > 0) mostSold = tableData[0];

    productList = tableData.map(d => d.name);

    // Chart processing
    if (selectedProduct === "all") {
      // Bar chart for top products
      chartData = tableData.slice(0, 15).map(d => ({ x: d.name, y: d.out }));
    } else {
      // Line chart for single product timeline
      // Construct timeline from changelog. We need a starting point.
      // Since it's complex to re-calculate exact historical stock accurately across branches, 
      // we'll plot the movement quantities (out) over time for simplicity as "Usage over time"
      // or "Stock level" if we trace back. Let's trace back from current stock.
      
      const productInfo = tableData.find(d => d.name === selectedProduct);
      let currentAccStock = productInfo ? productInfo.stock : 0;
      
      const productMovements = movements
        .filter(m => 
          (activeTab === "Parfum Jadi" ? true : m.entity_name === selectedProduct) // Need better match for Parfum Jadi if changelog doesn't have names
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // descending

      // Group by time based on granularity
      const timeMap = new Map();
      
      if (activeTab === "Parfum Jadi") {
         // Using orderItems for timeline out
         const pOrders = orderItems.filter(o => o.perfume_name === selectedProduct && filterByDate(o.created_at, timeRange));
         pOrders.forEach(o => {
            const date = new Date(o.created_at);
            // simplify granularity to Day for now
            const key = date.toLocaleDateString("id-ID");
            timeMap.set(key, (timeMap.get(key) || 0) + o.quantity);
         });
      } else {
         productMovements.forEach(m => {
            const date = new Date(m.created_at);
            const key = date.toLocaleDateString("id-ID");
            if (m.change_qty < 0) {
               timeMap.set(key, (timeMap.get(key) || 0) + Math.abs(m.change_qty));
            }
         });
      }
      
      chartData = Array.from(timeMap.entries())
        .map(([time, qty]) => ({ x: time, y: qty }))
        .sort((a, b) => {
           // parse date logic required for strict sorting, simplified for example
           return a.x.localeCompare(b.x); 
        });
    }

    return { tableData, totalOut, lowStockCount, totalCurrentStock, mostSold, chartData, productList };
  }, [activeTab, selectedStore, timeRange, granularity, selectedProduct, stockChangelog, productStocks, bibitStocks, bottleStocks, solventStocks, orderItems]);

  const filteredTable = processedData.tableData.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ela Parfum";
    workbook.created = new Date();

    const titleFont: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 16, bold: true };
    const headerFont: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 12, bold: true };
    const normalFont: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 11 };
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    const ws = workbook.addWorksheet(activeTab, {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } }
    });

    ws.columns = [
      { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];

    ws.addRow([`Ela Parfum - Statistik Barang (${activeTab})`]);
    ws.getCell('A1').font = titleFont;
    ws.mergeCells('A1:D1');
    ws.addRow([`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`]);
    ws.getCell('A2').font = { ...normalFont, italic: true };
    ws.mergeCells('A2:D2');
    ws.addRow([]);

    const headerRow = ws.addRow(["Nama Barang", "Stok Saat Ini", "Total Keluar", "Total Masuk"]);
    headerRow.eachCell(cell => {
      cell.font = headerFont;
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    processedData.tableData.forEach(d => {
      const row = ws.addRow([d.name, d.stock, d.out, d.in]);
      row.eachCell((cell, colNumber) => {
        cell.font = normalFont;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', wrapText: true, horizontal: colNumber > 1 ? 'right' : 'left' };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Statistik_Barang_${activeTab}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: selectedProduct === "all" ? "bar" : "area",
      toolbar: { show: true },
      fontFamily: "var(--font-display)",
      background: "transparent",
      foreColor: theme === 'dark' ? '#9ca3af' : '#374151',
      locales: [{
        name: 'id',
        options: {
          months: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
          shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
          days: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
          shortDays: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
          toolbar: {
            exportToSVG: 'Unduh SVG',
            exportToPNG: 'Unduh PNG',
            exportToCSV: 'Unduh CSV',
            menu: 'Menu',
            selection: 'Seleksi',
            selectionZoom: 'Zoom Seleksi',
            zoomIn: 'Perbesar',
            zoomOut: 'Perkecil',
            pan: 'Geser',
            reset: 'Reset Zoom'
          }
        }
      }],
      defaultLocale: 'id'
    },
    colors: ["#c9a96c"],
    plotOptions: {
      bar: { 
        horizontal: selectedProduct === "all", 
        borderRadius: 4, 
        dataLabels: { position: "top" },
        barHeight: '65%'
      }
    },
    dataLabels: {
      enabled: selectedProduct === "all",
      style: { colors: [theme === 'dark' ? '#f3f4f6' : '#111827'], fontSize: '11px', fontWeight: 'bold' },
      offsetX: 25,
      formatter: (val: any) => `${val} ${activeTab === "Bibit" || activeTab === "Pelarut" ? "ml" : "pcs"}`
    },
    stroke: { curve: "smooth", width: selectedProduct === "all" ? 0 : 3 },
    fill: {
      type: selectedProduct === "all" ? "solid" : "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100]
      }
    },
    xaxis: {
      categories: processedData.chartData.map(d => d.x),
      labels: {
        style: { colors: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: '11px' }
      }
    },
    yaxis: {
      labels: { 
        style: { colors: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: '11px' },
        formatter: (val: any) => {
          if (selectedProduct === "all") {
            // In horizontal bar charts, Y-axis represents the category names (strings)
            return String(val ?? '');
          }
          return `${formatNumber(val)} ${activeTab === "Bibit" || activeTab === "Pelarut" ? "ml" : "pcs"}`;
        }
      }
    },
    grid: { borderColor: "var(--c-border)" },
    theme: { mode: theme },
    tooltip: {
      theme: theme,
      y: { formatter: (val) => `${formatNumber(val)} ${activeTab === "Bibit" || activeTab === "Pelarut" ? "ml" : "pcs"}` }
    }
  };

  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem", color: "var(--c-ink)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>Statistik Barang</h1>
          <p style={{ color: "var(--c-ink-dim)", fontSize: "0.875rem" }}>Pantau pergerakan stok dan barang terlaris di setiap kategori.</p>
        </div>
        <button 
          onClick={exportExcel}
          style={{ 
            display: "flex", alignItems: "center", gap: "0.5rem", 
            padding: "0.5rem 1rem", borderRadius: "var(--r-md)", 
            backgroundColor: "var(--c-surface-2)", border: "1px solid var(--c-border)",
            cursor: "pointer", color: "var(--c-ink)"
          }}
        >
          <Download size={16} /> Export Excel
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedProduct("all"); }}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "999px",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
              backgroundColor: activeTab === tab ? "var(--c-gold)" : "var(--c-surface-1)",
              color: activeTab === tab ? "#000" : "var(--c-ink-dim)",
              border: activeTab === tab ? "none" : "1px solid var(--c-border)",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Global Controls */}
      <div style={{ 
        display: "flex", flexWrap: "wrap", gap: "1rem", 
        padding: "1rem", backgroundColor: "var(--c-surface-1)", 
        borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", textTransform: "uppercase" }}>Toko</label>
          <select 
            value={selectedStore} 
            onChange={(e) => setSelectedStore(e.target.value)}
            style={{ 
              padding: "0.5rem", borderRadius: "var(--r-sm)", 
              backgroundColor: "var(--c-surface-2)", border: "1px solid var(--c-border)", 
              color: "var(--c-ink)", outline: "none", minWidth: "150px"
            }}
          >
            <option value="all">Semua Toko</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", textTransform: "uppercase" }}>Rentang Waktu</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {TIME_RANGES.map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: "0.375rem 0.75rem", borderRadius: "var(--r-sm)",
                  fontSize: "0.75rem", cursor: "pointer",
                  backgroundColor: timeRange === range ? "var(--c-surface-2)" : "transparent",
                  color: timeRange === range ? "var(--c-gold)" : "var(--c-ink-dim)",
                  border: `1px solid ${timeRange === range ? "var(--c-gold)" : "var(--c-border)"}`
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", textTransform: "uppercase" }}>Produk ({activeTab})</label>
          <input 
            list="product-list"
            value={selectedProduct === "all" ? "" : selectedProduct} 
            onChange={(e) => setSelectedProduct(e.target.value || "all")}
            placeholder="Cari produk (semua)..."
            style={{ 
              padding: "0.5rem", borderRadius: "var(--r-sm)", 
              backgroundColor: "var(--c-surface-2)", border: "1px solid var(--c-border)", 
              color: "var(--c-ink)", outline: "none", minWidth: "200px"
            }}
          />
          <datalist id="product-list">
            <option value="all">Semua {activeTab}</option>
            {processedData.productList.map(p => <option key={p} value={p}>{p}</option>)}
          </datalist>
        </div>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Total Barang Keluar", value: `${formatNumber(processedData.totalOut)} ${activeTab === "Bibit" || activeTab === "Pelarut" ? "ml" : "pcs"}`, icon: TrendingDown, color: "var(--c-rose)" },
          { label: "Barang Paling Laris", value: processedData.mostSold.name, icon: TrendingUp, color: "var(--c-green)" },
          { label: "Stok Menipis", value: formatNumber(processedData.lowStockCount), icon: AlertCircle, color: "var(--c-gold)" },
          { label: "Total Stok Saat Ini", value: `${formatNumber(processedData.totalCurrentStock)} ${activeTab === "Bibit" || activeTab === "Pelarut" ? "ml" : "pcs"}`, icon: Package, color: "var(--c-ink)" },
        ].map((metric, idx) => (
          <div key={idx} style={{ 
            backgroundColor: "var(--c-surface-1)", padding: "1.5rem", 
            borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)",
            display: "flex", flexDirection: "column", gap: "1rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--c-ink-dim)", fontSize: "0.875rem", fontWeight: "500" }}>{metric.label}</span>
              <metric.icon size={20} style={{ color: metric.color }} />
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ 
        backgroundColor: "var(--c-surface-1)", padding: "1.5rem", 
        borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)"
      }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
          {selectedProduct === "all" ? `Barang Terlaris (${activeTab})` : `Pergerakan Stok: ${selectedProduct}`}
        </h3>
        <div style={{ height: selectedProduct === "all" ? `${Math.max(400, processedData.chartData.length * 40)}px` : "400px" }}>
          <Chart 
            key={`chart-${selectedProduct}-${activeTab}-${timeRange}-${selectedStore}-${theme}`}
            options={chartOptions} 
            series={[{ name: "Jumlah", data: processedData.chartData.map(d => d.y) }]} 
            type={selectedProduct === "all" ? "bar" : "area"} 
            height="100%" 
          />
        </div>
      </div>

      {/* Data Table */}
      <div style={{ 
        backgroundColor: "var(--c-surface-1)", padding: "1.5rem", 
        borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600" }}>Rincian {activeTab}</h3>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-dim)" }} />
            <input 
              type="text" 
              placeholder="Cari barang..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "0.5rem 1rem 0.5rem 2.25rem", borderRadius: "var(--r-full)",
                backgroundColor: "var(--c-surface-2)", border: "1px solid var(--c-border)",
                color: "var(--c-ink)", outline: "none", fontSize: "0.875rem"
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--c-border)", color: "var(--c-ink-dim)" }}>
                <th style={{ padding: "1rem 0", fontWeight: "500" }}>Nama Barang</th>
                <th style={{ padding: "1rem 0", fontWeight: "500", textAlign: "right" }}>Stok Saat Ini</th>
                <th style={{ padding: "1rem 0", fontWeight: "500", textAlign: "right" }}>Total Keluar (Periode)</th>
                <th style={{ padding: "1rem 0", fontWeight: "500", textAlign: "right" }}>Total Masuk (Periode)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTable.length > 0 ? filteredTable.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--c-border)" }}>
                  <td style={{ padding: "1rem 0" }}>{row.name}</td>
                  <td style={{ padding: "1rem 0", textAlign: "right" }}>
                    {formatNumber(row.stock)} {activeTab === "Bibit" || activeTab === "Pelarut" ? "ml" : "pcs"}
                    {((activeTab === "Bibit" || activeTab === "Pelarut") && row.stock <= 500) || (!(activeTab === "Bibit" || activeTab === "Pelarut") && row.stock <= 5) ? 
                      <span style={{ color: "var(--c-gold)", marginLeft: "0.5rem", fontSize: "0.75rem" }}>⚠️ Menipis</span> 
                    : null}
                  </td>
                  <td style={{ padding: "1rem 0", textAlign: "right" }}>{formatNumber(row.out)}</td>
                  <td style={{ padding: "1rem 0", textAlign: "right" }}>{formatNumber(row.in)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--c-ink-dim)" }}>
                    Tidak ada data untuk filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
