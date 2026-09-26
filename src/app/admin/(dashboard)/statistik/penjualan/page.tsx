"use client";

import React, { useState, useEffect } from "react";
import PenjualanClient from "./PenjualanClient";
import { Loader2 } from "lucide-react";

export default function PenjualanPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/statistik/penjualan?range=Semua", { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          setOrders(json.data || []);
        }
      } catch (err) {
        console.error("Gagal memuat statistik penjualan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  if (loading && orders.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <Loader2 className="animate-spin" size={36} style={{ color: "var(--c-gold)" }} />
        <p style={{ color: "var(--c-ink-dim)", fontSize: "0.95rem" }}>Memuat statistik penjualan...</p>
      </div>
    );
  }

  return <PenjualanClient initialOrders={orders} />;
}
