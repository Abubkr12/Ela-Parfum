"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, Building2, Package, CheckCircle2 } from "lucide-react";
import { useTransition, useState, useEffect, useRef } from "react";

export default function OrderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [storeId, setStoreId] = useState(searchParams.get("store") || "all");
  const [fulfillment, setFulfillment] = useState(searchParams.get("fulfillment") || "all");
  const [status, setStatus] = useState(searchParams.get("status") || "all");

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setStoreId(searchParams.get("store") || "all");
    setFulfillment(searchParams.get("fulfillment") || "all");
    setStatus(searchParams.get("status") || "all");
  }, [searchParams]);

  const updateFilters = (newSearch: string, newStore: string, newFulfillment: string, newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newSearch) params.set("search", newSearch);
    else params.delete("search");

    if (newStore && newStore !== "all") params.set("store", newStore);
    else params.delete("store");

    if (newFulfillment && newFulfillment !== "all") params.set("fulfillment", newFulfillment);
    else params.delete("fulfillment");

    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    else params.delete("status");

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateFilters(val, storeId, fulfillment, status);
    }, 400);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search Bar */}
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-dim)" }} />
          <input 
            type="text"
            placeholder="Cari No Pesanan, Nama, atau No Telepon..."
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
              outline: "none"
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
              updateFilters(search, val, fulfillment, status);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--c-border)",
              background: "var(--c-surface-1)",
              color: "var(--c-ink)",
              fontSize: "0.85rem",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="all">Semua Cabang Toko</option>
            <option value="1">Cabang Condet</option>
            <option value="2">Cabang Rawa Belong</option>
            <option value="3">Cabang Tangerang</option>
          </select>
        </div>

        {/* Filter Tipe Pengiriman */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Package size={16} style={{ color: "var(--c-gold)" }} />
          <select 
            value={fulfillment}
            onChange={(e) => {
              const val = e.target.value;
              setFulfillment(val);
              updateFilters(search, storeId, val, status);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--c-border)",
              background: "var(--c-surface-1)",
              color: "var(--c-ink)",
              fontSize: "0.85rem",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="all">Semua Tipe Pengiriman</option>
            <option value="pickup">Ambil di Toko (Pickup)</option>
            <option value="delivery">Pengiriman Kurir Ekspedisi</option>
          </select>
        </div>

        {/* Filter Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle2 size={16} style={{ color: "var(--c-gold)" }} />
          <select 
            value={status}
            onChange={(e) => {
              const val = e.target.value;
              setStatus(val);
              updateFilters(search, storeId, fulfillment, val);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--c-border)",
              background: "var(--c-surface-1)",
              color: "var(--c-ink)",
              fontSize: "0.85rem",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="all">Semua Status</option>
            <option value="unpaid">Belum Bayar (Menunggu Pembayaran)</option>
            <option value="processing">Sedang Disiapkan / Diproses</option>
            <option value="ready_for_pickup">Siap Diambil di Toko</option>
            <option value="shipped">Dalam Pengiriman</option>
            <option value="completed">Selesai / Sudah Diambil</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>

        {isPending && (
          <div style={{ fontSize: "0.8rem", color: "var(--c-gold)", marginLeft: "auto" }}>
            Memfilter data...
          </div>
        )}
      </div>
    </div>
  );
}
