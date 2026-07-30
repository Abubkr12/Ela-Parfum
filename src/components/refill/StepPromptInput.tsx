"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface StepPromptInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function StepPromptInput({ value, onChange, onSubmit, loading }: StepPromptInputProps) {
  const maxLength = 500;

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
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: "16px", fontFamily: "var(--font-display)" }}>
        Ceritakan Parfum Impian Anda
      </h2>
      
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder="Jelaskan parfum impian Anda...&#10;Contoh: Saya ingin parfum segar dengan aroma citrus dan kayu yang cocok untuk acara formal"
          style={{
            width: "100%",
            minHeight: "160px",
            padding: "16px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--c-border)",
            background: "var(--c-bg)",
            color: "var(--c-ink)",
            fontSize: "1rem",
            lineHeight: 1.6,
            resize: "vertical",
            outline: "none",
            transition: "border-color 0.2s ease",
            fontFamily: "var(--font-body)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--c-gold)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--c-border)")}
        />
        
        <div 
          style={{ 
            position: "absolute", 
            bottom: "16px", 
            right: "16px", 
            fontSize: "0.85rem", 
            color: value.length >= maxLength ? "#ef4444" : "var(--c-ink-dim)" 
          }}
        >
          {value.length}/{maxLength}
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={loading || value.trim().length === 0}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: "var(--r-md)",
          background: loading || value.trim().length === 0 ? "var(--c-surface-2)" : "var(--c-gold)",
          color: loading || value.trim().length === 0 ? "var(--c-ink-dim)" : "#ffffff",
          border: "none",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: loading || value.trim().length === 0 ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "all 0.2s ease",
        }}
      >
        {loading ? (
          <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
            <Sparkles size={20} />
          </span>
        ) : (
          <Sparkles size={20} />
        )}
        Analisis dengan AI
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}
