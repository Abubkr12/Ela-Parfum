"use client";

import React, { useState, useMemo } from "react";
import { Search, Check, FlaskConical } from "lucide-react";
import { motion } from "framer-motion";
import { BibitData } from "./types";

interface StepBibitSelectProps {
  bibits: BibitData[];
  selectedBibits: BibitData[];
  onToggle: (bibit: BibitData) => void;
  onSubmit: () => void;
  loading: boolean;
}

type TabType = "Semua" | "Global Parfume" | "Arabian Parfume";

export function StepBibitSelect({ bibits, selectedBibits, onToggle, onSubmit, loading }: StepBibitSelectProps) {
  const [activeTab, setActiveTab] = useState<TabType>("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBibits = useMemo(() => {
    return bibits.filter((b) => {
      const matchTab = activeTab === "Semua" || b.collection === activeTab;
      const matchSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.main_accord.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [bibits, activeTab, searchQuery]);

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
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: "8px", fontFamily: "var(--font-display)" }}>
          Pilih Bibit Parfum
        </h2>
        <p style={{ color: "var(--c-ink-dim)" }}>
          Campurkan 2 atau lebih bibit untuk menciptakan aroma signature Anda.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", overflowX: "auto", paddingBottom: "4px" }}>
        {(["Semua", "Global Parfume", "Arabian Parfume"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 16px",
              borderRadius: "100px",
              background: activeTab === tab ? "var(--c-gold)" : "var(--c-surface-2)",
              color: activeTab === tab ? "#fff" : "var(--c-ink-dim)",
              border: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <Search size={18} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-dim)" }} />
        <input
          type="text"
          placeholder="Cari nama bibit atau aroma..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px 12px 42px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--c-border)",
            background: "var(--c-bg)",
            color: "var(--c-ink)",
            outline: "none",
            transition: "border-color 0.2s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--c-gold)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--c-border)")}
        />
      </div>

      {/* Grid */}
      <div
        style={{
          maxHeight: "480px",
          overflowY: "auto",
          paddingRight: "8px",
          marginBottom: "24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {filteredBibits.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: "var(--c-ink-dim)" }}>
            Tidak ada bibit yang ditemukan.
          </div>
        ) : (
          filteredBibits.map((bibit) => {
            const isSelected = selectedBibits.some((b) => b.id === bibit.id);

            return (
              <button
                key={bibit.id}
                onClick={() => onToggle(bibit)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  textAlign: "left",
                  padding: "16px",
                  borderRadius: "var(--r-md)",
                  background: isSelected ? "rgba(59, 130, 246, 0.03)" : "var(--c-bg)",
                  border: `1px solid ${isSelected ? "var(--c-gold)" : "var(--c-border)"}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: "8px" }}>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: "var(--c-surface-2)",
                      color: "var(--c-ink-dim)",
                    }}
                  >
                    {bibit.collection}
                  </span>
                  
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "4px",
                      border: `1px solid ${isSelected ? "var(--c-gold)" : "var(--c-border-mid, #cbd5e1)"}`,
                      background: isSelected ? "var(--c-gold)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                    }}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>

                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-ink)", margin: "0 0 8px 0", lineHeight: 1.3 }}>
                  {bibit.name}
                </h3>
                
                <div style={{ display: "flex", gap: "12px", fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--c-gold)" }} />
                    {bibit.intensity}
                  </span>
                  <span>·</span>
                  <span>{bibit.main_accord}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer / Submit */}
      <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontSize: "0.9rem", color: "var(--c-ink-dim)", textAlign: "center" }}>
          <strong style={{ color: "var(--c-ink)" }}>{selectedBibits.length}</strong> bibit dipilih (min. 2)
        </div>
        
        <button
          onClick={onSubmit}
          disabled={loading || selectedBibits.length < 2}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "var(--r-md)",
            background: loading || selectedBibits.length < 2 ? "var(--c-surface-2)" : "var(--c-gold)",
            color: loading || selectedBibits.length < 2 ? "var(--c-ink-dim)" : "#ffffff",
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loading || selectedBibits.length < 2 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
        >
          {loading ? (
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
              <FlaskConical size={20} />
            </span>
          ) : (
            <FlaskConical size={20} />
          )}
          Analisis Campuran ({selectedBibits.length} bibit)
        </button>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--c-border); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--c-border-mid, #94a3b8); }
      `}</style>
    </motion.div>
  );
}
