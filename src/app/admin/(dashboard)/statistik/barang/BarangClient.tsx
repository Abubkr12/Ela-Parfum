"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Download, 
  Search, 
  TrendingDown, 
  TrendingUp, 
  Package, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown
} from "lucide-react";
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

  // Table filter, sort, & pagination states
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'menipis' | 'aman' | 'bergerak' | 'habis'>('all');
  const [sortBy, setSortBy] = useState<'out_desc' | 'in_desc' | 'stock_desc' | 'stock_asc' | 'name_asc'>('out_desc');
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(15);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery, stockStatusFilter, sortBy, selectedStore, timeRange]);

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
    let chartData: { x: string; out: number; in: number }[] = [];
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

        let existing = groupedStocks.get(name);
        if (!existing) {
          for (const [key, val] of groupedStocks.entries()) {
            if (name.startsWith(key) || key.startsWith(name)) {
              existing = val;
              break;
            }
          }
        }
        if (existing) {
          existing.out += order.quantity || 0;
        } else if ((order.quantity || 0) > 0) {
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
        if (c.reason === 'baseline') return; // Skip baseline snapshot
        const rawName = (c.entity_name || '').trim();
        let matchedName = '';
        for (const pName of groupedStocks.keys()) {
          if (rawName.startsWith(pName)) {
            matchedName = pName;
            break;
          }
        }
        if (matchedName && groupedStocks.has(matchedName)) {
          const existing = groupedStocks.get(matchedName)!;
          if (c.change_qty > 0) existing.in += c.change_qty;
          else if (c.reason !== 'sale') existing.out += Math.abs(c.change_qty);
        }
      });

      tableData = Array.from(groupedStocks.values()).filter(d => d.stock > 0 || d.out > 0 || d.in > 0);
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

        const existing = grouped.get(name);
        if (existing) {
          existing.out += Math.round(ml * 10) / 10;
        }
      });

      const filteredChangelogs = stockChangelog.filter(c => 
        c.entity_type === "bibit" && 
        isStoreMatch(c.store_id) &&
        filterByDate(c.created_at, timeRange)
      );
      movements = filteredChangelogs;

      filteredChangelogs.forEach(c => {
        if (c.reason === 'baseline') return; // Skip baseline snapshot
        const name = (c.entity_name || '').trim();
        const existing = grouped.get(name);
        if (existing) {
          if (c.change_qty < 0 && c.reason !== 'sale') existing.out += Math.abs(c.change_qty);
          else if (c.change_qty > 0) existing.in += c.change_qty;
        }
      });

      tableData = Array.from(grouped.values()).filter(d => d.stock > 0 || d.out > 0 || d.in > 0);
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

        const existing = grouped.get(name) || (grouped.size === 1 ? Array.from(grouped.values())[0] : undefined);
        if (existing) {
          existing.out += Math.round(ml * 10) / 10;
        }
      });

      const filteredChangelogs = stockChangelog.filter(c => 
        c.entity_type === "solvent" && 
        isStoreMatch(c.store_id) &&
        filterByDate(c.created_at, timeRange)
      );
      movements = filteredChangelogs;

      filteredChangelogs.forEach(c => {
        if (c.reason === 'baseline') return; // Skip baseline snapshot
        const name = (c.entity_name || '').trim();
        const existing = grouped.get(name) || (grouped.size === 1 ? Array.from(grouped.values())[0] : undefined);
        if (existing) {
          if (c.change_qty < 0 && c.reason !== 'sale') existing.out += Math.abs(c.change_qty);
          else if (c.change_qty > 0) existing.in += c.change_qty;
        }
      });

      tableData = Array.from(grouped.values()).filter(d => d.stock > 0 || d.out > 0 || d.in > 0);
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
        const normalized = name.replace(/\s*\(\d+ml\)/i, '').trim();

        const existing = grouped.get(name) || grouped.get(normalized);
        if (existing) existing.out += (order.quantity || 1);
      });

      const filteredChangelogs = stockChangelog.filter(c => 
        c.entity_type === "bottle" && 
        isStoreMatch(c.store_id) &&
        filterByDate(c.created_at, timeRange)
      );
      movements = filteredChangelogs;

      filteredChangelogs.forEach(c => {
        if (c.reason === 'baseline') return; // Skip baseline snapshot
        const raw = (c.entity_name || '').trim();
        const normalized = raw.replace(/\s*\(\d+ml\)/i, '').trim();
        const existing = grouped.get(raw) || grouped.get(normalized);
        if (existing) {
          if (c.change_qty < 0 && c.reason !== 'sale') existing.out += Math.abs(c.change_qty);
          else if (c.change_qty > 0) existing.in += c.change_qty;
        }
      });

      tableData = Array.from(grouped.values()).filter(d => d.stock > 0 || d.out > 0 || d.in > 0);
      lowStockCount = tableData.filter(d => d.stock <= 5).length;
    }

    tableData = tableData.filter(d => d.stock > 0 || d.out > 0 || d.in > 0);
    tableData.sort((a, b) => b.out - a.out);
    
    totalCurrentStock = tableData.reduce((acc, curr) => acc + curr.stock, 0);
    totalOut = tableData.reduce((acc, curr) => acc + curr.out, 0);
    if (tableData.length > 0) mostSold = tableData[0];

    productList = tableData.map(d => d.name);

    // Chart processing
    if (selectedProduct === "all") {
      // Top products dual-metric comparison
      chartData = tableData.slice(0, 15).map(d => ({
        x: d.name,
        out: d.out,
        in: d.in
      }));
    } else {
      // Single product timeline
      const timeMap = new Map<string, { out: number; in: number; time: number }>();

      const getOrCreate = (key: string, dateStr: string) => {
        let entry = timeMap.get(key);
        if (!entry) {
          entry = { out: 0, in: 0, time: new Date(dateStr).getTime() };
          timeMap.set(key, entry);
        }
        return entry;
      };

      if (activeTab === "Parfum Jadi") {
        // Calculate out from orderItems for this product
        const pOrders = orderItems.filter(o => 
          (o.perfume_name || '').trim() === selectedProduct && 
          filterByDate(o.created_at, timeRange) &&
          isStoreMatch((o as any).store_id)
        );

        pOrders.forEach(o => {
          const key = new Date(o.created_at).toLocaleDateString("id-ID");
          const entry = getOrCreate(key, o.created_at);
          entry.out += o.quantity || 0;
        });

        // Calculate in and additional out from stockChangelog (where change_qty > 0 => in, change_qty < 0 and reason !== 'sale' => out)
        const pMovements = movements.filter(m => {
          const raw = (m.entity_name || '').trim();
          if (raw === selectedProduct) return true;
          if (raw.startsWith(selectedProduct)) {
            const nextChar = raw.charAt(selectedProduct.length);
            return nextChar === ' ' || nextChar === '-' || nextChar === '(';
          }
          return false;
        });

        pMovements.forEach(c => {
          if (c.reason !== 'baseline') {
            const key = new Date(c.created_at).toLocaleDateString("id-ID");
            const entry = getOrCreate(key, c.created_at);
            if (c.change_qty > 0) {
              entry.in += c.change_qty;
            } else if (c.change_qty < 0 && c.reason !== 'sale') {
              entry.out += Math.abs(c.change_qty);
            }
          }
        });
      } else {
        // For other tabs: Track in and out from productMovements (c.change_qty > 0 => in, c.change_qty < 0 => out)
        const productMovements = movements.filter(m => {
          if (activeTab === "Botol") {
            const raw = (m.entity_name || '').trim();
            const normalized = raw.replace(/\s*\(\d+ml\)/i, '').trim();
            return raw === selectedProduct || normalized === selectedProduct;
          }
          return (m.entity_name || '').trim() === selectedProduct;
        });
        productMovements.forEach(c => {
          if (c.reason !== 'baseline') {
            const key = new Date(c.created_at).toLocaleDateString("id-ID");
            const entry = getOrCreate(key, c.created_at);
            if (c.change_qty > 0) {
              entry.in += c.change_qty;
            } else if (c.change_qty < 0) {
              entry.out += Math.abs(c.change_qty);
            }
          }
        });
      }

      chartData = Array.from(timeMap.entries())
        .map(([time, val]) => ({
          x: time,
          out: Math.round(val.out * 10) / 10,
          in: Math.round(val.in * 10) / 10,
          _time: val.time
        }))
        .sort((a, b) => a._time - b._time)
        .map(({ x, out, in: inVal }) => ({ x, out, in: inVal }));
    }

    return { tableData, totalOut, lowStockCount, totalCurrentStock, mostSold, chartData, productList };
  }, [activeTab, selectedStore, timeRange, granularity, selectedProduct, stockChangelog, productStocks, bibitStocks, bottleStocks, solventStocks, orderItems]);

  const filteredTable = useMemo(() => {
    let result = processedData.tableData.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter status stok
    if (stockStatusFilter !== 'all') {
      const lowThreshold = activeTab === 'Bibit' || activeTab === 'Pelarut' ? 500 : 5;
      if (stockStatusFilter === 'menipis') {
        result = result.filter(d => d.stock <= lowThreshold && d.stock > 0);
      } else if (stockStatusFilter === 'aman') {
        result = result.filter(d => d.stock > lowThreshold);
      } else if (stockStatusFilter === 'bergerak') {
        result = result.filter(d => d.out > 0 || d.in > 0);
      } else if (stockStatusFilter === 'habis') {
        result = result.filter(d => d.stock === 0);
      }
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'out_desc': return b.out - a.out;
        case 'in_desc': return b.in - a.in;
        case 'stock_desc': return b.stock - a.stock;
        case 'stock_asc': return a.stock - b.stock;
        case 'name_asc': return a.name.localeCompare(b.name);
        default: return b.out - a.out;
      }
    });

    return result;
  }, [processedData.tableData, searchQuery, stockStatusFilter, sortBy, activeTab]);

  const totalItems = filteredTable.length;
  const totalPages = Math.ceil(totalItems / perPage) || 1;
  const paginatedTable = perPage >= totalItems ? filteredTable : filteredTable.slice((page - 1) * perPage, page * perPage);

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
    colors: ["#EF4444", "#10B981"],
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      labels: { colors: theme === "dark" ? "#d1d5db" : "#374151" }
    },
    plotOptions: {
      bar: { 
        horizontal: selectedProduct === "all", 
        borderRadius: 4, 
        dataLabels: { position: "top" },
        barHeight: '70%'
      }
    },
    dataLabels: {
      enabled: selectedProduct === "all",
      style: { colors: [theme === 'dark' ? '#f3f4f6' : '#111827'], fontSize: '11px', fontWeight: 'bold' },
      offsetX: 25,
      formatter: (val: any) => val > 0 ? `${formatNumber(val)}` : ""
    },
    stroke: { curve: "smooth", width: selectedProduct === "all" ? 0 : 2.5 },
    fill: {
      type: selectedProduct === "all" ? "solid" : "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
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
      shared: true,
      intersect: false,
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
          {selectedProduct === "all" ? `Perbandingan Barang Masuk & Keluar (${activeTab})` : `Pergerakan Stok Masuk & Keluar: ${selectedProduct}`}
        </h3>
        <div style={{ height: selectedProduct === "all" ? `${Math.max(420, processedData.chartData.length * 48)}px` : "400px" }}>
          <Chart 
            key={`chart-${selectedProduct}-${activeTab}-${timeRange}-${selectedStore}-${theme}`}
            options={chartOptions} 
            series={[
              { name: "Barang Keluar", data: processedData.chartData.map(d => d.out) },
              { name: "Barang Masuk", data: processedData.chartData.map(d => d.in) }
            ]} 
            type={selectedProduct === "all" ? "bar" : "area"} 
            height={selectedProduct === "all" ? `${Math.max(420, processedData.chartData.length * 48)}px` : "400px"} 
          />
        </div>
      </div>

      {/* Data Table */}
      <div style={{ 
        backgroundColor: "var(--c-surface-1)", padding: "1.5rem", 
        borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)"
      }}>
        {/* Table Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>Rincian {activeTab}</h3>
            <span style={{ 
              fontSize: "0.75rem", padding: "0.25rem 0.625rem", borderRadius: "var(--r-full)", 
              backgroundColor: "var(--c-surface-2)", color: "var(--c-ink-dim)", border: "1px solid var(--c-border)",
              fontWeight: 500
            }}>
              {totalItems} barang
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-dim)" }} />
              <input 
                type="text" 
                placeholder="Cari barang..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "0.5rem 1rem 0.5rem 2.25rem", borderRadius: "var(--r-md)",
                  backgroundColor: "var(--c-surface-2)", border: "1px solid var(--c-border)",
                  color: "var(--c-ink)", outline: "none", fontSize: "0.875rem", minWidth: "180px"
                }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <Filter size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-dim)", pointerEvents: "none" }} />
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                style={{
                  padding: "0.5rem 1rem 0.5rem 2.25rem", borderRadius: "var(--r-md)",
                  backgroundColor: "var(--c-surface-2)", border: "1px solid var(--c-border)",
                  color: "var(--c-ink)", outline: "none", fontSize: "0.875rem", cursor: "pointer"
                }}
              >
                <option value="all">Semua Status</option>
                <option value="menipis">Stok Menipis</option>
                <option value="aman">Stok Aman</option>
                <option value="bergerak">Ada Pergerakan</option>
                <option value="habis">Stok Habis</option>
              </select>
            </div>

            <div style={{ position: "relative" }}>
              <ArrowUpDown size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-dim)", pointerEvents: "none" }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: "0.5rem 1rem 0.5rem 2.25rem", borderRadius: "var(--r-md)",
                  backgroundColor: "var(--c-surface-2)", border: "1px solid var(--c-border)",
                  color: "var(--c-ink)", outline: "none", fontSize: "0.875rem", cursor: "pointer"
                }}
              >
                <option value="out_desc">Paling Banyak Keluar</option>
                <option value="in_desc">Paling Banyak Masuk</option>
                <option value="stock_desc">Stok Tertinggi</option>
                <option value="stock_asc">Stok Terendah</option>
                <option value="name_asc">Nama (A-Z)</option>
              </select>
            </div>
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
              {paginatedTable.length > 0 ? paginatedTable.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--c-border)" }}>
                  <td style={{ padding: "1rem 0" }}>{row.name}</td>
                  <td style={{ padding: "1rem 0", textAlign: "right" }}>
                    {formatNumber(row.stock)} {activeTab === "Bibit" || activeTab === "Pelarut" ? "ml" : "pcs"}
                    {((activeTab === "Bibit" || activeTab === "Pelarut") && row.stock <= 500) || (!(activeTab === "Bibit" || activeTab === "Pelarut") && row.stock <= 5) ? 
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "var(--c-gold)", marginLeft: "0.5rem", fontSize: "0.75rem" }}><AlertCircle size={12} /> Menipis</span> 
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

        {/* Pagination Bar */}
        {totalItems > 0 && (
          <div style={{ 
            padding: "1rem 0 0.25rem 0", borderTop: "1px solid var(--c-border)", 
            display: "flex", justifyContent: "space-between", alignItems: "center", 
            flexWrap: "wrap", gap: "1rem", marginTop: "1rem" 
          }}>
            <div style={{ color: "var(--c-ink-dim)", fontSize: "0.875rem" }}>
              Menampilkan {totalItems === 0 ? 0 : ((page - 1) * perPage) + 1} - {Math.min(page * perPage, totalItems)} dari {totalItems} data
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--c-ink-dim)" }}>
                Baris per halaman:
                <select 
                  value={perPage} 
                  onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                  style={{ 
                    padding: "0.25rem 0.5rem", borderRadius: "var(--r-sm)", 
                    border: "1px solid var(--c-border)", backgroundColor: "var(--c-surface-2)", 
                    color: "var(--c-ink)", cursor: "pointer" 
                  }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={999999}>Semua</option>
                </select>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button 
                  disabled={page === 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ 
                    padding: "0.25rem", borderRadius: "var(--r-sm)", 
                    border: "1px solid var(--c-border)", 
                    backgroundColor: page === 1 ? "transparent" : "var(--c-surface-2)", 
                    color: page === 1 ? "var(--c-border)" : "var(--c-ink)", 
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: "0.875rem", color: "var(--c-ink-dim)" }}>
                  Halaman {page} dari {totalPages}
                </span>
                <button 
                  disabled={page >= totalPages} 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{ 
                    padding: "0.25rem", borderRadius: "var(--r-sm)", 
                    border: "1px solid var(--c-border)", 
                    backgroundColor: page >= totalPages ? "transparent" : "var(--c-surface-2)", 
                    color: page >= totalPages ? "var(--c-border)" : "var(--c-ink)", 
                    cursor: page >= totalPages ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
