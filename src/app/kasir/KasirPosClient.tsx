"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  PosInitialData,
  PosProductItem,
  PosBibitItem,
  PosBottleItem,
  PosBillItem,
  getPosInitialData,
} from "./actions";
import { kasirLogout } from "./login/actions";
import KasirMixModal from "./components/KasirMixModal";
import KasirPaymentModal from "./components/KasirPaymentModal";
import KasirReceiptModal from "./components/KasirReceiptModal";
import {
  Store,
  Search,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Droplets,
  Wine,
  Layers,
  Banknote,
  QrCode,
  Building2,
  LogOut,
  Clock,
  User,
  MapPin,
  RefreshCw,
  Check,
  CheckCircle2,
  ChevronDown,
  X,
  History,
  Globe,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { formatRupiah } from "@/lib/types";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme-context";
import { Moon, Sun } from "lucide-react";

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

interface KasirPosClientProps {
  initialData?: PosInitialData;
  initialStoreId?: number;
  mayarDone?: boolean;
  mayarCode?: string;
}

export default function KasirPosClient({
  initialData,
  initialStoreId,
  mayarDone,
  mayarCode,
}: KasirPosClientProps) {
  const { theme, toggle: toggleTheme } = useTheme();

  // Redirect handling dari Mayar Checkout
  useEffect(() => {
    if (mayarDone && mayarCode) {
      try {
        localStorage.removeItem("elaparfum_pos_draft_v1");
      } catch {}
      try {
        localStorage.setItem(
          "elaparfum_pos_paid_broadcast",
          JSON.stringify({ code: mayarCode, at: Date.now() })
        );
      } catch {}
      if (typeof window !== "undefined" && window.opener) {
        window.close();
      }
    }
  }, [mayarDone, mayarCode]);

  // State Data
  const [data, setData] = useState<PosInitialData | null>(initialData || null);
  const [activeStoreId, setActiveStoreId] = useState<number>(initialData?.activeStoreId || initialStoreId || 1);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(!initialData);
  const [initError, setInitError] = useState<string | null>(null);
  const [loadingStore, setLoadingStore] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Tab & Search State
  const [activeCategory, setActiveCategory] = useState<"ALL" | "PRODUCT" | "BIBIT" | "BOTTLE">("BIBIT");
  const [bibitCollection, setBibitCollection] = useState<"ALL" | "GLOBAL" | "ARABIAN">("ALL");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "price_asc" | "price_desc" | "stock_desc" | "stock_asc">("name_asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 24;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, bibitCollection, sortBy]);

  // Bill / Cart State
  const POS_DRAFT_KEY = "elaparfum_pos_draft_v1";
  const [customerName, setCustomerName] = useState<string>("Customer Toko");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [billItems, setBillItems] = useState<PosBillItem[]>([]);
  const [discountType, setDiscountType] = useState<"nominal" | "percent">("nominal");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);

  // 1. Pulihkan draft transaksi aktif dari localStorage saat browser dibuka / di-refresh / crash recovery
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        // Pertahankan draft hingga 7 hari (aman jika PC dimatikan atau browser crash lama)
        if (Date.now() - (draft.updatedAt || 0) < 7 * 24 * 60 * 60 * 1000) {
          let hasContent = false;
          if (typeof draft.customerName === "string" && draft.customerName.trim()) {
            setCustomerName(draft.customerName);
            if (draft.customerName !== "Customer Toko") hasContent = true;
          }
          if (typeof draft.customerPhone === "string" && draft.customerPhone.trim()) {
            setCustomerPhone(draft.customerPhone);
            hasContent = true;
          }
          if (Array.isArray(draft.billItems) && draft.billItems.length > 0) {
            setBillItems(draft.billItems);
            hasContent = true;
          }
          if (draft.discountType === "nominal" || draft.discountType === "percent") {
            setDiscountType(draft.discountType);
          }
          if (typeof draft.discountValue === "number") {
            setDiscountValue(draft.discountValue);
          }

          if (hasContent) {
            toast.info(
              `Draft pesanan kasir${draft.customerName && draft.customerName !== "Customer Toko" ? ` (${draft.customerName})` : ""} berhasil dipulihkan.`,
              { duration: 3500 }
            );
          }
        } else {
          localStorage.removeItem(POS_DRAFT_KEY);
        }
      }
    } catch (e) {
      console.error("Gagal memulihkan draft transaksi kasir:", e);
    } finally {
      setHasRestoredDraft(true);
    }
  }, []);

  // 2. Simpan draft transaksi secara otomatis setiap kali ada perubahan data kasir
  useEffect(() => {
    if (!hasRestoredDraft) return;

    const isDefault =
      billItems.length === 0 &&
      (customerName === "Customer Toko" || customerName.trim() === "") &&
      !customerPhone.trim() &&
      discountValue === 0;

    if (isDefault) {
      try {
        localStorage.removeItem(POS_DRAFT_KEY);
      } catch {}
      return;
    }

    try {
      const draft = {
        customerName,
        customerPhone,
        billItems,
        discountType,
        discountValue,
        updatedAt: Date.now(),
      };
      localStorage.setItem(POS_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.error("Gagal menyimpan draft kasir:", e);
    }
  }, [hasRestoredDraft, customerName, customerPhone, billItems, discountType, discountValue]);

  // Modals State
  const [mixingBibit, setMixingBibit] = useState<PosBibitItem | null>(null);
  const [selectedProductForSize, setSelectedProductForSize] = useState<PosProductItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showStorePicker, setShowStorePicker] = useState<boolean>(false);
  const [showRecentModal, setShowRecentModal] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: number;
    orderCode: string;
    paymentMethod: string;
    cashReceived?: number;
    cashChange?: number;
  } | null>(null);

  // Fetch initial data on client mount if not passed via SSR
  useEffect(() => {
    if (initialData) return;

    let isMounted = true;
    const loadTerminal = async () => {
      try {
        setLoadingInitial(true);
        const res = await getPosInitialData(initialStoreId);
        if (!isMounted) return;

        if (res.data) {
          setData(res.data);
          setActiveStoreId(res.data.activeStoreId);
        } else {
          setInitError(res.error || "Gagal memuat data kasir");
          if (res.error?.includes("login") || res.error?.includes("Sesi")) {
            window.location.href = "/login";
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setInitError(err.message || "Gagal menghubungkan ke terminal kasir.");
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    loadTerminal();
    return () => {
      isMounted = false;
    };
  }, [initialData, initialStoreId]);

  // Clock WIB Real-time
  const [currentTime, setCurrentTime] = useState<string>("");
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Background Auto-Sync Stok Cabang setiap 45 detik & saat tab kembali aktif
  useEffect(() => {
    if (!data) return;
    const syncStock = async () => {
      try {
        const res = await getPosInitialData(activeStoreId);
        if (res.data) {
          setData(res.data);
        }
      } catch {
        // Silent fail on background poll
      }
    };

    const interval = setInterval(syncStock, 45000);
    window.addEventListener("focus", syncStock);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", syncStock);
    };
  }, [data, activeStoreId]);

  // Manual Trigger Sync Stok
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await getPosInitialData(activeStoreId);
      if (res.data) {
        setData(res.data);
        toast.success(`Stok Cabang ${activeStore?.name} berhasil disinkronkan real-time.`);
      } else {
        toast.error(res.error || "Gagal menyinkronkan data stok.");
      }
    } catch {
      toast.error("Gagal menyinkronkan data.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: Focus Search
      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F2: Tab Bibit
      if (e.key === "F2") {
        e.preventDefault();
        setActiveCategory("BIBIT");
      }
      // F3: Tab Produk Jadi
      if (e.key === "F3") {
        e.preventDefault();
        setActiveCategory("PRODUCT");
      }
      // F4: Bayar Tunai
      if (e.key === "F4" && billItems.length > 0 && !showPaymentModal && !mixingBibit) {
        e.preventDefault();
        setShowPaymentModal(true);
      }
      // Escape: Close Modals
      if (e.key === "Escape") {
        if (selectedProductForSize) setSelectedProductForSize(null);
        if (mixingBibit) setMixingBibit(null);
        if (showPaymentModal) setShowPaymentModal(false);
        if (showStorePicker) setShowStorePicker(false);
        if (showRecentModal) setShowRecentModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [billItems, showPaymentModal, mixingBibit, selectedProductForSize, showStorePicker, showRecentModal]);

  // Cabang Toko Aktif
  const activeStore = useMemo(() => {
    if (!data) return null;
    return data.stores.find((s) => s.id === activeStoreId) || data.stores[0];
  }, [data, activeStoreId]);

  // Switch Branch
  const handleSwitchStore = async (storeId: number) => {
    if (storeId === activeStoreId) {
      setShowStorePicker(false);
      return;
    }
    setLoadingStore(true);
    setShowStorePicker(false);
    try {
      const res = await getPosInitialData(storeId);
      if (res.data) {
        setData(res.data);
        setActiveStoreId(storeId);
        toast.success(`Beralih ke Cabang ${res.data.stores.find((s) => s.id === storeId)?.name}`);
      } else {
        toast.error(res.error || "Gagal beralih cabang.");
      }
    } catch {
      toast.error("Terjadi kesalahan saat memuat data cabang.");
    } finally {
      setLoadingStore(false);
    }
  };

  // Kalkulasi Subtotal & Diskon
  const subtotal = useMemo(() => {
    return billItems.reduce((acc, it) => acc + it.subtotal, 0);
  }, [billItems]);

  const discountAmount = useMemo(() => {
    if (discountType === "nominal") return Math.min(subtotal, Math.max(0, discountValue));
    return Math.round((subtotal * Math.min(100, Math.max(0, discountValue))) / 100);
  }, [subtotal, discountType, discountValue]);

  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Tambah Item ke Bill
  const handleAddToCart = (item: PosBillItem) => {
    setBillItems((prev) => {
      // Cek apakah item regular/botol yang sama sudah ada di bill
      if (item.type === "product" && item.meta.sizeId) {
        const existingIdx = prev.findIndex((p) => p.meta.sizeId === item.meta.sizeId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const newQty = updated[existingIdx].quantity + item.quantity;
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: newQty,
            subtotal: newQty * updated[existingIdx].price,
          };
          return updated;
        }
      } else if (item.type === "bottle" && item.meta.bottleId) {
        const existingIdx = prev.findIndex((p) => p.meta.bottleId === item.meta.bottleId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const newQty = updated[existingIdx].quantity + item.quantity;
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: newQty,
            subtotal: newQty * updated[existingIdx].price,
          };
          return updated;
        }
      }
      return [item, ...prev];
    });
    toast.success(`Ditambahkan ke Bill: ${item.title}`);
  };

  // Ubah Qty Item
  const handleUpdateQty = (index: number, delta: number) => {
    setBillItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, idx) => idx !== index);
      }
      updated[index] = {
        ...updated[index],
        quantity: newQty,
        subtotal: newQty * updated[index].price,
      };
      return updated;
    });
  };

  // Hapus Item
  const handleRemoveItem = (index: number) => {
    setBillItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Reset Bill (Tanpa alert browser, didukung aksi Undo / Batalkan)
  const handleClearBill = () => {
    if (billItems.length === 0 && (customerName === "Customer Toko" || !customerName) && !customerPhone) return;

    const prevItems = [...billItems];
    const prevName = customerName;
    const prevPhone = customerPhone;
    const prevDiscType = discountType;
    const prevDiscVal = discountValue;

    setBillItems([]);
    setDiscountValue(0);
    setCustomerName("Customer Toko");
    setCustomerPhone("");

    try {
      localStorage.removeItem(POS_DRAFT_KEY);
    } catch {}

    toast.info("Daftar transaksi kasir dikosongkan.", {
      action: {
        label: "Batalkan",
        onClick: () => {
          setBillItems(prevItems);
          setCustomerName(prevName);
          setCustomerPhone(prevPhone);
          setDiscountType(prevDiscType);
          setDiscountValue(prevDiscVal);
          toast.success("Daftar transaksi berhasil dipulihkan.");
        },
      },
    });
  };

  // Add Regular Perfume with Size
  const handleAddProductSize = (prod: PosProductItem, size: PosProductItem["sizes"][0]) => {
    const item: PosBillItem = {
      type: "product",
      title: prod.name,
      subtitle: `Parfum Jadi • ${size.size_label}`,
      price: size.price,
      quantity: 1,
      subtotal: size.price,
      meta: {
        perfumeId: prod.id,
        sizeId: size.id,
        sizeLabel: size.size_label,
      },
    };
    handleAddToCart(item);
    setSelectedProductForSize(null);
  };

  // Add Bottle directly
  const handleAddBottle = (bt: PosBottleItem) => {
    const item: PosBillItem = {
      type: "bottle",
      title: bt.name,
      subtitle: `Botol Kemasan Kosong • ${bt.capacity_ml}ml`,
      price: bt.price,
      quantity: 1,
      subtotal: bt.price,
      meta: {
        bottleId: bt.id,
        bottleName: bt.name,
        capacityMl: bt.capacity_ml,
      },
    };
    handleAddToCart(item);
  };

  // Counts per collection for segmented badges
  const bibitCounts = useMemo(() => {
    if (!data) return { all: 0, global: 0, arabian: 0 };
    let global = 0;
    let arabian = 0;
    for (const b of data.bibits) {
      const col = (b.collection || "").toLowerCase();
      if (col.includes("global")) global++;
      if (col.includes("arab") || col.includes("timur")) arabian++;
    }
    return {
      all: data.bibits.length,
      global,
      arabian,
    };
  }, [data]);

  // Filter Catalog
  const filteredProducts = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.products;
    const q = searchQuery.toLowerCase();
    return data.products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.collection.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const filteredBibits = useMemo(() => {
    if (!data) return [];
    let list = data.bibits;

    // Filter Collection
    if (bibitCollection === "GLOBAL") {
      list = list.filter((b) => (b.collection || "").toLowerCase().includes("global"));
    } else if (bibitCollection === "ARABIAN") {
      list = list.filter(
        (b) =>
          (b.collection || "").toLowerCase().includes("arab") ||
          (b.collection || "").toLowerCase().includes("timur")
      );
    }

    // Filter Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.collection.toLowerCase().includes(q) ||
          (b.main_accord && b.main_accord.toLowerCase().includes(q))
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      if (sortBy === "price_asc") return a.price_per_ml - b.price_per_ml;
      if (sortBy === "price_desc") return b.price_per_ml - a.price_per_ml;
      if (sortBy === "stock_desc") return b.stock_ml - a.stock_ml;
      if (sortBy === "stock_asc") return a.stock_ml - b.stock_ml;
      return 0;
    });
  }, [data, bibitCollection, searchQuery, sortBy]);

  const filteredBottles = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.bottles;
    const q = searchQuery.toLowerCase();
    return data.bottles.filter((bt) => bt.name.toLowerCase().includes(q));
  }, [data, searchQuery]);

  // Unified Catalog for "ALL" Tab
  const unifiedCatalog = useMemo(() => {
    const list: Array<
      | { kind: "bibit"; item: PosBibitItem }
      | { kind: "product"; item: PosProductItem }
      | { kind: "bottle"; item: PosBottleItem }
    > = [];
    filteredBibits.forEach((b) => list.push({ kind: "bibit", item: b }));
    filteredProducts.forEach((p) => list.push({ kind: "product", item: p }));
    filteredBottles.forEach((bt) => list.push({ kind: "bottle", item: bt }));
    return list;
  }, [filteredBibits, filteredProducts, filteredBottles]);

  // Active Catalog Items & Pagination Calculation
  const totalItems = useMemo(() => {
    if (activeCategory === "BIBIT") return filteredBibits.length;
    if (activeCategory === "PRODUCT") return filteredProducts.length;
    if (activeCategory === "BOTTLE") return filteredBottles.length;
    return unifiedCatalog.length;
  }, [activeCategory, filteredBibits.length, filteredProducts.length, filteredBottles.length, unifiedCatalog.length]);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Slices for current page
  const paginatedBibits = useMemo(() => {
    if (activeCategory !== "BIBIT") return [];
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBibits.slice(start, start + itemsPerPage);
  }, [activeCategory, filteredBibits, currentPage, itemsPerPage]);

  const paginatedProducts = useMemo(() => {
    if (activeCategory !== "PRODUCT") return [];
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [activeCategory, filteredProducts, currentPage, itemsPerPage]);

  const paginatedBottles = useMemo(() => {
    if (activeCategory !== "BOTTLE") return [];
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBottles.slice(start, start + itemsPerPage);
  }, [activeCategory, filteredBottles, currentPage, itemsPerPage]);

  const paginatedUnified = useMemo(() => {
    if (activeCategory !== "ALL") return [];
    const start = (currentPage - 1) * itemsPerPage;
    return unifiedCatalog.slice(start, start + itemsPerPage);
  }, [activeCategory, unifiedCatalog, currentPage, itemsPerPage]);

  if (mayarDone) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--c-bg, #0a0c0b)",
          color: "var(--c-ink, #ffffff)",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            background: "var(--c-surface-1, #111614)",
            border: "1px solid var(--c-border)",
            borderRadius: "20px",
            padding: "2.5rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "2px solid #10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10b981",
              marginBottom: "1.25rem",
            }}
          >
            <CheckCircle2 size={40} />
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display, serif)",
              fontSize: "1.75rem",
              fontWeight: 700,
              margin: "0 0 0.5rem",
              color: "#10b981",
            }}
          >
            Pembayaran Mayar Berhasil!
          </h2>

          <p
            style={{
              color: "var(--c-ink-muted)",
              fontSize: "0.95rem",
              lineHeight: 1.5,
              margin: "0 0 1.5rem",
            }}
          >
            Tagihan <strong>{mayarCode || "Transaksi"}</strong> telah terverifikasi lunas di server Mayar dan otomatis disinkronkan ke terminal kasir utama.
          </p>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                if (window.opener) {
                  window.close();
                } else {
                  window.location.href = "/";
                }
              }
            }}
            style={{
              width: "100%",
              padding: "0.85rem",
              borderRadius: "12px",
              background: "var(--c-gold)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.95rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Tutup Tab & Kembali ke Terminal
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--c-bg, #0a0c0b)",
          color: "var(--c-ink, #f0ede8)",
          gap: "1.25rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        {loadingInitial ? (
          <>
            <RefreshCw
              size={36}
              style={{
                color: "var(--c-gold, #c5a880)",
                animation: "spin 1.2s linear infinite",
              }}
            />
            <h2
              style={{
                fontFamily: "var(--font-serif, serif)",
                fontSize: "1.5rem",
                color: "var(--c-gold, #c5a880)",
                margin: 0,
              }}
            >
              Ela Parfum Kasir
            </h2>
            <p style={{ color: "var(--c-ink-muted, #9ca3af)", fontSize: "0.9rem", margin: 0 }}>
              Menghubungkan ke terminal POS cabang...
            </p>
          </>
        ) : (
          <>
            <Building2 size={40} style={{ color: "#ef4444" }} />
            <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--c-ink, #f3f4f6)" }}>
              {initError || "Gagal Membuka Terminal Kasir"}
            </h3>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: "8px",
                  backgroundColor: "var(--c-gold, #c5a880)",
                  color: "#ffffff",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Muat Ulang
              </button>
              <button
                onClick={() => {
                  window.location.href = "/login";
                }}
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  color: "#f3f4f6",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  cursor: "pointer",
                }}
              >
                Login Ulang
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Helper renderers for Catalog Grid
  const renderBibitCard = (b: PosBibitItem) => (
    <div
      key={`bibit-${b.id}`}
      onClick={() => setMixingBibit(b)}
      style={{
        backgroundColor: "var(--c-surface-2, #181e1c)",
        border: "1px solid var(--c-border)",
        borderRadius: "14px",
        padding: "1rem",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "transform 0.15s, border-color 0.15s, box-shadow 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--c-gold, #3b82f6)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.5)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--c-border)";
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "var(--c-gold-dim, rgba(59, 130, 246, 0.15))",
              color: "var(--c-gold-light, #60a5fa)",
            }}
          >
            Bibit Racik
          </span>
          <span style={{ fontSize: "0.75rem", color: b.stock_ml < 500 ? "#f87171" : "#34d399", fontWeight: 600 }}>
            {b.stock_ml.toLocaleString("id-ID")} ml
          </span>
        </div>

        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 4px", color: "var(--c-ink, #ffffff)", lineHeight: 1.3 }}>
          {b.name}
        </h4>
        <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)", display: "block" }}>
          {b.collection} • {b.main_accord || "Artisan"}
        </span>
      </div>

      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--c-border)", paddingTop: "0.6rem" }}>
        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--c-gold-light, #60a5fa)" }}>
          {formatRupiah(b.price_per_ml)}
          <small style={{ fontSize: "0.7rem", color: "var(--c-ink-dim)", fontWeight: 500 }}>/ml</small>
        </span>
        <button
          type="button"
          style={{
            padding: "5px 10px",
            background: "var(--c-gold, #3b82f6)",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Plus size={12} />
          <span>Racik</span>
        </button>
      </div>
    </div>
  );

  const renderProductCard = (p: PosProductItem) => {
    const totalStock = p.sizes.reduce((sum, s) => sum + s.stock, 0);
    const minPrice = p.sizes[0]?.price || 0;
    return (
      <div
        key={`prod-${p.id}`}
        onClick={() => setSelectedProductForSize(p)}
        style={{
          backgroundColor: "var(--c-surface-2, #181e1c)",
          border: "1px solid var(--c-border)",
          borderRadius: "14px",
          padding: "1rem",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          transition: "transform 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--c-teal, #0ea5e9)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--c-border)";
          e.currentTarget.style.transform = "none";
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "rgba(14, 165, 233, 0.15)",
                color: "#38bdf8",
              }}
            >
              Produk Jadi
            </span>
            <span style={{ fontSize: "0.75rem", color: totalStock <= 0 ? "#f87171" : "#34d399", fontWeight: 600 }}>
              Stok: {totalStock} pcs
            </span>
          </div>

          <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 4px", color: "var(--c-ink, #ffffff)", lineHeight: 1.3 }}>
            {p.name}
          </h4>
          <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)", display: "block" }}>
            {p.collection} ({p.sizes.length} varian ukuran)
          </span>
        </div>

        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--c-border)", paddingTop: "0.6rem" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#38bdf8" }}>
            Mulai {formatRupiah(minPrice)}
          </span>
          <button
            type="button"
            style={{
              padding: "5px 10px",
              background: "var(--c-teal, #0ea5e9)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.75rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Plus size={12} />
            <span>Pilih</span>
          </button>
        </div>
      </div>
    );
  };

  const renderBottleCard = (bt: PosBottleItem) => (
    <div
      key={`bottle-${bt.id}`}
      onClick={() => handleAddBottle(bt)}
      style={{
        backgroundColor: "var(--c-surface-2, #181e1c)",
        border: "1px solid var(--c-border)",
        borderRadius: "14px",
        padding: "1rem",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "transform 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--c-border-mid)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--c-border)";
        e.currentTarget.style.transform = "none";
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "rgba(255, 255, 255, 0.08)",
              color: "var(--c-ink-muted)",
            }}
          >
            Botol Kemasan
          </span>
          <span style={{ fontSize: "0.75rem", color: bt.stock < 10 ? "#f87171" : "#34d399", fontWeight: 600 }}>
            Stok: {bt.stock} pcs
          </span>
        </div>

        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 4px", color: "var(--c-ink, #ffffff)", lineHeight: 1.3 }}>
          {bt.name}
        </h4>
        <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)", display: "block" }}>
          Kapasitas {bt.capacity_ml}ml
        </span>
      </div>

      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--c-border)", paddingTop: "0.6rem" }}>
        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--c-ink)" }}>
          {formatRupiah(bt.price)}
        </span>
        <button
          type="button"
          style={{
            padding: "5px 10px",
            background: "var(--c-surface-3, #1f2724)",
            color: "var(--c-ink, #ffffff)",
            border: "1px solid var(--c-border)",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Plus size={12} />
          <span>Beli</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--c-bg, #0a0c0b)",
        color: "var(--c-ink, #f0ede8)",
        fontFamily: "inherit",
        overflow: "hidden",
      }}
    >
      {/* ─────────────────────────────────────────────────── */}
      {/* TOP HEADER / STATUS BAR                            */}
      {/* ─────────────────────────────────────────────────── */}
      <header
        style={{
          height: "64px",
          padding: "0 1.25rem",
          backgroundColor: "var(--c-surface-1, #111614)",
          borderBottom: "1px solid var(--c-border, rgba(255, 255, 255, 0.08))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        {/* Brand & Store Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--c-gold-dim, rgba(59, 130, 246, 0.12))",
                border: "1px solid var(--c-gold, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--c-gold, #3b82f6)",
              }}
            >
              <Store size={18} />
            </div>
            <div>
              <span
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "var(--c-ink, #ffffff)",
                  fontFamily: "var(--font-display, serif)",
                  letterSpacing: "0.02em",
                }}
              >
                ELA PARFUM POS
              </span>
            </div>
          </div>

          {/* Store Switcher Pill */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowStorePicker(!showStorePicker)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "999px",
                background: "var(--c-surface-2, #181e1c)",
                border: "1px solid var(--c-border-mid, rgba(255, 255, 255, 0.13))",
                color: "var(--c-gold-light, #60a5fa)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <MapPin size={13} />
              <span>Cabang {activeStore?.name}</span>
              {data.stores.length > 1 && <ChevronDown size={14} />}
            </button>

            {/* Store Dropdown */}
            {showStorePicker && data.stores.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "calc(100% + 8px)",
                  backgroundColor: "var(--c-surface-1, #111614)",
                  border: "1px solid var(--c-border-mid, rgba(255, 255, 255, 0.13))",
                  borderRadius: "14px",
                  padding: "0.5rem",
                  width: "220px",
                  zIndex: 300,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.7)",
                }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--c-ink-dim, #5a6662)", padding: "4px 8px", textTransform: "uppercase", fontWeight: 700 }}>
                  Ganti Cabang Shift:
                </div>
                {data.stores.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSwitchStore(s.id)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: s.id === activeStoreId ? "var(--c-gold-dim, rgba(59, 130, 246, 0.12))" : "transparent",
                      color: s.id === activeStoreId ? "var(--c-gold-light, #60a5fa)" : "var(--c-ink, #ffffff)",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>{s.name}</span>
                    {s.id === activeStoreId && <Check size={14} color="var(--c-gold, #3b82f6)" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Clock & Shortcuts */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--c-ink)", background: "var(--c-surface-2)", border: "1px solid var(--c-border)", padding: "4px 12px", borderRadius: "8px" }}>
            <Clock size={14} color="var(--c-gold, #F59E0B)" />
            <span style={{ fontWeight: 600 }}>{currentTime}</span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "var(--c-ink-muted)" }}>
            <span style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", padding: "2px 6px", borderRadius: 4 }}>F1: Cari</span>
            <span style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", padding: "2px 6px", borderRadius: 4 }}>F2: Bibit</span>
            <span style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", padding: "2px 6px", borderRadius: 4 }}>F3: Produk</span>
            <span style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", padding: "2px 6px", borderRadius: 4 }}>F4: Bayar</span>
          </div>
        </div>

        {/* Right User & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Sinkron Stok Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Segarkan & Sinkronkan Stok Cabang Real-time"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--c-surface-2)",
              border: "1px solid var(--c-border)",
              color: "var(--c-ink)",
              padding: "0.4rem 0.8rem",
              borderRadius: "10px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: isSyncing ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} style={{ color: "var(--c-gold)" }} />
            <span>{isSyncing ? "Sinkron..." : "Sinkron Stok"}</span>
          </button>

          {/* Riwayat Shift Button */}
          <button
            type="button"
            onClick={() => setShowRecentModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--c-surface-2)",
              border: "1px solid var(--c-border)",
              color: "var(--c-ink)",
              padding: "0.4rem 0.85rem",
              borderRadius: "10px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <History size={14} />
            <span>Shift Hari Ini</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Ganti ke Mode Terang (Light)" : "Ganti ke Mode Gelap (Dark)"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "var(--c-surface-2)",
              border: "1px solid var(--c-border-mid)",
              color: "var(--c-gold)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Cashier Chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: "10px", background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--c-gold)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.75rem" }}>
              {data.user.full_name?.charAt(0) || "K"}
            </div>
            <div style={{ fontSize: "0.8rem" }}>
              <span style={{ fontWeight: 700, color: "var(--c-ink)", display: "block", lineHeight: 1.1 }}>{data.user.full_name}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--c-ink-muted)" }}>{data.user.role}</span>
            </div>
          </div>

          {/* Logout */}
          <form action={kasirLogout}>
            <button
              type="submit"
              title="Keluar dari Terminal Kasir"
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#F87171",
                padding: "0.45rem",
                borderRadius: "10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────── */}
      {/* MAIN BENTO POS WORKSPACE                            */}
      {/* ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT SECTION: CATALOG & QUICK ADD (65%) */}
        <section
          style={{
            flex: "1 1 65%",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--c-border)",
            overflow: "hidden",
            backgroundColor: "var(--c-bg, #0a0c0b)",
          }}
        >
          {/* Search & Category Filter Bar */}
          <div
            style={{
              padding: "1rem 1.25rem",
              backgroundColor: "var(--c-surface-1, #111614)",
              borderBottom: "1px solid var(--c-border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--c-ink-dim, #5a6662)",
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari bibit racikan, nama parfum, atau botol (Tekan F1)..."
                style={{
                  width: "100%",
                  padding: "0.75rem 2.5rem 0.75rem 2.85rem",
                  backgroundColor: "var(--c-bg, #0a0c0b)",
                  border: "1px solid var(--c-border-mid)",
                  borderRadius: "12px",
                  color: "var(--c-ink, #ffffff)",
                  fontSize: "0.95rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "var(--c-ink-dim)",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Category Segmented Tabs */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {[
                { id: "BIBIT", label: "Bibit & Racikan (F2)", icon: Droplets, count: data.bibits.length },
                { id: "PRODUCT", label: "Produk Jadi (F3)", icon: Layers, count: data.products.length },
                { id: "BOTTLE", label: "Botol Kosong", icon: Wine, count: data.bottles.length },
                { id: "ALL", label: "Semua", icon: Sparkles, count: data.bibits.length + data.products.length + data.bottles.length },
              ].map((tab) => {
                const isActive = activeCategory === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id as any)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0.5rem 1rem",
                      borderRadius: "10px",
                      border: isActive ? "1.5px solid var(--c-gold, #3b82f6)" : "1px solid var(--c-border)",
                      background: isActive ? "var(--c-gold-dim, rgba(59, 130, 246, 0.15))" : "var(--c-surface-2, #181e1c)",
                      color: isActive ? "var(--c-gold-light, #60a5fa)" : "var(--c-ink-muted, #8a9491)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        background: isActive ? "var(--c-gold, #3b82f6)" : "var(--c-surface-3, #1f2724)",
                        color: isActive ? "#ffffff" : "var(--c-ink-dim)",
                        fontWeight: 700,
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-Filter: Koleksi Bibit & Sorting */}
            {(activeCategory === "BIBIT" || activeCategory === "ALL") && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  paddingTop: "0.6rem",
                  borderTop: "1px dashed var(--c-border)",
                }}
              >
                {/* Segmented Koleksi Bibit */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", marginRight: "0.25rem", fontWeight: 600 }}>
                    Koleksi:
                  </span>
                  {[
                    { id: "ALL", label: "Semua Bibit", count: bibitCounts.all },
                    { id: "GLOBAL", label: "Global Parfume", icon: Globe, count: bibitCounts.global },
                    { id: "ARABIAN", label: "Arabian Parfume", icon: Sparkles, count: bibitCounts.arabian },
                  ].map((col) => {
                    const isSel = bibitCollection === col.id;
                    const Icon = col.icon;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setBibitCollection(col.id as any)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          border: isSel ? "1.5px solid var(--c-gold, #3b82f6)" : "1px solid var(--c-border)",
                          background: isSel ? "var(--c-gold-dim, rgba(59, 130, 246, 0.15))" : "var(--c-surface-2, #181e1c)",
                          color: isSel ? "var(--c-gold-light, #60a5fa)" : "var(--c-ink-muted, #8a9491)",
                        }}
                      >
                        {Icon && <Icon size={12} />}
                        <span>{col.label}</span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            padding: "1px 6px",
                            borderRadius: "999px",
                            background: isSel ? "var(--c-gold, #3b82f6)" : "var(--c-surface-3, #1f2724)",
                            color: isSel ? "#ffffff" : "var(--c-ink-dim)",
                            fontWeight: 700,
                          }}
                        >
                          {col.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sort Dropdown */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ArrowUpDown size={14} style={{ color: "var(--c-ink-dim)" }} />
                  <span style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", fontWeight: 600 }}>Urutkan:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: "var(--c-surface-2, #181e1c)",
                      color: "var(--c-ink, #ffffff)",
                      border: "1px solid var(--c-border)",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="name_asc">Nama (A - Z)</option>
                    <option value="name_desc">Nama (Z - A)</option>
                    <option value="price_asc">Harga Terendah</option>
                    <option value="price_desc">Harga Tertinggi</option>
                    <option value="stock_desc">Stok Terbanyak</option>
                    <option value="stock_asc">Stok Paling Kritis</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Catalog Grid Scrollable */}
          <div
            style={{
              flex: 1,
              padding: "1.25rem",
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1rem",
              alignContent: "start",
            }}
          >
            {totalItems === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "4rem 1rem",
                  textAlign: "center",
                  color: "var(--c-ink-dim)",
                }}
              >
                <Search size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "var(--c-ink-muted)" }}>
                  Tidak ada item ditemukan
                </p>
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
                  Coba sesuaikan kata kunci pencarian atau ganti filter kategori/koleksi.
                </p>
              </div>
            ) : (
              <>
                {activeCategory === "BIBIT" && paginatedBibits.map(renderBibitCard)}
                {activeCategory === "PRODUCT" && paginatedProducts.map(renderProductCard)}
                {activeCategory === "BOTTLE" && paginatedBottles.map(renderBottleCard)}
                {activeCategory === "ALL" &&
                  paginatedUnified.map((u) => {
                    if (u.kind === "bibit") return renderBibitCard(u.item);
                    if (u.kind === "product") return renderProductCard(u.item);
                    return renderBottleCard(u.item);
                  })}
              </>
            )}
          </div>

          {/* Bottom Pagination Bar */}
          {totalPages > 1 && (
            <div
              style={{
                padding: "0.75rem 1.25rem",
                borderTop: "1px solid var(--c-border)",
                backgroundColor: "var(--c-surface-1, #111614)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.75rem",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: "0.78rem", color: "var(--c-ink-dim)" }}>
                Menampilkan{" "}
                <strong style={{ color: "var(--c-ink)" }}>
                  {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}–
                  {Math.min(currentPage * itemsPerPage, totalItems)}
                </strong>{" "}
                dari <strong style={{ color: "var(--c-ink)" }}>{totalItems}</strong> item
                {activeCategory === "BIBIT" && ` (${totalPages} Hal)`}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 10px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "1px solid var(--c-border)",
                    background: "var(--c-surface-2, #181e1c)",
                    color: currentPage <= 1 ? "var(--c-ink-dim)" : "var(--c-ink)",
                    cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                    opacity: currentPage <= 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                {getPaginationItems(currentPage, totalPages).map((pItem, idx) => {
                  if (pItem === "...") {
                    return (
                      <span
                        key={`dots-${idx}`}
                        style={{ padding: "0 4px", color: "var(--c-ink-dim)", fontSize: "0.75rem" }}
                      >
                        ...
                      </span>
                    );
                  }
                  const isCur = pItem === currentPage;
                  return (
                    <button
                      key={`page-${pItem}`}
                      type="button"
                      onClick={() => setCurrentPage(Number(pItem))}
                      style={{
                        minWidth: "30px",
                        height: "30px",
                        padding: "0 6px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: isCur ? 700 : 500,
                        border: isCur ? "1.5px solid var(--c-gold, #3b82f6)" : "1px solid var(--c-border)",
                        background: isCur ? "var(--c-gold, #3b82f6)" : "var(--c-surface-2, #181e1c)",
                        color: isCur ? "#ffffff" : "var(--c-ink-muted)",
                        cursor: "pointer",
                        transition: "all 0.1s ease",
                      }}
                    >
                      {pItem}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 10px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "1px solid var(--c-border)",
                    background: "var(--c-surface-2, #181e1c)",
                    color: currentPage >= totalPages ? "var(--c-ink-dim)" : "var(--c-ink)",
                    cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                    opacity: currentPage >= totalPages ? 0.4 : 1,
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT SECTION: BILLING & ORDER SUMMARY (35%) */}
        <section
          style={{
            flex: "1 1 35%",
            minWidth: "380px",
            maxWidth: "460px",
            backgroundColor: "var(--c-surface-1, #111614)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderLeft: "1px solid var(--c-border)",
          }}
        >
          {/* Customer Fast Bar */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--c-border)",
              backgroundColor: "var(--c-surface-2, #181e1c)",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--c-ink, #ffffff)", display: "flex", alignItems: "center", gap: 6 }}>
                <User size={14} color="var(--c-gold, #3b82f6)" />
                Informasi Pelanggan Toko
              </span>
              {(billItems.length > 0 || customerName !== "Customer Toko" || customerPhone) && (
                <button
                  type="button"
                  onClick={handleClearBill}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f87171",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Trash2 size={12} />
                  <span>Reset Bill</span>
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <input
                type="text"
                placeholder="Nama Pembeli (Default)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "var(--c-bg, #0a0c0b)",
                  border: "1px solid var(--c-border-mid)",
                  borderRadius: "8px",
                  color: "var(--c-ink, #ffffff)",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
              <input
                type="text"
                placeholder="No. WhatsApp (Struk WA)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "var(--c-bg, #0a0c0b)",
                  border: "1px solid var(--c-border-mid)",
                  borderRadius: "8px",
                  color: "var(--c-ink, #ffffff)",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Bill Items List Scrollable */}
          <div
            style={{
              flex: 1,
              padding: "1rem 1.25rem",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {billItems.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "var(--c-ink-dim, #5a6662)",
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "var(--c-surface-2, #181e1c)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                    border: "1px solid var(--c-border)",
                  }}
                >
                  <ShoppingBag size={28} />
                </div>
                <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--c-ink, #ffffff)", margin: 0 }}>
                  Bill Kasir Kosong
                </h4>
                <p style={{ fontSize: "0.8rem", maxWidth: "220px", marginTop: 4 }}>
                  Klik produk jadi atau racik bibit parfum di sisi kiri untuk memulai.
                </p>
              </div>
            ) : (
              billItems.map((item, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "var(--c-surface-2, #181e1c)",
                    border: "1px solid var(--c-border)",
                    borderRadius: "12px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, paddingRight: "0.5rem" }}>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          background:
                            item.type === "refill"
                              ? "var(--c-gold-dim, rgba(59, 130, 246, 0.15))"
                              : item.type === "product"
                              ? "rgba(14, 165, 233, 0.15)"
                              : "rgba(255, 255, 255, 0.08)",
                          color:
                            item.type === "refill"
                              ? "var(--c-gold-light, #60a5fa)"
                              : item.type === "product"
                              ? "#38bdf8"
                              : "var(--c-ink-muted)",
                          display: "inline-block",
                          marginBottom: 2,
                        }}
                      >
                        {item.type === "refill" ? "Racikan" : item.type === "product" ? "Produk" : "Kemasan"}
                      </span>
                      <h5 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0, color: "var(--c-ink, #ffffff)" }}>
                        {item.title}
                      </h5>
                      {item.subtitle && (
                        <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)", display: "block", marginTop: 2 }}>
                          {item.subtitle}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--c-ink-dim)",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--c-border)", paddingTop: "0.5rem" }}>
                    {/* Stepper Qty */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--c-bg, #0a0c0b)", borderRadius: "8px", padding: "2px 4px", border: "1px solid var(--c-border)" }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(index, -1)}
                        style={{ background: "transparent", border: "none", color: "var(--c-ink-muted)", cursor: "pointer", padding: "2px" }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "20px", textAlign: "center", color: "var(--c-ink)" }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(index, 1)}
                        style={{ background: "transparent", border: "none", color: "var(--c-ink-muted)", cursor: "pointer", padding: "2px" }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--c-gold-light, #60a5fa)" }}>
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing Summary & Checkout Buttons */}
          <div
            style={{
              padding: "1.25rem",
              backgroundColor: "var(--c-surface-2, #181e1c)",
              borderTop: "1px solid var(--c-border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {/* Subtotal Row */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--c-ink-muted)" }}>
              <span>Subtotal ({billItems.reduce((acc, it) => acc + it.quantity, 0)} item):</span>
              <span style={{ fontWeight: 600, color: "var(--c-ink)" }}>{formatRupiah(subtotal)}</span>
            </div>

            {/* Discount Row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--c-ink-muted)" }}>Diskon:</span>
                <button
                  type="button"
                  onClick={() => setDiscountType(discountType === "nominal" ? "percent" : "nominal")}
                  style={{
                    fontSize: "0.7rem",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: "var(--c-surface-3, #1f2724)",
                    border: "1px solid var(--c-border)",
                    color: "var(--c-gold-light, #60a5fa)",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {discountType === "nominal" ? "Rp" : "%"}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  min={0}
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  style={{
                    width: "80px",
                    padding: "2px 6px",
                    backgroundColor: "var(--c-bg, #0a0c0b)",
                    border: "1px solid var(--c-border-mid)",
                    borderRadius: "6px",
                    color: "var(--c-ink, #ffffff)",
                    fontSize: "0.8rem",
                    textAlign: "right",
                    outline: "none",
                  }}
                />
                {discountAmount > 0 && (
                  <span style={{ color: "#f87171", fontWeight: 600 }}>
                    -{formatRupiah(discountAmount)}
                  </span>
                )}
              </div>
            </div>

            {/* Grand Total Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid var(--c-border)",
                paddingTop: "0.6rem",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block" }}>
                  Total Bayar
                </span>
                <span
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "var(--c-gold-light, #60a5fa)",
                    fontFamily: "var(--font-display, serif)",
                  }}
                >
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {/* Fast Cash Button F4 */}
              <button
                type="button"
                disabled={billItems.length === 0}
                onClick={() => setShowPaymentModal(true)}
                style={{
                  padding: "0.85rem 1.35rem",
                  background: "linear-gradient(135deg, var(--c-gold, #3b82f6) 0%, #1e40af 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  cursor: billItems.length === 0 ? "not-allowed" : "pointer",
                  opacity: billItems.length === 0 ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 8px 24px -4px var(--c-gold-glow, rgba(59, 130, 246, 0.3))",
                  transition: "all 0.15s ease",
                }}
              >
                <Banknote size={18} />
                <span>Bayar (F4)</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ─────────────────────────────────────────────────── */}
      {/* MODALS SECTION                                     */}
      {/* ─────────────────────────────────────────────────── */}

      {/* Modal 1: Size Selector for Regular Products */}
      {selectedProductForSize && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 210,
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: "#161B18",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "18px",
              padding: "1.5rem",
              color: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#10B981", fontWeight: 700, textTransform: "uppercase" }}>Pilih Ukuran</span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{selectedProductForSize.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForSize(null)}
                style={{ background: "transparent", border: "none", color: "#9CA3AF", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {selectedProductForSize.sizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={s.stock <= 0}
                  onClick={() => handleAddProductSize(selectedProductForSize, s)}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "10px",
                    background: s.stock <= 0 ? "rgba(255,255,255,0.02)" : "rgba(16, 185, 129, 0.12)",
                    border: s.stock <= 0 ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(16, 185, 129, 0.3)",
                    color: s.stock <= 0 ? "#6B7280" : "#FFFFFF",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: s.stock <= 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.95rem", fontWeight: 700, display: "block" }}>{s.size_label}</span>
                    <span style={{ fontSize: "0.75rem", color: s.stock <= 0 ? "#EF4444" : "#A7F3D0" }}>
                      {s.stock <= 0 ? "Stok Cabang Habis" : `Stok: ${s.stock} pcs`}
                    </span>
                  </div>
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: s.stock <= 0 ? "#6B7280" : "#10B981" }}>
                    {formatRupiah(s.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Kasir Custom Mix Modal */}
      {mixingBibit && (
        <KasirMixModal
          initialBibit={mixingBibit}
          allBibits={data.bibits}
          bottles={data.bottles}
          onClose={() => setMixingBibit(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Modal 3: Payment Modal (Cash, QRIS Inline, Transfer) */}
      {showPaymentModal && (
        <KasirPaymentModal
          payload={{
            storeId: activeStoreId,
            customerName,
            customerPhone,
            items: billItems,
            subtotal,
            discount: discountAmount,
            total: grandTotal,
            cashierName: data.user.full_name,
          }}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={(result) => {
            setShowPaymentModal(false);
            setCompletedOrder({
              ...result,
            });
            // Segera perbarui stok cabang real-time dari database
            getPosInitialData(activeStoreId).then((res) => {
              if (res.data) setData(res.data);
            });
          }}
        />
      )}

      {/* Modal 4: Struk / Receipt Modal */}
      {completedOrder && (
        <KasirReceiptModal
          orderId={completedOrder.orderId}
          orderCode={completedOrder.orderCode}
          storeName={activeStore?.name || "Ela Parfum"}
          storeAddress={activeStore?.address || "Jakarta"}
          cashierName={data.user.full_name}
          customerName={customerName}
          customerPhone={customerPhone}
          paymentMethod={completedOrder.paymentMethod}
          items={billItems}
          subtotal={subtotal}
          discount={discountAmount}
          total={grandTotal}
          cashReceived={completedOrder.cashReceived}
          cashChange={completedOrder.cashChange}
          onNewTransaction={() => {
            setCompletedOrder(null);
            setBillItems([]);
            setDiscountValue(0);
            setCustomerName("Customer Toko");
            setCustomerPhone("");
            try {
              localStorage.removeItem(POS_DRAFT_KEY);
            } catch {}
            // Refresh data stok
            getPosInitialData(activeStoreId).then((res) => {
              if (res.data) setData(res.data);
            });
          }}
        />
      )}

      {/* Modal 5: Riwayat Shift Hari Ini */}
      {showRecentModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 260,
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              backgroundColor: "#161B18",
              border: "1px solid rgba(217, 119, 6, 0.35)",
              borderRadius: "18px",
              padding: "1.5rem",
              color: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <History size={18} color="#F59E0B" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Transaksi Shift Hari Ini</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentModal(false)}
                style={{ background: "transparent", border: "none", color: "#9CA3AF", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {data.recentOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#9CA3AF", fontSize: "0.85rem" }}>
                  Belum ada transaksi di cabang ini hari ini.
                </div>
              ) : (
                data.recentOrders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#FFFFFF" }}>{ord.order_code}</span>
                      <span style={{ fontSize: "0.75rem", color: "#9CA3AF", display: "block" }}>
                        {ord.customer_name || "Customer Toko"} • Kasir: {ord.cashier_name || "-"}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#FBBF24" }}>
                        {formatRupiah(ord.total)}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#10B981", display: "block", textTransform: "uppercase", fontWeight: 700 }}>
                        {ord.payment_method} • Lunas
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
