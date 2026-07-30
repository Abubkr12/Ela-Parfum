"use client";

import React from "react";
import { Check, Package } from "lucide-react";
import { motion } from "framer-motion";
import { BottleData } from "./types";

interface StepBottleSelectProps {
  bottles: BottleData[];
  selected: BottleData | null;
  onSelect: (bottle: BottleData) => void;
}

const formatRupiah = (price: number) => {
  return `Rp${price.toLocaleString("id-ID")}`;
};

export function StepBottleSelect({ bottles, selected, onSelect }: StepBottleSelectProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: "8px", fontFamily: "var(--font-display)" }}>
          Pilih Botol Parfum
        </h2>
        <p style={{ color: "var(--c-ink-dim)", margin: 0 }}>
          Pilih ukuran botol yang Anda inginkan.
        </p>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
        gap: "24px" 
      }}>
        {bottles.filter(b => b.is_active).map((bottle) => {
          const isSelected = selected?.id === bottle.id;

          return (
            <motion.button
              key={bottle.id}
              variants={itemVariants}
              onClick={() => onSelect(bottle)}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "0",
                borderRadius: "var(--r-lg)",
                background: "var(--c-surface-1)",
                border: `2px solid ${isSelected ? "var(--c-gold)" : "var(--c-border)"}`,
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
                boxShadow: isSelected ? "0 12px 30px rgba(59, 130, 246, 0.15)" : "0 4px 20px rgba(0,0,0,0.03)",
                transform: isSelected ? "translateY(-4px)" : "translateY(0)",
                textAlign: "left",
              }}
            >
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "var(--c-gold)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <Check size={16} strokeWidth={3} />
                </div>
              )}
              
              <div style={{ 
                width: "100%", 
                aspectRatio: "1/1", 
                background: bottle.image_url ? "#fff" : "linear-gradient(135deg, var(--c-surface-1) 0%, var(--c-surface-2) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderBottom: "1px solid var(--c-border)",
                overflow: "hidden",
              }}>
                {bottle.image_url ? (
                  <img 
                    src={bottle.image_url} 
                    alt={bottle.name} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                ) : (
                  <Package size={48} style={{ color: "var(--c-ink-dim)", opacity: 0.5 }} />
                )}
              </div>
              
              <div style={{ padding: "16px", width: "100%" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--c-ink-dim)", marginBottom: "4px" }}>
                  {bottle.capacity_ml} ml
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--c-ink)", margin: "0 0 8px 0", lineHeight: 1.2 }}>
                  {bottle.name}
                </h3>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-gold)" }}>
                  {formatRupiah(bottle.price)}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
