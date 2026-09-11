"use client";

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  PackageCheck,
  Search,
  TrendingUp,
  Award,
  Download,
  Filter,
  Sparkles,
  Droplet
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type OrderItem = {
  id: number;
  perfume_name: string;
  size_label: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type Order = {
  id: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  status: string;
  payment_method: string;
  payment_status: string;
  paid_at: string | null;
  created_at: string;
  order_items: OrderItem[];
};

type PenjualanClientProps = {
  initialOrders: Order[];
};

type Granularity = 'menit' | 'jam' | 'harian' | 'mingguan' | 'bulanan' | 'tahunan';
type TimeRange = 'hari-ini' | '7-hari' | '30-hari' | '3-bulan' | '1-tahun' | 'semua' | 'custom';

export default function PenjualanClient({ initialOrders }: PenjualanClientProps) {
  const { theme } = useTheme();
  const [granularity, setGranularity] = useState<Granularity>('harian');
  const [timeRange, setTimeRange] = useState<TimeRange>('30-hari');
  
  // Custom date range state
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  
  // Table filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentFilter, selectedStore, timeRange, customStart, customEnd]);
  
  // Filter logic for orders based on time range
  const filteredOrders = useMemo(() => {
    let now = new Date();
    // Using current date from context metadata if we want to be exact, but JS new Date() works for UI.
    let startDate: Date | null = null;
    
    if (timeRange === 'hari-ini') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === '7-hari') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === '30-hari') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
    } else if (timeRange === '3-bulan') {
      startDate = new Date();
      startDate.setMonth(now.getMonth() - 3);
    } else if (timeRange === '1-tahun') {
      startDate = new Date();
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (timeRange === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
    }

    let ordersByStore = initialOrders;
    if (selectedStore !== 'all') {
      ordersByStore = initialOrders.filter(o => {
        const notes = (o as any).notes || '';
        if (selectedStore === 'Rawabelong') {
          return /rawa\s*belong/i.test(notes) || (!/origin:\s*condet/i.test(notes) && !/origin:\s*tangerang/i.test(notes));
        }
        if (selectedStore === 'Condet') {
          return /origin:\s*condet/i.test(notes);
        }
        if (selectedStore === 'Tangerang') {
          return /origin:\s*tangerang/i.test(notes);
        }
        return false;
      });
    }

    if (!startDate || timeRange === 'semua') return ordersByStore;

    return ordersByStore.filter(o => {
      const d = new Date(o.created_at);
      if (timeRange === 'custom' && customStart && customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        return d >= startDate! && d <= end;
      }
      return d >= startDate!;
    });
  }, [initialOrders, timeRange, customStart, customEnd, selectedStore]);

  // Aggregate stats
  const totalOmzet = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const totalTransaksi = filteredOrders.length;
  const avgOrderValue = totalTransaksi > 0 ? totalOmzet / totalTransaksi : 0;
  
  // Helper to extract store name for each order
  const getOrderStore = (order: Order): string => {
    const notes = (order as any).notes || '';
    if (/origin:\s*condet/i.test(notes)) return 'Condet';
    if (/origin:\s*tangerang/i.test(notes)) return 'Tangerang';
    if (/origin:\s*rawa\s*belong/i.test(notes)) return 'Rawabelong';
    return 'Rawabelong'; // default / legacy main store
  };

  // Top products (Separate Parfum Jadi and Bibit, strictly ignoring Pelarut & Botol)
  const regularCounts: Record<string, number> = {};
  const bibitCounts: Record<string, number> = {};

  filteredOrders.forEach(order => {
    order.order_items?.forEach(item => {
      const name = (item.perfume_name || '').trim();
      if (!name || /^(Pelarut|Botol|Botol Sendiri)/i.test(name)) {
        return; // ignore non-perfume raw materials
      }

      if (/^Bibit:/i.test(name)) {
        const cleanName = name.replace(/^Bibit:\s*/i, '');
        bibitCounts[cleanName] = (bibitCounts[cleanName] || 0) + (item.quantity || 1);
      } else {
        regularCounts[name] = (regularCounts[name] || 0) + (item.quantity || 1);
      }
    });
  });

  const topRegular = Object.keys(regularCounts).sort((a, b) => regularCounts[b] - regularCounts[a])[0] || '-';
  const topBibit = Object.keys(bibitCounts).sort((a, b) => bibitCounts[b] - bibitCounts[a])[0] || '-';

  // Format Currency
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };
  
  // Chart Data preparation based on granularity
  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    filteredOrders.forEach(order => {
      const d = new Date(order.created_at);
      let key = '';
      
      switch(granularity) {
        case 'menit':
          key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          break;
        case 'jam':
          key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
          break;
        case 'harian':
          key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          break;
        case 'mingguan':
          // Simple ISO week logic: use the date of the monday of that week
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(d.setDate(diff));
          key = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')} (Week)`;
          break;
        case 'bulanan':
          key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          break;
        case 'tahunan':
          key = `${d.getFullYear()}`;
          break;
      }
      
      grouped[key] = (grouped[key] || 0) + order.total;
    });

    const sortedKeys = Object.keys(grouped).sort();
    
    return {
      categories: sortedKeys,
      series: [{
        name: 'Omzet',
        data: sortedKeys.map(k => grouped[k])
      }]
    };
  }, [filteredOrders, granularity]);

  const chartOptions: any = {
    theme: {
      mode: theme
    },
    chart: {
      type: 'area',
      fontFamily: 'var(--font-display)',
      background: 'transparent',
      foreColor: theme === 'dark' ? '#9ca3af' : '#374151',
      toolbar: {
        show: true,
        tools: {
          download: false,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      zoom: { enabled: true }
    },
    colors: ['#c9a96c'], // --c-gold
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100]
      }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: chartData.categories,
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => {
          if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}Jt`;
          if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}Rb`;
          return `Rp ${val}`;
        }
      }
    },
    grid: {
      borderColor: 'var(--c-border)',
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } }
    },
    tooltip: {
      theme: theme,
      y: { formatter: (val: number) => formatIDR(val) }
    }
  };

  // Table Data logic
  const tableData = useMemo(() => {
    let result = [...filteredOrders];
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o => 
        o.order_code?.toLowerCase().includes(q) || 
        o.customer_name?.toLowerCase().includes(q)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }
    
    if (paymentFilter !== 'all') {
      result = result.filter(o => o.payment_method === paymentFilter);
    }
    
    // sorting descending by created_at
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return result;
  }, [filteredOrders, search, statusFilter, paymentFilter]);

  const paginatedData = tableData.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(tableData.length / perPage);

  const getStatusBadge = (status: string) => {
    let color = 'var(--c-ink)';
    let bg = 'var(--c-surface-2)';
    
    if (['paid', 'completed', 'delivered'].includes(status)) {
      color = '#10B981'; // green
      bg = 'rgba(16, 185, 129, 0.1)';
    } else if (['processing', 'confirmed'].includes(status)) {
      color = '#F59E0B'; // gold
      bg = 'rgba(245, 158, 11, 0.1)';
    } else if (['shipped'].includes(status)) {
      color = '#8B5CF6'; // purple
      bg = 'rgba(139, 92, 246, 0.1)';
    }
    
    return (
      <span style={{ 
        color, backgroundColor: bg, 
        padding: '0.25rem 0.75rem', borderRadius: 'var(--r-full)', 
        fontSize: '0.75rem', fontWeight: 600, display: 'inline-block'
      }}>
        {status.toUpperCase()}
      </span>
    );
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Ela Parfum';
    workbook.created = new Date();

    const titleFont: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF0F172A' } };
    const headerFontWhite: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    const headerFontDark: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    const normalFont: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 10 };
    const normalFontBold: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 10, bold: true };
    const italicFont: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 9, italic: true, color: { argb: 'FF64748B' } };

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };

    const doubleBottomBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };

    // ==========================================
    // SHEET 1: RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)
    // ==========================================
    const wsSummary = workbook.addWorksheet('Ringkasan', {
      pageSetup: { 
        paperSize: 9, // A4
        orientation: 'portrait', 
        fitToPage: true, 
        fitToWidth: 1, 
        fitToHeight: 0, 
        margins: { left: 0.6, right: 0.6, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } 
      }
    });

    wsSummary.columns = [
      { width: 32 }, 
      { width: 28 }, 
      { width: 24 }
    ];

    // Header Ela Parfum
    wsSummary.addRow(['ELA PARFUM - LAPORAN PENJUALAN']);
    wsSummary.getCell('A1').font = titleFont;
    wsSummary.mergeCells('A1:C1');

    const periodeStr = timeRange === 'custom' ? `${customStart} s/d ${customEnd}` : timeRange.replace('-', ' ').toUpperCase();
    const storeStr = selectedStore === 'all' ? 'SEMUA CABANG' : `CABANG ${selectedStore.toUpperCase()}`;
    wsSummary.addRow([`Periode: ${periodeStr} | Filter Toko: ${storeStr} | Dicetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`]);
    wsSummary.getCell('A2').font = italicFont;
    wsSummary.mergeCells('A2:C2');
    wsSummary.addRow([]);

    // Table 1: Indikator Utama
    const kpiHead = wsSummary.addRow(['RINGKASAN UTAMA (KPI)', 'TOTAL / NILAI', 'KETERANGAN']);
    kpiHead.eachCell(cell => {
      cell.font = headerFontWhite;
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const kpiData = [
      ['Total Pemasukan / Omzet Lunas', formatIDR(totalOmzet), 'Total dana masuk tervalidasi'],
      ['Total Transaksi Selesai / Lunas', `${totalTransaksi} Transaksi`, 'Jumlah order berstatus paid'],
      ['Rata-rata Penjualan per Pesanan', formatIDR(avgOrderValue), 'Average Order Value (AOV)'],
      ['Parfum Jadi Terlaris', topRegular, 'Kategori produk reguler/jadi'],
      ['Bibit Parfum Terlaris', topBibit, 'Kategori bibit custom refill']
    ];

    kpiData.forEach(d => {
      const r = wsSummary.addRow(d);
      r.eachCell((cell, col) => {
        cell.font = normalFont;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'right' : 'left' };
      });
      r.getCell(1).font = normalFontBold;
    });

    wsSummary.addRow([]);

    // Table 2: Breakdown Cabang
    const branchHead = wsSummary.addRow(['CABANG TOKO', 'TOTAL OMZET', 'JUMLAH TRANSAKSI']);
    branchHead.eachCell(cell => {
      cell.font = headerFontWhite;
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const storeStats: Record<string, { total: number; count: number }> = {
      'Condet': { total: 0, count: 0 },
      'Rawabelong': { total: 0, count: 0 },
      'Tangerang': { total: 0, count: 0 }
    };

    filteredOrders.forEach(o => {
      const branch = getOrderStore(o);
      if (!storeStats[branch]) storeStats[branch] = { total: 0, count: 0 };
      storeStats[branch].total += o.total;
      storeStats[branch].count += 1;
    });

    ['Condet', 'Rawabelong', 'Tangerang'].forEach(b => {
      const r = wsSummary.addRow([`Toko Ela Parfum - ${b}`, formatIDR(storeStats[b]?.total || 0), `${storeStats[b]?.count || 0} pesanan`]);
      r.eachCell((cell, col) => {
        cell.font = normalFont;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: col === 2 || col === 3 ? 'right' : 'left' };
      });
      r.getCell(1).font = normalFontBold;
    });

    wsSummary.addRow([]);

    // Table 3: Breakdown Metode Pembayaran
    const payHead = wsSummary.addRow(['METODE PEMBAYARAN', 'TOTAL OMZET', 'JUMLAH TRANSAKSI']);
    payHead.eachCell(cell => {
      cell.font = headerFontWhite;
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const payStats: Record<string, { total: number; count: number }> = {};
    filteredOrders.forEach(o => {
      const pm = o.payment_method || 'Lainnya';
      if (!payStats[pm]) payStats[pm] = { total: 0, count: 0 };
      payStats[pm].total += o.total;
      payStats[pm].count += 1;
    });

    Object.keys(payStats).sort().forEach(pm => {
      const r = wsSummary.addRow([pm, formatIDR(payStats[pm].total), `${payStats[pm].count} pesanan`]);
      r.eachCell((cell, col) => {
        cell.font = normalFont;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: col === 2 || col === 3 ? 'right' : 'left' };
      });
      r.getCell(1).font = normalFontBold;
    });

    // ==========================================
    // SHEET 2+: DETAIL HARIAN PER TANGGAL
    // ==========================================
    const byDate: Record<string, Order[]> = {};
    filteredOrders.forEach(o => {
      const d = o.created_at.split('T')[0];
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(o);
    });

    Object.keys(byDate).sort().forEach(date => {
      const wsDate = workbook.addWorksheet(date, {
        pageSetup: { 
          paperSize: 9, // A4
          orientation: 'landscape', 
          fitToPage: true, 
          fitToWidth: 1, 
          fitToHeight: 0, 
          margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } 
        }
      });

      wsDate.columns = [
        { width: 11 }, // 1. Waktu
        { width: 20 }, // 2. Kode Pesanan
        { width: 14 }, // 3. Toko
        { width: 18 }, // 4. Pelanggan
        { width: 28 }, // 5. Produk
        { width: 11 }, // 6. Ukuran
        { width: 7 },  // 7. Qty
        { width: 14 }, // 8. Harga Satuan
        { width: 14 }, // 9. Subtotal Item
        { width: 14 }, // 10. Biaya Tambahan
        { width: 15 }, // 11. Total Pesanan
        { width: 16 }, // 12. Metode Bayar
        { width: 12 }  // 13. Status
      ];

      // Sheet Title
      wsDate.addRow(['Ela Parfum - Laporan Penjualan Harian']);
      wsDate.getCell('A1').font = titleFont;
      wsDate.mergeCells('A1:M1');

      wsDate.addRow([`Tanggal: ${date} | Filter Toko: ${storeStr}`]);
      wsDate.getCell('A2').font = italicFont;
      wsDate.mergeCells('A2:M2');
      wsDate.addRow([]);

      // Header Row
      const headerRow = wsDate.addRow([
        'Waktu', 'Kode Pesanan', 'Toko', 'Pelanggan', 'Produk', 'Ukuran', 
        'Qty', 'Harga Satuan', 'Subtotal Item', 'Biaya Tambahan', 'Total Pesanan', 'Metode Bayar', 'Status'
      ]);
      headerRow.height = 26;
      headerRow.eachCell(cell => {
        cell.font = headerFontWhite;
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });

      let dailyTotal = 0;

      byDate[date].forEach(order => {
        const time = new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        dailyTotal += order.total;
        const storeName = getOrderStore(order);

        const totalItemsSubtotal = order.order_items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
        const biayaTambahan = order.total - totalItemsSubtotal;
        const items = order.order_items && order.order_items.length > 0 ? order.order_items : null;

        const startRowNumber = wsDate.lastRow!.number + 1;

        if (items) {
          items.forEach((item: any, idx: number) => {
            const row = wsDate.addRow([
              idx === 0 ? time : '',
              idx === 0 ? order.order_code : '',
              idx === 0 ? storeName : '',
              idx === 0 ? order.customer_name : '',
              item.perfume_name,
              item.size_label,
              item.quantity,
              item.price,
              item.subtotal,
              idx === 0 ? biayaTambahan : '',
              idx === 0 ? order.total : '',
              idx === 0 ? order.payment_method : '',
              idx === 0 ? order.status : ''
            ]);
            row.height = 20;

            row.eachCell((cell, colNumber) => {
              cell.font = normalFont;
              cell.border = thinBorder;
              cell.alignment = { vertical: 'middle', wrapText: true };

              if ([1, 2, 3, 4, 6, 7, 12, 13].includes(colNumber)) {
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
              }

              if (colNumber >= 8 && colNumber <= 11 && typeof cell.value === 'number') {
                cell.numFmt = '"Rp"#,##0';
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
              }
            });
          });

          const endRowNumber = wsDate.lastRow!.number;

          // Merge vertical cells if order has multiple items
          if (items.length > 1) {
            const colsToMerge = [1, 2, 3, 4, 10, 11, 12, 13];
            colsToMerge.forEach(col => {
              wsDate.mergeCells(startRowNumber, col, endRowNumber, col);
              for (let r = startRowNumber; r <= endRowNumber; r++) {
                wsDate.getCell(r, col).border = thinBorder;
              }
            });
          }
        } else {
          // No items
          const row = wsDate.addRow([
            time, order.order_code, storeName, order.customer_name, '-', '-', 0, 0, 0, biayaTambahan, order.total, order.payment_method, order.status
          ]);
          row.height = 20;
          row.eachCell((cell, colNumber) => {
            cell.font = normalFont;
            cell.border = thinBorder;
            cell.alignment = { vertical: 'middle', wrapText: true };
            if ([1, 2, 3, 4, 6, 7, 12, 13].includes(colNumber)) {
              cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            }
            if (colNumber >= 8 && colNumber <= 11 && typeof cell.value === 'number') {
              cell.numFmt = '"Rp"#,##0';
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
            }
          });
        }
      });

      // Total Row (Directly attached to the table, NO floating gap!)
      const totalRow = wsDate.addRow(['TOTAL KESELURUHAN (HARI INI)', '', '', '', '', '', '', '', '', '', dailyTotal, '', '']);
      totalRow.height = 24;

      // Merge A to J (1 to 10) for label, and L to M (12 to 13) for closing the box
      wsDate.mergeCells(totalRow.number, 1, totalRow.number, 10);
      wsDate.mergeCells(totalRow.number, 12, totalRow.number, 13);

      for (let i = 1; i <= 13; i++) {
        const cell = totalRow.getCell(i);
        cell.border = doubleBottomBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      }

      totalRow.getCell(1).font = headerFontDark;
      totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

      totalRow.getCell(11).font = headerFontDark;
      totalRow.getCell(11).numFmt = '"Rp"#,##0';
      totalRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `ElaParfum_Penjualan_${new Date().getTime()}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--c-ink)', margin: 0, letterSpacing: '-0.02em' }}>Statistik Penjualan</h1>
          <p style={{ color: 'var(--c-ink-muted)', marginTop: '0.25rem' }}>Pantau performa omzet dan riwayat transaksi Ela Parfum.</p>
        </div>
        <button 
          onClick={handleExportExcel}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            padding: '0.75rem 1.25rem', backgroundColor: 'var(--c-surface-1)', 
            border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', 
            color: 'var(--c-ink)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' 
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--c-gold)'}
          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--c-border)'}
        >
          <Download size={18} />
          Export Excel
        </button>
      </div>

      {/* Time Controls */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', gap: '1rem', 
        padding: '1.25rem', backgroundColor: 'var(--c-surface-1)', 
        borderRadius: 'var(--r-lg)', border: '1px solid var(--c-border)' 
      }}>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          {/* Rentang Waktu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Rentang:</span>
            <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--c-surface-2)', padding: '0.25rem', borderRadius: 'var(--r-md)' }}>
              {(['hari-ini', '7-hari', '30-hari', '3-bulan', '1-tahun', 'semua', 'custom'] as TimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  style={{
                    padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: 500,
                    borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: timeRange === r ? 'var(--c-surface-1)' : 'transparent',
                    color: timeRange === r ? 'var(--c-ink)' : 'var(--c-ink-muted)',
                    boxShadow: timeRange === r ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {r.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
          
          {/* Granularitas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Tampilkan per:</span>
            <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--c-surface-2)', padding: '0.25rem', borderRadius: 'var(--r-md)' }}>
              {(['menit', 'jam', 'harian', 'mingguan', 'bulanan', 'tahunan'] as Granularity[]).map(g => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  style={{
                    padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: 500,
                    borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: granularity === g ? 'var(--c-surface-1)' : 'transparent',
                    color: granularity === g ? 'var(--c-ink)' : 'var(--c-ink-muted)',
                    boxShadow: granularity === g ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Toko / Cabang */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Toko:</span>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              style={{
                padding: '0.5rem', fontSize: '0.8125rem', fontWeight: 500,
                borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)', cursor: 'pointer',
                backgroundColor: 'var(--c-surface-1)', color: 'var(--c-ink)', outline: 'none'
              }}
            >
              <option value="all">Semua Toko</option>
              <option value="Condet">Condet</option>
              <option value="Rawabelong">Rawabelong</option>
              <option value="Tangerang">Tangerang</option>
            </select>
          </div>
        </div>

        {timeRange === 'custom' && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--c-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={16} color="var(--c-ink-muted)" />
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} 
                style={{ padding: '0.375rem 0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--c-border)', backgroundColor: 'var(--c-surface-1)', color: 'var(--c-ink)' }} />
            </div>
            <span style={{ color: 'var(--c-ink-muted)' }}>sampai</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={16} color="var(--c-ink-muted)" />
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} 
                style={{ padding: '0.375rem 0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--c-border)', backgroundColor: 'var(--c-surface-1)', color: 'var(--c-ink)' }} />
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { title: 'Total Omzet', value: formatIDR(totalOmzet), icon: DollarSign, color: '#10B981' },
          { title: 'Total Transaksi', value: totalTransaksi, icon: PackageCheck, color: '#F59E0B' },
          { title: 'Rata-rata per Transaksi', value: formatIDR(avgOrderValue), icon: TrendingUp, color: '#3B82F6' },
          { title: 'Parfum Jadi Terlaris', value: topRegular, icon: Sparkles, color: '#8B5CF6' },
          { title: 'Bibit Terlaris', value: topBibit, icon: Droplet, color: '#EC4899' }
        ].map((card, idx) => (
          <div key={idx} style={{ 
            backgroundColor: 'var(--c-surface-1)', border: '1px solid var(--c-border)', 
            borderRadius: 'var(--r-lg)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem'
          }}>
            <div style={{ 
              width: '2.75rem', height: '2.75rem', borderRadius: 'var(--r-full)', flexShrink: 0,
              backgroundColor: `${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <card.icon color={card.color} size={22} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--c-ink-muted)', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.title}</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--c-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={String(card.value)}>
                {card.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div style={{ backgroundColor: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--c-ink)', margin: '0 0 1rem 0' }}>Grafik Pendapatan</h2>
        <div style={{ height: '400px', width: '100%' }}>
          {chartData.categories.length > 0 ? (
            <Chart key={`chart-${timeRange}-${granularity}-${selectedStore}-${theme}`} options={chartOptions} series={chartData.series} type="area" height="100%" />
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ink-muted)' }}>
              Tidak ada data di rentang waktu ini.
            </div>
          )}
        </div>
      </div>

      {/* Transactions Table Section */}
      <div style={{ backgroundColor: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        
        {/* Table Toolbar */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--c-border)', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--c-ink)', margin: 0, display: 'flex', alignItems: 'center' }}>Riwayat Transaksi</h2>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-ink-muted)' }} />
              <input 
                type="text" 
                placeholder="Cari kode/pelanggan..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '0.5rem 0.5rem 0.5rem 2.25rem', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)', backgroundColor: 'var(--c-surface-2)', color: 'var(--c-ink)', width: '200px' }}
              />
            </div>
            
            <div style={{ position: 'relative' }}>
              <Filter size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-ink-muted)' }} />
              <select 
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '0.5rem 2rem 0.5rem 2.25rem', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)', backgroundColor: 'var(--c-surface-2)', color: 'var(--c-ink)', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="all">Semua Status</option>
                <option value="paid">Paid</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <select 
              value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)', backgroundColor: 'var(--c-surface-2)', color: 'var(--c-ink)', cursor: 'pointer' }}
            >
              <option value="all">Semua Metode</option>
              <option value="transfer_bank">Transfer Bank</option>
              <option value="qris">QRIS</option>
              <option value="cash">Cash / COD</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--c-surface-2)', color: 'var(--c-ink-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--c-border)' }}>Waktu</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--c-border)' }}>Kode & Pelanggan</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--c-border)' }}>Toko</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--c-border)' }}>Produk</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--c-border)' }}>Pembayaran</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--c-border)' }}>Total</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--c-border)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? paginatedData.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--c-border)', transition: 'background-color 0.2s', cursor: 'default' }}>
                  <td style={{ padding: '1rem', color: 'var(--c-ink)', fontSize: '0.875rem' }}>
                    <div>{new Date(order.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div style={{ color: 'var(--c-ink-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--c-ink)', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 600 }}>{order.order_code}</div>
                    <div style={{ color: 'var(--c-ink-muted)', marginTop: '0.25rem' }}>{order.customer_name}</div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--c-ink)', fontSize: '0.875rem' }}>
                    <span style={{ 
                      display: 'inline-block', padding: '0.25rem 0.625rem', borderRadius: 'var(--r-full)', 
                      fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: getOrderStore(order) === 'Condet' ? 'rgba(59, 130, 246, 0.1)' : (getOrderStore(order) === 'Tangerang' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                      color: getOrderStore(order) === 'Condet' ? '#3B82F6' : (getOrderStore(order) === 'Tangerang' ? '#F59E0B' : '#10B981')
                    }}>
                      {getOrderStore(order)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--c-ink)', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {order.order_items?.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 500 }}>{item.quantity}x</span>
                          <span>{item.perfume_name} ({item.size_label})</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--c-ink-muted)', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                    {order.payment_method.replace('_', ' ')}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--c-ink)', fontSize: '0.875rem', fontWeight: 600 }}>
                    {formatIDR(order.total)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {getStatusBadge(order.status)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--c-ink-muted)' }}>
                    Tidak ada transaksi yang cocok dengan kriteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {tableData.length > 0 && (
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ color: 'var(--c-ink-muted)', fontSize: '0.875rem' }}>
              Menampilkan {((page - 1) * perPage) + 1} - {Math.min(page * perPage, tableData.length)} dari {tableData.length} data
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--c-ink-muted)' }}>
                Baris per halaman:
                <select 
                  value={perPage} 
                  onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                  style={{ padding: '0.25rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--c-border)', backgroundColor: 'var(--c-surface-2)', color: 'var(--c-ink)', cursor: 'pointer' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  style={{ padding: '0.25rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--c-border)', backgroundColor: page === 1 ? 'transparent' : 'var(--c-surface-2)', color: page === 1 ? 'var(--c-border)' : 'var(--c-ink)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                ><ChevronLeft size={16} /></button>
                <button 
                  disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  style={{ padding: '0.25rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--c-border)', backgroundColor: page === totalPages ? 'transparent' : 'var(--c-surface-2)', color: page === totalPages ? 'var(--c-border)' : 'var(--c-ink)', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                ><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
