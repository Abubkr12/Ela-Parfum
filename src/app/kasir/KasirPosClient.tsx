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
  ChevronDown,
  X,
  History,
} from "lucide-react";
import { formatRupiah } from "@/lib/types";
import { toast } from "sonner";

interface KasirPosClientProps {
  initialData: PosInitialData;
}

export default function KasirPosClient({ initialData }: KasirPosClientProps) {
  // State Data
  const [data, setData] = useState<PosInitialData>(initialData);
  const [activeStoreId, setActiveStoreId] = useState<number>(initialData.activeStoreId);
  const [loadingStore, setLoadingStore] = useState<boolean>(false);

  // Tab & Search State
  const [activeCategory, setActiveCategory] = useState<"ALL" | "PRODUCT" | "BIBIT" | "BOTTLE">("BIBIT");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Bill / Cart State
  const [customerName, setCustomerName] = useState<string>("Customer Toko");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [billItems, setBillItems] = useState<PosBillItem[]>([]);
  const [discountType, setDiscountType] = useState<"nominal" | "percent">("nominal");
  const [discountValue, setDiscountValue] = useState<number>(0);

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
    return data.stores.find((s) => s.id === activeStoreId) || data.stores[0];
  }, [data.stores, activeStoreId]);

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

  // Reset Bill
  const handleClearBill = () => {
    if (billItems.length === 0) return;
    if (confirm("Kosongkan seluruh daftar belanja kasir saat ini?")) {
      setBillItems([]);
      setDiscountValue(0);
      setCustomerName("Customer Toko");
      setCustomerPhone("");
      toast.info("Daftar belanja kasir telah dikosongkan.");
    }
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

  // Filter Catalog
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return data.products;
    const q = searchQuery.toLowerCase();
    return data.products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.collection.toLowerCase().includes(q)
    );
  }, [data.products, searchQuery]);

  const filteredBibits = useMemo(() => {
    if (!searchQuery.trim()) return data.bibits;
    const q = searchQuery.toLowerCase();
    return data.bibits.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.collection.toLowerCase().includes(q) ||
        (b.main_accord && b.main_accord.toLowerCase().includes(q))
    );
  }, [data.bibits, searchQuery]);

  const filteredBottles = useMemo(() => {
    if (!searchQuery.trim()) return data.bottles;
    const q = searchQuery.toLowerCase();
    return data.bottles.filter((bt) => bt.name.toLowerCase().includes(q));
  }, [data.bottles, searchQuery]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0B0E0D",
        color: "#F3F4F6",
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
          backgroundColor: "#121614",
          borderBottom: "1px solid rgba(217, 119, 6, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        {/* Brand & Store Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(217, 119, 6, 0.3) 0%, rgba(180, 83, 9, 0.1) 100%)",
                border: "1px solid rgba(217, 119, 6, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F59E0B",
              }}
            >
              <Store size={18} />
            </div>
            <div>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
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
                background: "rgba(217, 119, 6, 0.15)",
                border: "1px solid rgba(217, 119, 6, 0.35)",
                color: "#FBBF24",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
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
                  backgroundColor: "#161B18",
                  border: "1px solid rgba(217, 119, 6, 0.35)",
                  borderRadius: "14px",
                  padding: "0.5rem",
                  width: "220px",
                  zIndex: 300,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.7)",
                }}
              >
                <div style={{ fontSize: "0.7rem", color: "#9CA3AF", padding: "4px 8px", textTransform: "uppercase", fontWeight: 700 }}>
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
                      background: s.id === activeStoreId ? "rgba(217, 119, 6, 0.2)" : "transparent",
                      color: s.id === activeStoreId ? "#FBBF24" : "#D1D5DB",
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
                    {s.id === activeStoreId && <Check size={14} color="#FBBF24" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Clock & Shortcuts */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "#D1D5DB", background: "rgba(255,255,255,0.04)", padding: "4px 12px", borderRadius: "8px" }}>
            <Clock size={14} color="#F59E0B" />
            <span style={{ fontWeight: 600 }}>{currentTime}</span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "#9CA3AF" }}>
            <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>F1: Cari</span>
            <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>F2: Bibit</span>
            <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>F3: Produk</span>
            <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>F4: Bayar</span>
          </div>
        </div>

        {/* Right User & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Riwayat Shift Button */}
          <button
            type="button"
            onClick={() => setShowRecentModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#D1D5DB",
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

          {/* Cashier Chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--c-gold)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.75rem" }}>
              {data.user.full_name?.charAt(0) || "K"}
            </div>
            <div style={{ fontSize: "0.8rem" }}>
              <span style={{ fontWeight: 700, color: "#FFFFFF", display: "block", lineHeight: 1.1 }}>{data.user.full_name}</span>
              <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>{data.user.role}</span>
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
            borderRight: "1px solid rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
            backgroundColor: "#0D100F",
          }}
        >
          {/* Search & Category Filter Bar */}
          <div
            style={{
              padding: "1rem 1.25rem",
              backgroundColor: "#121614",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
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
                  color: "#6B7280",
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
                  backgroundColor: "#0A0D0C",
                  border: "1px solid rgba(217, 119, 6, 0.3)",
                  borderRadius: "12px",
                  color: "#FFFFFF",
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
                    color: "#9CA3AF",
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
                      border: isActive ? "1.5px solid #F59E0B" : "1px solid rgba(255,255,255,0.08)",
                      background: isActive ? "rgba(217, 119, 6, 0.2)" : "rgba(255,255,255,0.03)",
                      color: isActive ? "#FBBF24" : "#D1D5DB",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        background: isActive ? "#F59E0B" : "rgba(255,255,255,0.08)",
                        color: isActive ? "#000" : "#9CA3AF",
                        fontWeight: 800,
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
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
            {/* Render BIBIT Items */}
            {(activeCategory === "BIBIT" || activeCategory === "ALL") &&
              filteredBibits.map((b) => (
                <div
                  key={`bibit-${b.id}`}
                  onClick={() => setMixingBibit(b)}
                  style={{
                    backgroundColor: "#141816",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
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
                    e.currentTarget.style.borderColor = "rgba(217, 119, 6, 0.5)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
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
                          background: "rgba(217, 119, 6, 0.15)",
                          color: "#FBBF24",
                        }}
                      >
                        Bibit Racik
                      </span>
                      <span style={{ fontSize: "0.75rem", color: b.stock_ml < 500 ? "#F87171" : "#10B981", fontWeight: 600 }}>
                        {b.stock_ml} ml
                      </span>
                    </div>

                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 4px", color: "#FFFFFF", lineHeight: 1.3 }}>
                      {b.name}
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "#9CA3AF", display: "block" }}>
                      {b.collection} • {b.main_accord || "Artisan"}
                    </span>
                  </div>

                  <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.6rem" }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#FBBF24" }}>
                      {formatRupiah(b.price_per_ml)}
                      <small style={{ fontSize: "0.7rem", color: "#9CA3AF", fontWeight: 500 }}>/ml</small>
                    </span>
                    <button
                      type="button"
                      style={{
                        padding: "4px 8px",
                        background: "var(--c-gold)",
                        color: "#000",
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
              ))}

            {/* Render PRODUK JADI Items */}
            {(activeCategory === "PRODUCT" || activeCategory === "ALL") &&
              filteredProducts.map((p) => {
                const totalStock = p.sizes.reduce((sum, s) => sum + s.stock, 0);
                const minPrice = p.sizes[0]?.price || 0;
                return (
                  <div
                    key={`prod-${p.id}`}
                    onClick={() => setSelectedProductForSize(p)}
                    style={{
                      backgroundColor: "#141816",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "14px",
                      padding: "1rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "transform 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.5)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
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
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#10B981",
                          }}
                        >
                          Produk Jadi
                        </span>
                        <span style={{ fontSize: "0.75rem", color: totalStock <= 0 ? "#F87171" : "#10B981", fontWeight: 600 }}>
                          Stok: {totalStock} pcs
                        </span>
                      </div>

                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 4px", color: "#FFFFFF", lineHeight: 1.3 }}>
                        {p.name}
                      </h4>
                      <span style={{ fontSize: "0.75rem", color: "#9CA3AF", display: "block" }}>
                        {p.collection} ({p.sizes.length} varian ukuran)
                      </span>
                    </div>

                    <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.6rem" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#10B981" }}>
                        Mulai {formatRupiah(minPrice)}
                      </span>
                      <button
                        type="button"
                        style={{
                          padding: "4px 8px",
                          background: "#10B981",
                          color: "#000",
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
              })}

            {/* Render BOTOL Items */}
            {(activeCategory === "BOTTLE" || activeCategory === "ALL") &&
              filteredBottles.map((bt) => (
                <div
                  key={`bottle-${bt.id}`}
                  onClick={() => handleAddBottle(bt)}
                  style={{
                    backgroundColor: "#141816",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "14px",
                    padding: "1rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
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
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "#60A5FA",
                        }}
                      >
                        Botol Kemasan
                      </span>
                      <span style={{ fontSize: "0.75rem", color: bt.stock < 10 ? "#F87171" : "#10B981", fontWeight: 600 }}>
                        {bt.stock} pcs
                      </span>
                    </div>

                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 4px", color: "#FFFFFF", lineHeight: 1.3 }}>
                      {bt.name}
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "#9CA3AF", display: "block" }}>
                      Kapasitas {bt.capacity_ml}ml
                    </span>
                  </div>

                  <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.6rem" }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#60A5FA" }}>
                      {formatRupiah(bt.price)}
                    </span>
                    <button
                      type="button"
                      style={{
                        padding: "4px 8px",
                        background: "#3B82F6",
                        color: "#FFFFFF",
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
                      <span>Beli</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* RIGHT SECTION: BILLING & ORDER SUMMARY (35%) */}
        <section
          style={{
            flex: "1 1 35%",
            minWidth: "380px",
            maxWidth: "460px",
            backgroundColor: "#111413",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Customer Fast Bar */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              backgroundColor: "#161B18",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#D1D5DB", display: "flex", alignItems: "center", gap: 6 }}>
                <User size={14} color="#F59E0B" />
                Informasi Pelanggan Toko
              </span>
              {billItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearBill}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#F87171",
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
                  backgroundColor: "#0B0E0D",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  color: "#FFFFFF",
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
                  backgroundColor: "#0B0E0D",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  color: "#FFFFFF",
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
                  color: "#6B7280",
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.03)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <ShoppingBag size={28} />
                </div>
                <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "#D1D5DB", margin: 0 }}>
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
                    backgroundColor: "#161B18",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
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
                              ? "rgba(217, 119, 6, 0.2)"
                              : item.type === "product"
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(59, 130, 246, 0.2)",
                          color:
                            item.type === "refill"
                              ? "#FBBF24"
                              : item.type === "product"
                              ? "#10B981"
                              : "#60A5FA",
                          display: "inline-block",
                          marginBottom: 2,
                        }}
                      >
                        {item.type === "refill" ? "Racikan" : item.type === "product" ? "Produk" : "Kemasan"}
                      </span>
                      <h5 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0, color: "#FFFFFF" }}>
                        {item.title}
                      </h5>
                      {item.subtitle && (
                        <span style={{ fontSize: "0.75rem", color: "#9CA3AF", display: "block", marginTop: 2 }}>
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
                        color: "#6B7280",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem" }}>
                    {/* Stepper Qty */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#0B0E0D", borderRadius: "8px", padding: "2px 4px" }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(index, -1)}
                        style={{ background: "transparent", border: "none", color: "#9CA3AF", cursor: "pointer", padding: "2px" }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "20px", textAlign: "center" }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(index, 1)}
                        style={{ background: "transparent", border: "none", color: "#9CA3AF", cursor: "pointer", padding: "2px" }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#FBBF24" }}>
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
              backgroundColor: "#161B18",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {/* Subtotal Row */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#D1D5DB" }}>
              <span>Subtotal ({billItems.reduce((acc, it) => acc + it.quantity, 0)} item):</span>
              <span style={{ fontWeight: 600 }}>{formatRupiah(subtotal)}</span>
            </div>

            {/* Discount Row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#D1D5DB" }}>Diskon:</span>
                <button
                  type="button"
                  onClick={() => setDiscountType(discountType === "nominal" ? "percent" : "nominal")}
                  style={{
                    fontSize: "0.7rem",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    color: "#FBBF24",
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
                    backgroundColor: "#0B0E0D",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "6px",
                    color: "#FFFFFF",
                    fontSize: "0.8rem",
                    textAlign: "right",
                    outline: "none",
                  }}
                />
                {discountAmount > 0 && (
                  <span style={{ color: "#F87171", fontWeight: 600 }}>
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
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                paddingTop: "0.6rem",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>
                  Total Bayar
                </span>
                <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "#FBBF24" }}>
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {/* Fast Cash Button F4 */}
              <button
                type="button"
                disabled={billItems.length === 0}
                onClick={() => setShowPaymentModal(true)}
                style={{
                  padding: "0.85rem 1.25rem",
                  background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                  color: "#0B0D0C",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: billItems.length === 0 ? "not-allowed" : "pointer",
                  opacity: billItems.length === 0 ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 8px 20px -4px rgba(217, 119, 6, 0.4)",
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
