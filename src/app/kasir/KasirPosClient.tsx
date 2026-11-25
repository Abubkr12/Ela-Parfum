"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  PosInitialData,
  PosProductItem,
  PosBibitItem,
  PosBottleItem,
  PosBillItem,
} from "./actions";
import { kasirLogout } from "./login/actions";
import KasirMixModal from "./components/KasirMixModal";
import KasirPaymentModal from "./components/KasirPaymentModal";
import KasirReceiptModal from "./components/KasirReceiptModal";
import { useModalFocusTrap } from "./components/useModalFocusTrap";
import {
  Store,
  Search,
  LayoutGrid,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Droplets,
  Wine,
  Layers,
  Banknote,
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
  Moon,
  Sun,
  Menu,
} from "lucide-react";
import { formatRupiah } from "@/lib/types";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme-context";
import "./kasir.css";

const CATEGORY_ORDER = ["BIBIT", "PRODUCT", "BOTTLE", "ALL"] as const;

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

function getTerminalHomeUrl() {
  if (typeof window !== "undefined" && !window.location.hostname.startsWith("cashier.")) {
    return "/kasir";
  }
  return "/";
}

function getLoginUrl() {
  if (typeof window !== "undefined" && !window.location.hostname.startsWith("cashier.")) {
    return "/kasir/login?force=1";
  }
  return "/login?force=1";
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

  // Broadcast Mayar checkout completion across tabs and auto-close popup window.
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

  const [data, setData] = useState<PosInitialData | null>(initialData || null);
  const [activeStoreId, setActiveStoreId] = useState<number>(initialData?.activeStoreId || initialStoreId || 1);
  const activeStoreIdRef = useRef<number>(activeStoreId);
  activeStoreIdRef.current = activeStoreId;

  const [loadingInitial, setLoadingInitial] = useState<boolean>(!initialData);
  const [initError, setInitError] = useState<string | null>(null);
  const [loadingStore, setLoadingStore] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [activeCategory, setActiveCategory] = useState<"ALL" | "PRODUCT" | "BIBIT" | "BOTTLE">("BIBIT");
  const [bibitCollection, setBibitCollection] = useState<"ALL" | "GLOBAL" | "ARABIAN">("ALL");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "price_asc" | "price_desc" | "stock_desc" | "stock_asc">("name_asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 24;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, bibitCollection, sortBy]);

  const POS_DRAFT_KEY = "elaparfum_pos_draft_v1";
  const [customerName, setCustomerName] = useState<string>("Customer Toko");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [billItems, setBillItems] = useState<PosBillItem[]>([]);
  const [discountType, setDiscountType] = useState<"nominal" | "percent">("nominal");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);

  const [mixingBibit, setMixingBibit] = useState<PosBibitItem | null>(null);
  const [selectedProductForSize, setSelectedProductForSize] = useState<PosProductItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showStorePicker, setShowStorePicker] = useState<boolean>(false);
  const [showRecentModal, setShowRecentModal] = useState<boolean>(false);
  const [showMobileBill, setShowMobileBill] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const [showMobileSubFilters, setShowMobileSubFilters] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: number;
    orderCode: string;
    paymentMethod: string;
    cashReceived?: number;
    cashChange?: number;
  } | null>(null);

  const storeWrapRef = useRef<HTMLDivElement>(null);
  const storeTriggerRef = useRef<HTMLButtonElement>(null);
  const storeOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const categoryTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mobileBillRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const sizeModalRef = useRef<HTMLDivElement>(null);
  const recentModalRef = useRef<HTMLDivElement>(null);

  const closeMobileBill = useCallback(() => setShowMobileBill(false), []);
  const closeMobileMenu = useCallback(() => setShowMobileMenu(false), []);
  const closeSizeModal = useCallback(() => setSelectedProductForSize(null), []);
  const closeRecentModal = useCallback(() => setShowRecentModal(false), []);

  useModalFocusTrap(showMobileBill, mobileBillRef, { onEscape: closeMobileBill });
  useModalFocusTrap(showMobileMenu, mobileMenuRef, { onEscape: closeMobileMenu });
  useModalFocusTrap(Boolean(selectedProductForSize), sizeModalRef, { onEscape: closeSizeModal });
  useModalFocusTrap(showRecentModal, recentModalRef, { onEscape: closeRecentModal });

  // Clear mobile dialog overlays automatically if viewport expands to desktop split.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const handleViewportChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setShowMobileBill(false);
        setShowMobileMenu(false);
      }
    };
    if (mql.matches) {
      setShowMobileBill(false);
      setShowMobileMenu(false);
    }
    mql.addEventListener("change", handleViewportChange);
    return () => mql.removeEventListener("change", handleViewportChange);
  }, []);

  // Restore active draft up to 7 days old for crash or refresh recovery.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
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

  // Skip persisting once an order is already paid so refresh never restores completed receipts.
  useEffect(() => {
    if (!hasRestoredDraft || completedOrder) return;

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
  }, [hasRestoredDraft, completedOrder, customerName, customerPhone, billItems, discountType, discountValue]);

  // Apply branch stock delta in-place without reloading catalog metadata.
  const applyStockDelta = useCallback(
    (delta: {
      activeStoreId: number;
      bibitStocks: Record<number, number>;
      bottleStocks: Record<number, number>;
      productStocks: Record<number, number>;
      recentOrders: any[];
    }) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activeStoreId: delta.activeStoreId,
          recentOrders: delta.recentOrders || prev.recentOrders,
          bibits: prev.bibits.map((b) => ({
            ...b,
            stock_ml: delta.bibitStocks[b.id] !== undefined ? Number(delta.bibitStocks[b.id]) : b.stock_ml,
          })),
          bottles: prev.bottles.map((bt) => ({
            ...bt,
            stock: delta.bottleStocks[bt.id] !== undefined ? Number(delta.bottleStocks[bt.id]) : bt.stock,
          })),
          products: prev.products.map((p) => ({
            ...p,
            sizes: p.sizes.map((s) => ({
              ...s,
              stock: delta.productStocks[s.id] !== undefined ? Number(delta.productStocks[s.id]) : s.stock,
            })),
          })),
        };
      });
    },
    []
  );

  // Sync branch stocks via lightweight REST delta (~10 KB) to stay under Worker CPU limits.
  const refreshStocks = useCallback(async () => {
    const targetStoreId = activeStoreIdRef.current;
    if (!targetStoreId) return;
    try {
      const res = await fetch(`/api/kasir/data?mode=stocks&storeId=${targetStoreId}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.mode === "stocks" && activeStoreIdRef.current === targetStoreId) {
        applyStockDelta(json);
      }
    } catch {}
  }, [applyStockDelta]);

  // Load initial catalog client-side so SSR stays instant under Worker CPU limits.
  useEffect(() => {
    if (initialData) return;

    let isMounted = true;
    const loadTerminal = async () => {
      try {
        setLoadingInitial(true);
        setInitError(null);
        const url = `/api/kasir/data?mode=full${initialStoreId ? `&storeId=${initialStoreId}` : ""}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!isMounted) return;

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const msg = errJson.error || `Gagal memuat terminal kasir (HTTP ${res.status})`;
          setInitError(msg);
          return;
        }

        const json = await res.json();
        if (json.data) {
          setData(json.data);
          activeStoreIdRef.current = json.data.activeStoreId;
          setActiveStoreId(json.data.activeStoreId);
        } else {
          setInitError(json.error || "Gagal memuat data kasir.");
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

  // Throttle focus sync to 10s so tab switches do not burst Worker CPU.
  const hasLoadedData = Boolean(data);
  const lastSyncTimeRef = useRef<number>(Date.now());
  useEffect(() => {
    if (!hasLoadedData) return;
    const targetStoreId = activeStoreId;

    const syncStock = async () => {
      if (Date.now() - lastSyncTimeRef.current < 10000) return;
      lastSyncTimeRef.current = Date.now();

      try {
        const res = await fetch(`/api/kasir/data?mode=stocks&storeId=${targetStoreId}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.mode === "stocks" && activeStoreIdRef.current === targetStoreId) {
          applyStockDelta(json);
        }
      } catch {}
    };

    const interval = setInterval(syncStock, 60000);
    const handleFocus = () => {
      syncStock();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [hasLoadedData, activeStoreId, applyStockDelta]);

  const handleManualSync = async () => {
    const targetStoreId = activeStoreId;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/kasir/data?mode=stocks&storeId=${targetStoreId}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        toast.error("Gagal menyinkronkan data stok.");
        return;
      }
      const json = await res.json();
      if (json.success && json.mode === "stocks" && activeStoreIdRef.current === targetStoreId) {
        applyStockDelta(json);
        toast.success(`Stok ${activeStore?.name ? `Cabang ${activeStore.name}` : "cabang"} berhasil disinkronkan real-time.`);
      } else if (!json.success) {
        toast.error(json.error || "Gagal menyinkronkan data stok.");
      }
    } catch {
      toast.error("Gagal menyinkronkan data.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Dismiss store selector dropdown cleanly on outside pointer click, focusout, Tab, or Escape.
  useEffect(() => {
    if (!showStorePicker) return;

    const selectedIdx = data?.stores.findIndex((s) => s.id === activeStoreId) ?? 0;
    const focusIdx = selectedIdx >= 0 ? selectedIdx : 0;
    storeOptionRefs.current[focusIdx]?.focus();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (storeWrapRef.current && !storeWrapRef.current.contains(e.target as Node)) {
        setShowStorePicker(false);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (storeWrapRef.current && next && !storeWrapRef.current.contains(next)) {
        setShowStorePicker(false);
      }
    };
    const handleDropdownKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setShowStorePicker(false);
        storeTriggerRef.current?.focus();
      } else if (e.key === "Tab") {
        setShowStorePicker(false);
      }
    };
    const wrapEl = storeWrapRef.current;
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    wrapEl?.addEventListener("focusout", handleFocusOut);
    window.addEventListener("keydown", handleDropdownKey, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      wrapEl?.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("keydown", handleDropdownKey, true);
    };
  }, [showStorePicker, data?.stores, activeStoreId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const anyOverlayOpen = Boolean(
        completedOrder ||
          selectedProductForSize ||
          showRecentModal ||
          showPaymentModal ||
          mixingBibit ||
          showMobileMenu ||
          showMobileBill ||
          showStorePicker
      );
      if (anyOverlayOpen) return;

      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        setActiveCategory("BIBIT");
      } else if (e.key === "F3") {
        e.preventDefault();
        setActiveCategory("PRODUCT");
      } else if (e.key === "F4" && billItems.length > 0) {
        e.preventDefault();
        setShowMobileBill(false);
        setShowPaymentModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    billItems.length,
    completedOrder,
    selectedProductForSize,
    showRecentModal,
    showPaymentModal,
    mixingBibit,
    showMobileMenu,
    showMobileBill,
    showStorePicker,
  ]);

  const activeStore = useMemo(() => {
    if (!data) return null;
    return data.stores.find((s) => s.id === activeStoreId) || data.stores[0];
  }, [data, activeStoreId]);

  // Switch branch via REST delta (~10 KB payload, <1ms CPU).
  const handleSwitchStore = async (storeId: number) => {
    if (storeId === activeStoreId) {
      setShowStorePicker(false);
      storeTriggerRef.current?.focus();
      return;
    }
    setLoadingStore(true);
    setShowStorePicker(false);
    try {
      const res = await fetch(`/api/kasir/data?mode=stocks&storeId=${storeId}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || "Gagal beralih cabang.");
        return;
      }

      const json = await res.json();
      if (json.success && json.mode === "stocks") {
        activeStoreIdRef.current = storeId;
        setActiveStoreId(storeId);
        applyStockDelta(json);
        const storeName = data?.stores.find((s) => s.id === storeId)?.name || `#${storeId}`;
        toast.success(`Beralih ke Cabang ${storeName}`);
      } else {
        toast.error(json.error || "Gagal beralih cabang.");
      }
    } catch {
      toast.error("Terjadi kesalahan saat memuat data cabang.");
    } finally {
      setLoadingStore(false);
      requestAnimationFrame(() => {
        storeTriggerRef.current?.focus();
      });
    }
  };

  const subtotal = useMemo(() => {
    return billItems.reduce((acc, it) => acc + it.subtotal, 0);
  }, [billItems]);

  const totalBillQty = useMemo(() => {
    return billItems.reduce((acc, it) => acc + it.quantity, 0);
  }, [billItems]);

  const hasActiveSubFilter = bibitCollection !== "ALL" || sortBy !== "name_asc";

  const discountAmount = useMemo(() => {
    if (discountType === "nominal") return Math.min(subtotal, Math.max(0, discountValue));
    return Math.round((subtotal * Math.min(100, Math.max(0, discountValue))) / 100);
  }, [subtotal, discountType, discountValue]);

  const grandTotal = Math.max(0, subtotal - discountAmount);

  const handleAddToCart = (item: PosBillItem) => {
    setBillItems((prev) => {
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

  const handleRemoveItem = (index: number) => {
    setBillItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Use non-blocking toast with Undo instead of native confirm().
  const handleClearBill = () => {
    if (
      billItems.length === 0 &&
      (customerName === "Customer Toko" || !customerName) &&
      !customerPhone &&
      discountValue === 0
    ) {
      return;
    }

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

    if (bibitCollection === "GLOBAL") {
      list = list.filter((b) => (b.collection || "").toLowerCase().includes("global"));
    } else if (bibitCollection === "ARABIAN") {
      list = list.filter(
        (b) =>
          (b.collection || "").toLowerCase().includes("arab") ||
          (b.collection || "").toLowerCase().includes("timur")
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.collection.toLowerCase().includes(q) ||
          (b.main_accord && b.main_accord.toLowerCase().includes(q))
      );
    }

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

  const totalItems = useMemo(() => {
    if (activeCategory === "BIBIT") return filteredBibits.length;
    if (activeCategory === "PRODUCT") return filteredProducts.length;
    if (activeCategory === "BOTTLE") return filteredBottles.length;
    return unifiedCatalog.length;
  }, [activeCategory, filteredBibits.length, filteredProducts.length, filteredBottles.length, unifiedCatalog.length]);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

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
      <main className="pos-fallback-screen pos-root" style={{ height: "auto" }}>
        <h1 className="sr-only">Ela Parfum POS Status Pembayaran</h1>
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            background: "var(--pos-surface-modal)",
            border: "1px solid var(--pos-border-control)",
            borderRadius: "20px",
            padding: "2rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              backgroundColor: "var(--pos-soft-success-bg)",
              border: "2px solid var(--pos-success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--pos-success)",
              marginBottom: "1.25rem",
            }}
          >
            <CheckCircle2 size={40} />
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display, serif)",
              fontSize: "1.65rem",
              fontWeight: 700,
              margin: "0 0 0.5rem",
              color: "var(--pos-success)",
            }}
          >
            Pembayaran Mayar Berhasil!
          </h2>

          <p
            style={{
              color: "var(--pos-muted)",
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
                  window.location.href = getTerminalHomeUrl();
                }
              }
            }}
            className="pos-btn-primary"
            style={{ width: "100%" }}
          >
            Tutup Tab & Kembali ke Terminal
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="pos-fallback-screen pos-root" style={{ height: "auto" }}>
        <h1 className="sr-only">Ela Parfum Kasir</h1>
        {loadingInitial ? (
          <>
            <RefreshCw
              size={36}
              aria-hidden="true"
              className="animate-spin"
              style={{ color: "var(--pos-accent-text)" }}
            />
            <h2
              style={{
                fontFamily: "var(--font-display, serif)",
                fontSize: "1.5rem",
                color: "var(--pos-accent-text)",
                margin: 0,
              }}
            >
              Ela Parfum Kasir
            </h2>
            <p style={{ color: "var(--pos-muted)", fontSize: "0.9rem", margin: 0 }}>
              Menghubungkan ke terminal POS cabang...
            </p>
          </>
        ) : (
          <>
            <Building2 size={40} aria-hidden="true" style={{ color: "var(--pos-danger)" }} />
            <h2 style={{ fontSize: "1.1rem", margin: 0, color: "var(--c-ink)" }}>
              {initError || "Gagal Membuka Terminal Kasir"}
            </h2>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="pos-btn-primary"
              >
                Muat Ulang
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
                className="pos-btn-secondary"
              >
                Login Ulang
              </button>
            </div>
          </>
        )}
      </main>
    );
  }

  const renderBibitCard = (b: PosBibitItem) => (
    <button
      key={`bibit-${b.id}`}
      type="button"
      onClick={() => setMixingBibit(b)}
      className="pos-card pos-card--bibit"
    >
      <span className="pos-card-body">
        <span className="pos-card-top">
          <span
            className="pos-card-badge"
            style={{
              background: "var(--c-gold-dim, rgba(59, 130, 246, 0.15))",
              color: "var(--pos-accent-text)",
            }}
          >
            Bibit Racik
          </span>
          <span
            className="pos-card-stock"
            style={{
              color: b.stock_ml < 500 ? "var(--pos-danger)" : "var(--pos-success)",
            }}
          >
            {b.stock_ml.toLocaleString("id-ID")} ml
          </span>
        </span>

        <span className="pos-card-title">{b.name}</span>
        <span className="pos-card-meta">
          {b.collection} • {b.main_accord || "Artisan"}
        </span>
      </span>

      <span className="pos-card-footer">
        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--pos-accent-text)" }}>
          {formatRupiah(b.price_per_ml)}
          <small style={{ fontSize: "0.7rem", color: "var(--pos-muted)", fontWeight: 500 }}>/ml</small>
        </span>
        <span
          className="pos-card-cta"
          style={{
            background: "var(--pos-accent-bg)",
            color: "#ffffff",
          }}
        >
          <Plus size={12} aria-hidden="true" />
          <span>Racik</span>
        </span>
      </span>
    </button>
  );

  const renderProductCard = (p: PosProductItem) => {
    const totalStock = p.sizes.reduce((sum, s) => sum + s.stock, 0);
    const minPrice = p.sizes[0]?.price || 0;
    return (
      <button
        key={`prod-${p.id}`}
        type="button"
        onClick={() => setSelectedProductForSize(p)}
        className="pos-card pos-card--product"
      >
        <span className="pos-card-body">
          <span className="pos-card-top">
            <span
              className="pos-card-badge"
              style={{
                background: "var(--c-teal-dim, rgba(14, 165, 233, 0.15))",
                color: "var(--pos-info-text)",
              }}
            >
              Produk Jadi
            </span>
            <span
              className="pos-card-stock"
              style={{
                color: totalStock <= 0 ? "var(--pos-danger)" : "var(--pos-success)",
              }}
            >
              Stok: {totalStock} pcs
            </span>
          </span>

          <span className="pos-card-title">{p.name}</span>
          <span className="pos-card-meta">
            {p.collection} ({p.sizes.length} varian ukuran)
          </span>
        </span>

        <span className="pos-card-footer">
          <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--pos-info-text)" }}>
            Mulai {formatRupiah(minPrice)}
          </span>
          <span
            className="pos-card-cta"
            style={{
              background: "var(--pos-info-bg)",
              color: "#ffffff",
            }}
          >
            <Plus size={12} aria-hidden="true" />
            <span>Pilih</span>
          </span>
        </span>
      </button>
    );
  };

  const renderBottleCard = (bt: PosBottleItem) => (
    <button
      key={`bottle-${bt.id}`}
      type="button"
      onClick={() => handleAddBottle(bt)}
      className="pos-card pos-card--bottle"
    >
      <span className="pos-card-body">
        <span className="pos-card-top">
          <span
            className="pos-card-badge"
            style={{
              background: "var(--pos-surface-subtle)",
              color: "var(--pos-muted)",
            }}
          >
            Botol Kemasan
          </span>
          <span
            className="pos-card-stock"
            style={{
              color: bt.stock < 10 ? "var(--pos-danger)" : "var(--pos-success)",
            }}
          >
            Stok: {bt.stock} pcs
          </span>
        </span>

        <span className="pos-card-title">{bt.name}</span>
        <span className="pos-card-meta">Kapasitas {bt.capacity_ml}ml</span>
      </span>

      <span className="pos-card-footer">
        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--c-ink)" }}>
          {formatRupiah(bt.price)}
        </span>
        <span
          className="pos-card-cta"
          style={{
            background: "var(--pos-surface-control)",
            color: "var(--c-ink)",
            border: "1px solid var(--pos-border-control)",
          }}
        >
          <Plus size={12} aria-hidden="true" />
          <span>Beli</span>
        </span>
      </span>
    </button>
  );

  const handleCategoryTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") {
      nextIdx = (idx + 1) % CATEGORY_ORDER.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (idx - 1 + CATEGORY_ORDER.length) % CATEGORY_ORDER.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = CATEGORY_ORDER.length - 1;
    }
    if (nextIdx !== null) {
      e.preventDefault();
      setActiveCategory(CATEGORY_ORDER[nextIdx]);
      categoryTabRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <div className="pos-root">
      <header className="pos-header">
        <div className="pos-header-left">
          <div className="pos-brand">
            <div className="pos-brand-icon" aria-hidden="true">
              <Store size={18} />
            </div>
            <span className="pos-brand-title">ELA PARFUM POS</span>
          </div>

          <div className="pos-store-wrap" ref={storeWrapRef}>
            {data.stores.length > 1 ? (
              <button
                ref={storeTriggerRef}
                type="button"
                disabled={loadingStore}
                onClick={() => setShowStorePicker((v) => !v)}
                aria-expanded={showStorePicker}
                aria-haspopup="listbox"
                aria-label={`Cabang aktif: ${activeStore?.name || "Pilih Cabang"}`}
                className="pos-store-pill"
                style={{ opacity: loadingStore ? 0.65 : 1 }}
              >
                <MapPin size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span className="pos-store-pill-text">
                  {loadingStore
                    ? "Memuat cabang..."
                    : activeStore?.name
                    ? `Cabang ${activeStore.name}`
                    : "Pilih Cabang"}
                </span>
                <ChevronDown size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
              </button>
            ) : (
              <div className="pos-store-pill">
                <MapPin size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span className="pos-store-pill-text">
                  {activeStore?.name ? `Cabang ${activeStore.name}` : "Cabang Utama"}
                </span>
              </div>
            )}

            {showStorePicker && data.stores.length > 1 && (
              <div className="pos-store-dropdown">
                <div
                  id="pos-store-listbox-label"
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--pos-muted)",
                    padding: "4px 8px",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  Ganti Cabang Shift:
                </div>
                <div role="listbox" aria-labelledby="pos-store-listbox-label">
                  {data.stores.map((s, idx) => (
                    <button
                      key={s.id}
                      ref={(el) => {
                        storeOptionRefs.current[idx] = el;
                      }}
                      type="button"
                      role="option"
                      aria-selected={s.id === activeStoreId}
                      onClick={() => handleSwitchStore(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          storeOptionRefs.current[(idx + 1) % data.stores.length]?.focus();
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          storeOptionRefs.current[(idx - 1 + data.stores.length) % data.stores.length]?.focus();
                        }
                      }}
                      className={`pos-store-option ${s.id === activeStoreId ? "is-selected" : ""}`}
                    >
                      <span>{s.name}</span>
                      {s.id === activeStoreId && <Check size={14} aria-hidden="true" color="var(--pos-accent-text)" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pos-header-center">
          <div className="pos-clock-pill">
            <Clock size={14} aria-hidden="true" color="var(--pos-warn)" />
            <span style={{ fontWeight: 600 }}>{currentTime}</span>
          </div>

          <div className="pos-shortcuts">
            <span className="pos-shortcut-chip">F1: Cari</span>
            <span className="pos-shortcut-chip">F2: Bibit</span>
            <span className="pos-shortcut-chip">F3: Produk</span>
            <span className="pos-shortcut-chip">F4: Bayar</span>
          </div>
        </div>

        <div className="pos-header-right">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            aria-label={isSyncing ? "Menyinkronkan stok cabang" : "Sinkronkan stok cabang"}
            title="Segarkan & Sinkronkan Stok Cabang Real-time"
            className="pos-header-action-btn pos-header-action-btn--sync"
          >
            <RefreshCw
              size={14}
              aria-hidden="true"
              className={isSyncing ? "animate-spin" : ""}
              style={{ color: "var(--pos-accent-text)" }}
            />
            <span className="pos-btn-label">{isSyncing ? "Sinkron..." : "Sinkron Stok"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRecentModal(true)}
            className="pos-header-action-btn pos-header-desktop-only"
          >
            <History size={14} aria-hidden="true" />
            <span>Shift Hari Ini</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            title={theme === "dark" ? "Ganti ke Mode Terang (Light)" : "Ganti ke Mode Gelap (Dark)"}
            className="pos-theme-btn"
          >
            {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>

          <div className="pos-cashier-chip pos-header-desktop-only">
            <div
              aria-hidden="true"
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--pos-accent-bg)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.75rem",
                flexShrink: 0,
              }}
            >
              {data.user.full_name?.charAt(0) || "K"}
            </div>
            <div style={{ fontSize: "0.8rem", minWidth: 0 }}>
              <span className="pos-cashier-name">{data.user.full_name}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--pos-muted)" }}>{data.user.role}</span>
            </div>
          </div>

          <form action={kasirLogout} className="pos-header-desktop-only">
            <button
              type="submit"
              aria-label="Keluar dari Terminal Kasir"
              title="Keluar dari Terminal Kasir"
              className="pos-logout-btn"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowMobileMenu(true)}
            aria-label="Buka menu kasir"
            aria-expanded={showMobileMenu}
            className="pos-mobile-menu-btn"
          >
            <Menu size={16} aria-hidden="true" />
            <span>Menu</span>
          </button>
        </div>
      </header>

      <main className="pos-workspace">
        <h1 className="sr-only">Ela Parfum Terminal POS Kasir</h1>
        <section className="pos-catalog" aria-labelledby="pos-catalog-heading">
          <h2 id="pos-catalog-heading" className="sr-only">
            Katalog Produk Kasir
          </h2>

          <div className="pos-filter-bar">
            <div className="pos-search-row">
              <div className="pos-search-wrap">
                <Search
                  size={18}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "0.95rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--pos-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  aria-label="Cari bibit racikan, nama parfum, atau botol"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari bibit racikan, parfum, atau botol..."
                  className="pos-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Hapus kata kunci pencarian"
                    onClick={() => setSearchQuery("")}
                    className="pos-search-clear"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>

              {(activeCategory === "BIBIT" || activeCategory === "ALL") && (
                <button
                  type="button"
                  onClick={() => setShowMobileSubFilters((v) => !v)}
                  aria-expanded={showMobileSubFilters}
                  aria-label="Tampilkan filter koleksi dan pengurutan"
                  className={`pos-subfilter-toggle ${showMobileSubFilters || hasActiveSubFilter ? "is-active" : ""}`}
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  <span>Filter</span>
                </button>
              )}
            </div>

            <div className="pos-tabs" role="tablist" aria-label="Kategori katalog">
              {[
                { id: "BIBIT", label: "Bibit & Racikan", kbd: "F2", icon: Droplets, count: data.bibits.length },
                { id: "PRODUCT", label: "Produk Jadi", kbd: "F3", icon: Layers, count: data.products.length },
                { id: "BOTTLE", label: "Botol Kosong", kbd: null, icon: Wine, count: data.bottles.length },
                {
                  id: "ALL",
                  label: "Semua",
                  kbd: null,
                  icon: LayoutGrid,
                  count: data.bibits.length + data.products.length + data.bottles.length,
                },
              ].map((tab, idx) => {
                const isActive = activeCategory === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      categoryTabRefs.current[idx] = el;
                    }}
                    id={`pos-tab-${tab.id.toLowerCase()}`}
                    type="button"
                    role="tab"
                    tabIndex={isActive ? 0 : -1}
                    aria-selected={isActive}
                    aria-controls="pos-catalog-panel"
                    onClick={() => setActiveCategory(tab.id as any)}
                    onKeyDown={(e) => handleCategoryTabKeyDown(e, idx)}
                    className={`pos-tab ${isActive ? "is-active" : ""}`}
                  >
                    <Icon size={15} aria-hidden="true" />
                    <span>
                      {tab.label}
                      {tab.kbd && <span className="pos-kbd-hint"> ({tab.kbd})</span>}
                    </span>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        background: isActive ? "var(--pos-accent-bg)" : "var(--c-surface-3, #1f2724)",
                        color: isActive ? "#ffffff" : "var(--pos-muted)",
                        fontWeight: 700,
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {(activeCategory === "BIBIT" || activeCategory === "ALL") && (
              <div className={`pos-subfilter-row ${showMobileSubFilters ? "is-expanded" : ""}`}>
                <div className="pos-collection-pills" role="group" aria-label="Filter koleksi bibit">
                  <span style={{ fontSize: "0.75rem", color: "var(--pos-muted)", marginRight: "0.25rem", fontWeight: 600 }}>
                    Koleksi:
                  </span>
                  {[
                    { id: "ALL", label: "Semua Bibit", count: bibitCounts.all },
                    { id: "GLOBAL", label: "Global Parfume", icon: Globe, count: bibitCounts.global },
                    { id: "ARABIAN", label: "Arabian Parfume", icon: Droplets, count: bibitCounts.arabian },
                  ].map((col) => {
                    const isSel = bibitCollection === col.id;
                    const Icon = col.icon;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        aria-pressed={isSel}
                        onClick={() => setBibitCollection(col.id as any)}
                        className={`pos-subfilter-pill ${isSel ? "is-active" : ""}`}
                      >
                        {Icon && <Icon size={12} aria-hidden="true" />}
                        <span>{col.label}</span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            padding: "1px 6px",
                            borderRadius: "999px",
                            background: isSel ? "var(--pos-accent-bg)" : "var(--c-surface-3, #1f2724)",
                            color: isSel ? "#ffffff" : "var(--pos-muted)",
                            fontWeight: 700,
                          }}
                        >
                          {col.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pos-sort-wrap">
                  <ArrowUpDown size={14} aria-hidden="true" style={{ color: "var(--pos-muted)" }} />
                  <label htmlFor="pos-sort-select" style={{ fontSize: "0.75rem", color: "var(--pos-muted)", fontWeight: 600 }}>
                    Urutkan:
                  </label>
                  <select
                    id="pos-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="pos-sort-select"
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

          <div
            id="pos-catalog-panel"
            role="tabpanel"
            aria-labelledby={`pos-tab-${activeCategory.toLowerCase()}`}
            className="pos-grid"
          >
            {totalItems === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "4rem 1rem",
                  textAlign: "center",
                  color: "var(--pos-muted)",
                }}
              >
                <Search size={36} aria-hidden="true" style={{ margin: "0 auto 0.75rem", opacity: 0.45 }} />
                <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "var(--c-ink)" }}>
                  Tidak ada item ditemukan
                </p>
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "var(--pos-muted)" }}>
                  Coba sesuaikan kata kunci pencarian atau ganti filter kategori dan koleksi.
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

          {totalPages > 1 && (
            <div className="pos-pagination">
              <div className="pos-pagination-info" style={{ fontSize: "0.78rem", color: "var(--pos-muted)" }}>
                Menampilkan{" "}
                <strong style={{ color: "var(--c-ink)" }}>
                  {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}-
                  {Math.min(currentPage * itemsPerPage, totalItems)}
                </strong>{" "}
                dari <strong style={{ color: "var(--c-ink)" }}>{totalItems}</strong> item
                {activeCategory === "BIBIT" && ` (${totalPages} Hal)`}
              </div>

              <div className="pos-pagination-controls">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="pos-page-nav-btn"
                  style={{ opacity: currentPage <= 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  <span>Prev</span>
                </button>

                <span className="pos-page-mobile-indicator">
                  Hal {currentPage} / {totalPages}
                </span>

                <div className="pos-page-numbers">
                  {getPaginationItems(currentPage, totalPages).map((pItem, idx) => {
                    if (pItem === "...") {
                      return (
                        <span
                          key={`dots-${idx}`}
                          style={{ padding: "0 4px", color: "var(--pos-muted)", fontSize: "0.75rem" }}
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
                        aria-current={isCur ? "page" : undefined}
                        className={`pos-page-num-btn ${isCur ? "is-active" : ""}`}
                      >
                        {pItem}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="pos-page-nav-btn"
                  style={{ opacity: currentPage >= totalPages ? 0.4 : 1 }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </section>

        {showMobileBill && (
          <div
            className="pos-bill-backdrop"
            onClick={() => setShowMobileBill(false)}
            aria-hidden="true"
          />
        )}

        <section
          ref={mobileBillRef}
          tabIndex={showMobileBill ? -1 : undefined}
          role={showMobileBill ? "dialog" : undefined}
          aria-modal={showMobileBill ? true : undefined}
          className={`pos-bill-panel ${showMobileBill ? "is-open" : ""}`}
          aria-label="Ringkasan Bill Kasir"
        >
          <div className="pos-bill-sheet-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShoppingBag size={18} aria-hidden="true" color="var(--pos-accent-text)" />
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--c-ink)" }}>
                Ringkasan Bill ({totalBillQty} item)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowMobileBill(false)}
              aria-label="Tutup ringkasan bill"
              className="pos-modal-close-btn"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="pos-customer-bar">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--c-ink)",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <User size={14} aria-hidden="true" color="var(--pos-accent-text)" />
                <span>Informasi Pelanggan Toko</span>
              </h2>
              {(billItems.length > 0 || customerName !== "Customer Toko" || customerPhone || discountValue > 0) && (
                <button type="button" onClick={handleClearBill} className="pos-clear-bill-btn">
                  <Trash2 size={13} aria-hidden="true" />
                  <span>Reset Bill</span>
                </button>
              )}
            </div>

            <div className="pos-customer-grid">
              <div>
                <label htmlFor="pos-cust-name" className="pos-field-label">
                  Nama Pembeli
                </label>
                <input
                  id="pos-cust-name"
                  type="text"
                  placeholder="Customer Toko"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pos-customer-input"
                />
              </div>
              <div>
                <label htmlFor="pos-cust-phone" className="pos-field-label">
                  No. WhatsApp
                </label>
                <input
                  id="pos-cust-phone"
                  type="tel"
                  placeholder="08xx (Struk WA)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="pos-customer-input"
                />
              </div>
            </div>
          </div>

          <div className="pos-bill-items">
            {billItems.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "var(--pos-muted)",
                }}
              >
                <div
                  aria-hidden="true"
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
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--c-ink)", margin: 0 }}>
                  Bill Kasir Kosong
                </h3>
                <p style={{ fontSize: "0.82rem", maxWidth: "240px", marginTop: 4, color: "var(--pos-muted)" }}>
                  Pilih produk jadi atau racik bibit parfum dari katalog untuk memulai transaksi.
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
                    <div style={{ flex: 1, minWidth: 0, paddingRight: "0.5rem" }}>
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
                              ? "var(--c-teal-dim, rgba(14, 165, 233, 0.15))"
                              : "var(--pos-surface-subtle)",
                          color:
                            item.type === "refill"
                              ? "var(--pos-accent-text)"
                              : item.type === "product"
                              ? "var(--pos-info-text)"
                              : "var(--pos-muted)",
                          display: "inline-block",
                          marginBottom: 2,
                        }}
                      >
                        {item.type === "refill" ? "Racikan" : item.type === "product" ? "Produk" : "Kemasan"}
                      </span>
                      <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0, color: "var(--c-ink)" }}>
                        {item.title}
                      </h3>
                      {item.subtitle && (
                        <span style={{ fontSize: "0.75rem", color: "var(--pos-muted)", display: "block", marginTop: 2 }}>
                          {item.subtitle}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      aria-label={`Hapus ${item.title} dari bill`}
                      className="pos-remove-btn"
                      style={{ color: "var(--pos-muted)" }}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid var(--c-border)",
                      paddingTop: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: "var(--c-bg, #0a0c0b)",
                        borderRadius: "8px",
                        padding: "2px 4px",
                        border: "1px solid var(--c-border)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(index, -1)}
                        aria-label={`Kurangi jumlah ${item.title}`}
                        className="pos-qty-btn"
                        style={{ color: "var(--pos-muted)" }}
                      >
                        <Minus size={14} aria-hidden="true" />
                      </button>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          minWidth: "24px",
                          textAlign: "center",
                          color: "var(--c-ink)",
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(index, 1)}
                        aria-label={`Tambah jumlah ${item.title}`}
                        className="pos-qty-btn"
                        style={{ color: "var(--pos-muted)" }}
                      >
                        <Plus size={14} aria-hidden="true" />
                      </button>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--pos-accent-text)" }}>
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pos-bill-summary">
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--pos-muted)" }}>
              <span>Subtotal ({totalBillQty} item):</span>
              <span style={{ fontWeight: 600, color: "var(--c-ink)" }}>{formatRupiah(subtotal)}</span>
            </div>

            <div className="pos-discount-row">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label htmlFor="pos-discount-input" style={{ color: "var(--pos-muted)" }}>
                  Diskon:
                </label>
                <button
                  type="button"
                  aria-pressed={discountType === "percent"}
                  onClick={() => setDiscountType(discountType === "nominal" ? "percent" : "nominal")}
                  aria-label={`Ubah mode diskon ke ${discountType === "nominal" ? "persen" : "rupiah"}`}
                  className="pos-discount-toggle"
                >
                  {discountType === "nominal" ? "Rp" : "%"}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  id="pos-discount-input"
                  type="number"
                  min={0}
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  className="pos-discount-input"
                />
                {discountAmount > 0 && (
                  <span style={{ color: "var(--pos-danger)", fontWeight: 600 }}>-{formatRupiah(discountAmount)}</span>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid var(--c-border)",
                paddingTop: "0.6rem",
                gap: "0.75rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--pos-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    display: "block",
                  }}
                >
                  Total Bayar
                </span>
                <span
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "var(--pos-accent-text)",
                    fontFamily: "var(--font-display, serif)",
                  }}
                >
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              <button
                type="button"
                disabled={billItems.length === 0}
                onClick={() => {
                  setShowMobileBill(false);
                  setShowPaymentModal(true);
                }}
                className="pos-btn-primary"
                style={{
                  minHeight: "46px",
                  padding: "0.8rem 1.35rem",
                  borderRadius: "12px",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  opacity: billItems.length === 0 ? 0.5 : 1,
                  boxShadow: "0 8px 24px -4px var(--c-gold-glow, rgba(37, 99, 235, 0.3))",
                }}
              >
                <Banknote size={18} aria-hidden="true" />
                <span>
                  Bayar<span className="pos-kbd-hint"> (F4)</span>
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <div className="pos-mobile-bottom-bar" role="region" aria-label="Ringkasan transaksi mobile">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--pos-muted)", fontWeight: 600 }}>
            {totalBillQty} item di bill
          </div>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--pos-accent-text)",
              fontFamily: "var(--font-display, serif)",
              lineHeight: 1.1,
            }}
          >
            {formatRupiah(grandTotal)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowMobileBill(true)}
            className="pos-btn-secondary"
            style={{ padding: "0 0.85rem", fontSize: "0.82rem" }}
          >
            <ShoppingBag size={16} aria-hidden="true" />
            <span>Lihat Bill</span>
          </button>
          <button
            type="button"
            disabled={billItems.length === 0}
            onClick={() => {
              setShowMobileBill(false);
              setShowPaymentModal(true);
            }}
            className="pos-btn-primary"
            style={{ padding: "0 1rem", fontSize: "0.85rem", opacity: billItems.length === 0 ? 0.5 : 1 }}
          >
            <Banknote size={16} aria-hidden="true" />
            <span>Bayar</span>
          </button>
        </div>
      </div>

      {showMobileMenu && (
        <>
          <div className="pos-menu-backdrop" onClick={() => setShowMobileMenu(false)} aria-hidden="true" />
          <aside
            ref={mobileMenuRef}
            tabIndex={-1}
            className="pos-menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu Kasir"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-display, serif)" }}>
                Menu Kasir
              </h2>
              <button
                type="button"
                onClick={() => setShowMobileMenu(false)}
                aria-label="Tutup menu kasir"
                className="pos-modal-close-btn"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0.85rem",
                borderRadius: "12px",
                background: "var(--c-surface-2)",
                border: "1px solid var(--c-border)",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--pos-accent-bg)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  flexShrink: 0,
                }}
              >
                {data.user.full_name?.charAt(0) || "K"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--c-ink)" }}>
                  {data.user.full_name}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--pos-muted)" }}>
                  {data.user.role} • {activeStore?.name ? `Cabang ${activeStore.name}` : "POS Kasir"}
                </div>
              </div>
            </div>

            <div className="pos-clock-pill" style={{ justifyContent: "center", minHeight: "44px" }}>
              <Clock size={15} aria-hidden="true" color="var(--pos-warn)" />
              <span style={{ fontWeight: 600 }}>{currentTime}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowMobileMenu(false);
                setShowRecentModal(true);
              }}
              className="pos-btn-secondary"
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              <History size={16} aria-hidden="true" color="var(--pos-accent-text)" />
              <span>Shift Hari Ini ({data.recentOrders.length})</span>
            </button>

            <form action={kasirLogout} style={{ marginTop: "auto" }}>
              <button
                type="submit"
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  background: "var(--pos-soft-danger-bg)",
                  border: "1px solid var(--pos-soft-danger-border)",
                  color: "var(--pos-danger)",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <LogOut size={16} aria-hidden="true" />
                <span>Keluar dari Terminal Kasir</span>
              </button>
            </form>
          </aside>
        </>
      )}

      {selectedProductForSize && (
        <div
          className="pos-modal-overlay"
          style={{ zIndex: 210 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pos-size-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProductForSize(null);
          }}
        >
          <div ref={sizeModalRef} tabIndex={-1} className="pos-modal-card pos-size-modal-card">
            <div className="pos-modal-header">
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--pos-success)", fontWeight: 700, textTransform: "uppercase" }}>
                  Pilih Ukuran
                </span>
                <h2 id="pos-size-modal-title" style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--c-ink)" }}>
                  {selectedProductForSize.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForSize(null)}
                aria-label="Tutup pilihan ukuran"
                className="pos-modal-close-btn"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="pos-modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {selectedProductForSize.sizes.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--pos-muted)", fontSize: "0.85rem" }}>
                  Tidak ada varian ukuran tersedia untuk produk ini.
                </div>
              ) : (
                selectedProductForSize.sizes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={s.stock <= 0}
                    onClick={() => handleAddProductSize(selectedProductForSize, s)}
                    className="pos-size-option-btn"
                  >
                    <span style={{ display: "block" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 700, display: "block" }}>{s.size_label}</span>
                      <span style={{ fontSize: "0.75rem", color: s.stock <= 0 ? "var(--pos-danger)" : "var(--pos-success)", display: "block" }}>
                        {s.stock <= 0 ? "Stok Cabang Habis" : `Stok: ${s.stock} pcs`}
                      </span>
                    </span>
                    <span style={{ fontSize: "1rem", fontWeight: 800, color: s.stock <= 0 ? "var(--pos-muted)" : "var(--pos-success)" }}>
                      {formatRupiah(s.price)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {mixingBibit && (
        <KasirMixModal
          initialBibit={mixingBibit}
          allBibits={data.bibits}
          bottles={data.bottles}
          onClose={() => setMixingBibit(null)}
          onAddToCart={handleAddToCart}
        />
      )}

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
            try {
              localStorage.removeItem(POS_DRAFT_KEY);
            } catch {}
            setShowPaymentModal(false);
            setCompletedOrder({
              ...result,
            });
            refreshStocks();
          }}
        />
      )}

      {completedOrder && (
        <KasirReceiptModal
          orderId={completedOrder.orderId}
          orderCode={completedOrder.orderCode}
          storeName={activeStore?.name || `Cabang #${activeStoreId}`}
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
            refreshStocks();
          }}
        />
      )}

      {showRecentModal && (
        <div
          className="pos-modal-overlay"
          style={{ zIndex: 260 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pos-recent-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRecentModal(false);
          }}
        >
          <div ref={recentModalRef} tabIndex={-1} className="pos-modal-card pos-recent-modal-card">
            <div className="pos-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <History size={18} aria-hidden="true" color="var(--pos-warn)" />
                <h2 id="pos-recent-modal-title" style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--c-ink)" }}>
                  Transaksi Shift Hari Ini
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentModal(false)}
                aria-label="Tutup riwayat shift"
                className="pos-modal-close-btn"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="pos-modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {data.recentOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--pos-muted)", fontSize: "0.85rem" }}>
                  Belum ada transaksi di cabang ini hari ini.
                </div>
              ) : (
                data.recentOrders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "10px",
                      background: "var(--c-surface-2)",
                      border: "1px solid var(--c-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--c-ink)" }}>{ord.order_code}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--pos-muted)", display: "block" }}>
                        {ord.customer_name || "Customer Toko"} • Kasir: {ord.cashier_name || "-"}
                      </span>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--pos-warn)" }}>
                        {formatRupiah(ord.total)}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--pos-success)",
                          display: "block",
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
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
