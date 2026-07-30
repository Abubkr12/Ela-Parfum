"use client";

import React, { useState } from "react";
import { Sparkles, Camera, FlaskConical } from "lucide-react";
import { motion } from "framer-motion";
import { RefillMode } from "./types";

interface StepMethodSelectProps {
  onSelect: (mode: RefillMode) => void;
}

export function StepMethodSelect({ onSelect }: StepMethodSelectProps) {
  const [hovered, setHovered] = useState<RefillMode | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const methods: { id: RefillMode; title: string; desc: string; icon: any }[] = [
    {
      id: "ai",
      title: "Refill via AI",
      desc: "Jelaskan parfum impian Anda, AI kami akan merekomendasikan bibit yang tepat.",
      icon: Sparkles
    },
    {
      id: "gambar",
      title: "Refill via Gambar",
      desc: "Upload foto botol parfum referensi, AI akan mengidentifikasi dan mencarikan bibit yang sesuai.",
      icon: Camera
    },
    {
      id: "custom",
      title: "Refill Multiple Custom",
      desc: "Campur 2 atau lebih bibit parfum untuk menciptakan aroma unik Anda sendiri.",
      icon: FlaskConical
    }
  ];

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}
    >
      {methods.map((method) => {
        const Icon = method.icon;
        const isHovered = hovered === method.id;

        return (
          <motion.button
            key={method.id}
            variants={itemVariants}
            onClick={() => onSelect(method.id)}
            onMouseEnter={() => setHovered(method.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              padding: "32px",
              borderRadius: "var(--r-lg)",
              background: "var(--c-surface-1)",
              border: `1px solid ${isHovered ? "var(--c-gold)" : "var(--c-border)"}`,
              cursor: "pointer",
              transition: "all 0.3s ease",
              transform: isHovered ? "translateY(-4px)" : "translateY(0)",
              boxShadow: isHovered ? "0 12px 30px rgba(0,0,0,0.05)" : "0 4px 20px rgba(0,0,0,0.02)",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(59, 130, 246, 0.1)", // Using blue accent explicitly for the icon bg
                color: "var(--c-gold)",
                marginBottom: "24px",
                transition: "all 0.3s ease",
                transform: isHovered ? "scale(1.1)" : "scale(1)",
              }}
            >
              <Icon size={28} />
            </div>
            
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: "12px", fontFamily: "var(--font-display)" }}>
              {method.title}
            </h3>
            
            <p style={{ color: "var(--c-ink-dim)", lineHeight: 1.6, margin: 0 }}>
              {method.desc}
            </p>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
