"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter } from "lucide-react";
import { useTransition, useState, useEffect, useRef } from "react";

export default function OrderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [type, setType] = useState(searchParams.get("type") || "all");

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setType(searchParams.get("type") || "all");
  }, [searchParams]);

  const updateFilters = (newSearch: string, newType: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSearch) {
      params.set("search", newSearch);
    } else {
      params.delete("search");
    }

    if (newType && newType !== "all") {
      params.set("type", newType);
    } else {
      params.delete("type");
    }

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      updateFilters(val, type);
    }, 500);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setType(val);
    updateFilters(search, val);
  };

  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
      <div style={{ position: "relative", flex: "1 1 300px" }}>
        <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-dim)" }} />
        <input 
          type="text"
          placeholder="Cari ID Pesanan, nama pelanggan, resi..."
          value={search}
          onChange={handleSearchChange}
          style={{
            width: "100%",
            padding: "10px 16px 10px 40px",
            borderRadius: 8,
            border: "1px solid var(--c-border)",
            background: "var(--c-surface-1)",
            color: "var(--c-ink)",
            fontSize: "0.95rem"
          }}
        />
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
        <Filter size={18} style={{ color: "var(--c-ink-dim)" }} />
        <select 
          value={type}
          onChange={handleTypeChange}
          style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-ink)", outline: "none", fontSize: "0.9rem", minWidth: 200, cursor: "pointer" }}
        >
          <option value="all">Semua Pesanan</option>
          <option value="reguler">Pesanan Reguler</option>
          <option value="kustom">Order Kustom (Lunas)</option>
          <option value="racikan">Pengajuan Racikan (Baru)</option>
        </select>
      </div>

      {isPending && (
        <div style={{ display: "flex", alignItems: "center", color: "var(--c-ink-dim)", fontSize: "0.85rem" }}>
          Memuat...
        </div>
      )}
    </div>
  );
}
