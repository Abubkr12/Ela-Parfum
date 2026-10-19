"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, Building2, CreditCard, Calendar, Clock } from "lucide-react";
import { useTransition, useState, useEffect, useRef } from "react";

export default function KasirFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [storeId, setStoreId] = useState(searchParams.get("store") || "all");
  const [payment, setPayment] = useState(searchParams.get("payment") || "all");
  const [range, setRange] = useState(searchParams.get("range") || "today");

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setStoreId(searchParams.get("store") || "all");
    setPayment(searchParams.get("payment") || "all");
    setRange(searchParams.get("range") || "today");
  }, [searchParams]);

  const updateFilters = (newSearch: string, newStore: string, newPayment: string, newRange: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newSearch) params.set("search", newSearch);
    else params.delete("search");

    if (newStore && newStore !== "all") params.set("store", newStore);
    else params.delete("store");

    if (newPayment && newPayment !== "all") params.set("payment", newPayment);
    else params.delete("payment");

    if (newRange && newRange !== "today") params.set("range", newRange);
    else params.delete("range");

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateFilters(val, storeId, payment, range);
    }, 400);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search Bar */}
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--c-ink-dim)",
            }}
          />
          <input
            type="text"
            placeholder="Cari No Nota (POS-...), Kasir, atau Pelanggan..."
            value={search}
            onChange={handleSearchChange}
            style={{
              width: "100%",
              padding: "10px 16px 10px 42px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--c-border)",
              background: "var(--c-surface-1)",
              color: "var(--c-ink)",
              fontSize: "0.9rem",
              outline: "none",
            }}
          />
        </div>

        {/* Filter Cabang Toko */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Building2 size={16} style={{ color: "var(--c-gold)" }} />
          <select
            value={storeId}
            onChange={(e) => {
              const val = e.target.value;
              setStoreId(val);
              updateFilters(search, val, payment, range);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--c-border)",
              background: "var(--c-surface-1)",
              color: "var(--c-ink)",
              fontSize: "0.85rem",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">Semua Cabang Toko</option>
            <option value="1">Cabang Condet</option>
            <option value="2">Cabang Rawa Belong</option>
            <option value="3">Cabang Tangerang</option>
          </select>
        </div>

        {/* Filter Metode Pembayaran */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CreditCard size={16} style={{ color: "var(--c-gold)" }} />
          <select
            value={payment}
            onChange={(e) => {
              const val = e.target.value;
              setPayment(val);
              updateFilters(search, storeId, val, range);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--c-border)",
              background: "var(--c-surface-1)",
              color: "var(--c-ink)",
              fontSize: "0.85rem",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">Semua Metode Bayar</option>
            <option value="TUNAI">Tunai (Cash)</option>
            <option value="QRIS">QRIS Mayar</option>
            <option value="TRANSFER">Transfer Bank</option>
          </select>
        </div>

        {/* Filter Rentang Tanggal */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Calendar size={16} style={{ color: "var(--c-gold)" }} />
          <select
            value={range}
            onChange={(e) => {
              const val = e.target.value;
              setRange(val);
              updateFilters(search, storeId, payment, val);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--c-border)",
              background: "var(--c-surface-1)",
              color: "var(--c-ink)",
              fontSize: "0.85rem",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="today">Hari Ini (Real-time)</option>
            <option value="7d">7 Hari Terakhir</option>
            <option value="30d">Bulan Ini (30 Hari)</option>
            <option value="all">Semua Riwayat</option>
          </select>
        </div>

        {isPending && (
          <div style={{ fontSize: "0.8rem", color: "var(--c-gold)", marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={13} className="animate-spin" />
            <span>Memfilter transaksi kasir...</span>
          </div>
        )}
      </div>
    </div>
  );
}
