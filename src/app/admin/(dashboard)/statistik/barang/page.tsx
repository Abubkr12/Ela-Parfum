"use client";

import React, { useState, useEffect } from "react";
import BarangClient from "./BarangClient";
import { Loader2 } from "lucide-react";

export default function StatistikBarangPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/statistik/barang?range=Semua", { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat data statistik barang:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading && !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <Loader2 className="animate-spin" size={36} style={{ color: "var(--c-gold)" }} />
        <p style={{ color: "var(--c-ink-dim)", fontSize: "0.95rem" }}>Memuat statistik barang...</p>
      </div>
    );
  }

  return (
    <BarangClient
      stores={data?.stores || []}
      stockChangelog={data?.stockChangelog || []}
      productStocks={data?.productStocks || []}
      bibitStocks={data?.bibitStocks || []}
      bottleStocks={data?.bottleStocks || []}
      solventStocks={data?.solventStocks || []}
      orderItems={data?.orderItems || []}
    />
  );
}
