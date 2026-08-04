"use client";

import React, { useMemo } from "react";
import { Check, RotateCcw, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { BibitData, AiAnalysis, RefillMode, BottleData } from "./types";

interface StepPriceSummaryProps {
  mode: RefillMode;
  recommendedBibit: BibitData | null;
  selectedBibits: BibitData[];
  analysis: AiAnalysis | null;
  ratio: "30/70" | "50/50" | "70/30" | "100/0";
  bottle: BottleData | null;
  useOwnBottle: boolean;
  ownBottleVolumeMl: number;
  onCheckout: () => void;
  onRetry: () => void;
  loading: boolean;
}

const formatRupiah = (price: number) => {
  return `Rp${price.toLocaleString("id-ID")}`;
};

export function StepPriceSummary({ mode, recommendedBibit, selectedBibits, analysis, ratio, bottle, useOwnBottle, ownBottleVolumeMl, onCheckout, onRetry, loading }: StepPriceSummaryProps) {
  
  const isCustom = mode === "custom";
  const activeBibits = isCustom ? selectedBibits : (recommendedBibit ? [recommendedBibit] : []);
  
  const ratioPercent = ratio === "100/0" ? 1.0 : ratio === "70/30" ? 0.7 : ratio === "50/50" ? 0.5 : 0.3;
  const capacityMl = useOwnBottle ? ownBottleVolumeMl : (bottle?.capacity_ml || 0);
  const totalBibitVolume = capacityMl * ratioPercent;
  const volumePerBibit = totalBibitVolume / (activeBibits.length || 1);

  const bibitCosts = useMemo(() => {
    return activeBibits.map(b => ({
      name: b.name,
      volume: volumePerBibit,
      cost: volumePerBibit * b.price_per_ml
    }));
  }, [activeBibits, volumePerBibit]);

  const totalBibitCost = bibitCosts.reduce((sum, item) => sum + item.cost, 0);
  const bottlePrice = useOwnBottle ? 0 : (bottle?.price || 0);
  const totalCost = bottlePrice + totalBibitCost;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "var(--c-surface-1)",
        padding: "32px",
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--c-border)",
        boxShadow: "var(--shadow-card, 0 4px 20px rgba(0,0,0,0.03))",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: "8px", fontFamily: "var(--font-display)" }}>
          Ringkasan Pesanan
        </h2>
        <p style={{ color: "var(--c-ink-dim)", margin: 0 }}>
          Periksa kembali detail racikan parfum Anda sebelum membayar.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "32px" }}>
        
        {/* Bibit Section */}
        <div>
          <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px", borderBottom: "1px solid var(--c-border)", paddingBottom: "8px" }}>
            Komposisi Parfum
          </h4>
          {activeBibits.map(b => (
            <div key={b.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-ink)" }}>{b.name}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>{b.collection} · {b.intensity}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ratio & Bottle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
              Rasio
            </h4>
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--c-ink)" }}>
              {ratio === "100/0" ? "Elixir (Murni)" : ratio === "70/30" ? "Extrait De Parfum (1:3)" : ratio === "50/50" ? "Eau De Parfum (1:1)" : "Eau De Toilette (3:7)"}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
              Botol
            </h4>
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--c-ink)" }}>
              {useOwnBottle 
                ? `Botol Sendiri (${ownBottleVolumeMl}ml)` 
                : `${bottle?.name} (${bottle?.capacity_ml}ml)`}
            </div>
            {useOwnBottle && (
              <div style={{ fontSize: "0.8rem", color: "#a855f7", fontWeight: 500, marginTop: 4 }}>
                Ambil di toko
              </div>
            )}
          </div>
        </div>

        {/* Price Breakdown */}
        <div style={{ background: "var(--c-surface-2)", padding: "20px", borderRadius: "var(--r-md)" }}>
          <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
            Rincian Harga
          </h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
            {bibitCosts.map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.95rem" }}>
                <div style={{ color: "var(--c-ink)", maxWidth: "70%" }}>
                  Bibit: {item.name} <span style={{ color: "var(--c-ink-dim)" }}>({item.volume.toFixed(1)}ml)</span>
                </div>
                <span style={{ fontWeight: 500, color: "var(--c-ink)" }}>{formatRupiah(item.cost)}</span>
              </div>
            ))}
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.95rem" }}>
              <div style={{ color: "var(--c-ink)", maxWidth: "70%" }}>
                {ratio === "100/0" ? (
                  <>Pelarut: <span style={{ color: "var(--c-ink-dim)" }}>Tidak Menggunakan Pelarut</span></>
                ) : (
                  <>Pelarut: Absolute <span style={{ color: "var(--c-ink-dim)" }}>{(capacityMl - totalBibitVolume).toFixed(1)}ml</span></>
                )}
              </div>
              <span style={{ fontWeight: 500, color: "var(--c-green)", fontSize: "0.85rem" }}>Gratis</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.95rem" }}>
              <div style={{ color: "var(--c-ink)", maxWidth: "70%" }}>
                {useOwnBottle 
                  ? <>Botol Sendiri <span style={{ color: "var(--c-ink-dim)" }}>({ownBottleVolumeMl}ml)</span></>
                  : <>Botol: {bottle?.name} <span style={{ color: "var(--c-ink-dim)" }}>({bottle?.capacity_ml}ml)</span></>}
              </div>
              <span style={{ fontWeight: 500, color: useOwnBottle ? "var(--c-green)" : "var(--c-ink)", fontSize: useOwnBottle ? "0.85rem" : "0.95rem" }}>
                {useOwnBottle ? "Gratis" : formatRupiah(bottlePrice)}
              </span>
            </div>
          </div>

          <div style={{ height: "1px", background: "var(--c-border)", marginBottom: "16px" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--c-ink)" }}>Total Pembayaran</span>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--c-gold)" }}>{formatRupiah(totalCost)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button
          onClick={onCheckout}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "var(--r-md)",
            background: loading ? "var(--c-surface-2)" : "var(--c-gold)",
            color: loading ? "var(--c-ink-dim)" : "#ffffff",
            border: "none",
            fontSize: "1.1rem",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s ease",
            boxShadow: loading ? "none" : "0 8px 24px rgba(59, 130, 246, 0.25)",
          }}
        >
          {loading ? (
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
              <ShoppingBag size={20} />
            </span>
          ) : (
            <ShoppingBag size={20} />
          )}
          {loading ? "Memproses..." : "Bayar Sekarang"}
        </button>
        
        <button
          onClick={onRetry}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "var(--r-md)",
            background: "transparent",
            color: "var(--c-ink-dim)",
            border: "1px solid var(--c-border)",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => { if(!loading){ e.currentTarget.style.color = "var(--c-ink)"; e.currentTarget.style.background = "var(--c-surface-2)"; } }}
          onMouseLeave={(e) => { if(!loading){ e.currentTarget.style.color = "var(--c-ink-dim)"; e.currentTarget.style.background = "transparent"; } }}
        >
          <RotateCcw size={18} />
          Mulai dari Awal
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}
