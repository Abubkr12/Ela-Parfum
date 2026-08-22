"use client";

import React, { useState } from "react";
import { Package, Wine, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface StepBottleChoiceProps {
  onChooseOurBottle: () => void;
  onChooseOwnBottle: (volumeMl: number) => void;
}

export function StepBottleChoice({ onChooseOurBottle, onChooseOwnBottle }: StepBottleChoiceProps) {
  const [choice, setChoice] = useState<"ours" | "own" | null>(null);
  const [volumeMl, setVolumeMl] = useState(30);
  const [hovered, setHovered] = useState<"ours" | "own" | null>(null);

  const handleConfirmOwn = () => {
    if (volumeMl >= 1 && volumeMl <= 1000) {
      onChooseOwnBottle(volumeMl);
    }
  };

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
        maxWidth: "700px",
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: "8px", fontFamily: "var(--font-display)" }}>
          Pilih Jenis Botol
        </h2>
        <p style={{ color: "var(--c-ink-dim)", margin: 0 }}>
          Gunakan botol dari kami, atau bawa botol parfum Anda sendiri untuk diisi ulang.
        </p>
      </div>

      <div className="bottle-choice-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: choice === "own" ? "24px" : "0" }}>
        {/* Our Bottle */}
        <button
          className="bottle-choice-btn"
          onClick={() => { setChoice("ours"); onChooseOurBottle(); }}
          onMouseEnter={() => setHovered("ours")}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "28px 20px",
            borderRadius: "var(--r-md)",
            background: choice === "ours" ? "rgba(59, 130, 246, 0.06)" : "var(--c-surface-2)",
            border: `2px solid ${choice === "ours" ? "var(--c-gold)" : hovered === "ours" ? "var(--c-gold)" : "var(--c-border)"}`,
            cursor: "pointer",
            transition: "all 0.3s ease",
            transform: hovered === "ours" ? "translateY(-2px)" : "translateY(0)",
            boxShadow: hovered === "ours" ? "0 8px 24px rgba(0,0,0,0.06)" : "none",
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(59, 130, 246, 0.1)", color: "var(--c-gold)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16, transition: "transform 0.3s ease",
            transform: hovered === "ours" ? "scale(1.1)" : "scale(1)",
          }}>
            <Package size={28} />
          </div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: 8, fontFamily: "var(--font-display)" }}>
            Botol Kami
          </h3>
          <p style={{ color: "var(--c-ink-dim)", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
            Pilih dari koleksi botol premium yang kami sediakan.
          </p>
        </button>

        {/* Own Bottle */}
        <button
          className="bottle-choice-btn"
          onClick={() => setChoice("own")}
          onMouseEnter={() => setHovered("own")}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "28px 20px",
            borderRadius: "var(--r-md)",
            background: choice === "own" ? "rgba(168, 85, 247, 0.06)" : "var(--c-surface-2)",
            border: `2px solid ${choice === "own" ? "#a855f7" : hovered === "own" ? "#a855f7" : "var(--c-border)"}`,
            cursor: "pointer",
            transition: "all 0.3s ease",
            transform: hovered === "own" ? "translateY(-2px)" : "translateY(0)",
            boxShadow: hovered === "own" ? "0 8px 24px rgba(0,0,0,0.06)" : "none",
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(168, 85, 247, 0.1)", color: "#a855f7",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16, transition: "transform 0.3s ease",
            transform: hovered === "own" ? "scale(1.1)" : "scale(1)",
          }}>
            <Wine size={28} />
          </div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: 8, fontFamily: "var(--font-display)" }}>
            Bawa Botol Sendiri
          </h3>
          <p style={{ color: "var(--c-ink-dim)", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
            Bawa botol parfum Anda untuk diisi ulang di toko.
          </p>
        </button>
      </div>

      {/* Own Bottle Volume Input */}
      {choice === "own" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          style={{
            background: "var(--c-surface-2)",
            borderRadius: "var(--r-md)",
            padding: "24px",
            border: "1px solid var(--c-border)",
          }}
        >
          <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 4 }}>
            Volume Botol Anda
          </h4>
          <p style={{ fontSize: "0.82rem", color: "var(--c-ink-dim)", marginBottom: 20 }}>
            Masukkan kapasitas botol yang akan Anda bawa (1ml - 1000ml)
          </p>

          {/* Slider */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="range"
              min={1}
              max={1000}
              step={1}
              value={volumeMl}
              onChange={(e) => setVolumeMl(Number(e.target.value))}
              style={{
                width: "100%",
                height: 6,
                borderRadius: 3,
                appearance: "none",
                background: `linear-gradient(to right, var(--c-gold) ${((volumeMl - 1) / 999) * 100}%, var(--c-border) ${((volumeMl - 1) / 999) * 100}%)`,
                outline: "none",
                cursor: "pointer",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--c-ink-dim)", marginTop: 4 }}>
              <span>1ml</span>
              <span>1000ml</span>
            </div>
          </div>

          {/* Number Input */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <input
              type="number"
              min={1}
              max={1000}
              value={volumeMl}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 0 && val <= 9999) setVolumeMl(val);
              }}
              onBlur={() => {
                if (volumeMl < 1) setVolumeMl(1);
                if (volumeMl > 1000) setVolumeMl(1000);
              }}
              style={{
                width: 80,
                padding: "10px 12px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--c-border)",
                background: "var(--c-surface-1)",
                color: "var(--c-ink)",
                fontSize: "1.1rem",
                fontWeight: 700,
                textAlign: "center",
                outline: "none",
              }}
            />
            <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--c-ink-dim)" }}>ml</span>
          </div>

          {/* Info Box */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "12px 16px", borderRadius: "var(--r-sm)",
            background: "rgba(234, 179, 8, 0.08)",
            border: "1px solid rgba(234, 179, 8, 0.2)",
            marginBottom: 20,
          }}>
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>&#9432;</span>
            <p style={{ fontSize: "0.82rem", color: "var(--c-ink)", margin: 0, lineHeight: 1.5 }}>
              Dengan membawa botol sendiri, pesanan Anda hanya bisa diambil langsung di <strong>Toko Ela Parfum</strong>. Pengiriman via kurir tidak tersedia untuk opsi ini.
            </p>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmOwn}
            disabled={volumeMl < 1 || volumeMl > 1000}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "var(--r-md)",
              background: volumeMl >= 1 && volumeMl <= 1000 ? "var(--c-gold)" : "var(--c-surface-2)",
              color: volumeMl >= 1 && volumeMl <= 1000 ? "#ffffff" : "var(--c-ink-dim)",
              border: "none",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: volumeMl >= 1 && volumeMl <= 1000 ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s ease",
              boxShadow: volumeMl >= 1 && volumeMl <= 1000 ? "0 6px 20px rgba(59, 130, 246, 0.2)" : "none",
            }}
          >
            Lanjutkan dengan {volumeMl}ml <ArrowRight size={18} />
          </button>
        </motion.div>
      )}

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--c-gold);
          border: 3px solid var(--c-surface-1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--c-gold);
          border: 3px solid var(--c-surface-1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          cursor: pointer;
        }
        input[type="number"]:focus {
          border-color: var(--c-gold) !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </motion.div>
  );
}
