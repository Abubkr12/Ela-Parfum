"use client";

import React from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface StepRatioSelectProps {
  selected: "50/50" | "70/30" | null;
  onSelect: (ratio: "50/50" | "70/30") => void;
}

export function StepRatioSelect({ selected, onSelect }: StepRatioSelectProps) {
  const ratios = [
    {
      id: "50/50" as const,
      title: "Eau De Parfum",
      subtitle: "50% Bibit · 50% Pelarut",
      desc: "Konsentrasi standar, cocok untuk penggunaan sehari-hari. Ketahanan 6-8 jam.",
    },
    {
      id: "70/30" as const,
      title: "Extrait De Parfum",
      subtitle: "70% Bibit · 30% Pelarut",
      desc: "Konsentrasi tinggi, aroma lebih kuat dan tahan lama. Ketahanan 8-12 jam.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        maxWidth: "700px",
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: "8px", fontFamily: "var(--font-display)" }}>
          Pilih Rasio Campuran
        </h2>
        <p style={{ color: "var(--c-ink-dim)", margin: 0 }}>
          Tentukan tingkat konsentrasi parfum sesuai dengan kebutuhan Anda.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
        {ratios.map((ratio) => {
          const isSelected = selected === ratio.id;

          return (
            <button
              key={ratio.id}
              onClick={() => onSelect(ratio.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                textAlign: "left",
                padding: "32px",
                borderRadius: "var(--r-lg)",
                background: "var(--c-surface-1)",
                border: `2px solid ${isSelected ? "var(--c-gold)" : "var(--c-border)"}`,
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
                boxShadow: isSelected ? "0 12px 30px rgba(59, 130, 246, 0.1)" : "0 4px 20px rgba(0,0,0,0.03)",
                transform: isSelected ? "translateY(-4px)" : "translateY(0)",
              }}
            >
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "var(--c-gold)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
              
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--c-gold)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
                {ratio.subtitle}
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--c-ink)", margin: "0 0 16px 0", fontFamily: "var(--font-display)" }}>
                {ratio.title}
              </h3>
              <p style={{ color: "var(--c-ink-dim)", lineHeight: 1.6, margin: 0 }}>
                {ratio.desc}
              </p>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
