"use client";

import React from "react";
import { Check, RotateCcw, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { BibitData, AiAnalysis, RefillMode } from "./types";

interface StepAiResultProps {
  mode: RefillMode;
  recommendedBibit: BibitData | null;
  selectedBibits: BibitData[];
  analysis: AiAnalysis;
  onAccept: () => void;
  onRetry: () => void;
}

export function StepAiResult({ mode, recommendedBibit, selectedBibits, analysis, onAccept, onRetry }: StepAiResultProps) {
  const isCustom = mode === "custom";

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
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div style={{ padding: "12px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", color: "var(--c-gold)" }}>
          <Sparkles size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)", margin: 0, fontFamily: "var(--font-display)" }}>
            Hasil Analisis AI
          </h2>
          <p style={{ color: "var(--c-ink-dim)", margin: 0 }}>
            Tingkat Kepercayaan: <span style={{ fontWeight: 600, color: "var(--c-gold)" }}>{analysis.confidence}%</span>
          </p>
        </div>
      </div>

      {/* Blend Verdict Warning / Status */}
      {analysis.blend_verdict && (
        <div style={{
          padding: "16px",
          marginBottom: "32px",
          borderRadius: "var(--r-md)",
          background: analysis.blend_verdict === "HARMONIS" ? "rgba(16, 185, 129, 0.1)" : analysis.blend_verdict === "CUKUP HARMONIS" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
          border: `1px solid ${analysis.blend_verdict === "HARMONIS" ? "#10b981" : analysis.blend_verdict === "CUKUP HARMONIS" ? "#f59e0b" : "#ef4444"}40`,
          color: analysis.blend_verdict === "HARMONIS" ? "#047857" : analysis.blend_verdict === "CUKUP HARMONIS" ? "#b45309" : "#b91c1c"
        }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            {analysis.blend_verdict === "HARMONIS" ? "✨" : "⚠️"} 
            Status Racikan: {analysis.blend_verdict}
          </h4>
          <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5 }}>
            {analysis.blend_warning || (analysis.blend_verdict === "HARMONIS" ? "Kombinasi bibit ini sangat cocok dan akan menghasilkan aroma yang seimbang dan menyenangkan." : "Kombinasi bibit ini memiliki risiko aroma yang kurang seimbang. Anda tetap dapat melanjutkan jika yakin dengan pilihan ini.")}
          </p>
        </div>
      )}

      {/* Bibit Selection Display */}
      <div style={{ marginBottom: "32px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: "16px" }}>
          {isCustom 
            ? (selectedBibits.length === 1 ? "Bibit Pilihan Anda:" : (analysis.custom_name || "Kombinasi Pilihan Anda:")) 
            : "Rekomendasi Bibit Terbaik:"}
        </h3>
        
        <div style={{ display: "grid", gridTemplateColumns: isCustom ? "repeat(auto-fit, minmax(200px, 1fr))" : "1fr", gap: "16px" }}>
          {isCustom ? (
            selectedBibits.map(bibit => (
              <div key={bibit.id} style={{ padding: "16px", borderRadius: "var(--r-md)", background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "4px 8px", borderRadius: "4px", background: "var(--c-surface-2)", color: "var(--c-ink-dim)", display: "inline-block", marginBottom: "8px" }}>
                  {bibit.collection}
                </span>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-ink)", margin: "0 0 4px 0" }}>{bibit.name}</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", margin: 0 }}>{bibit.main_accord} · {bibit.intensity}</p>
              </div>
            ))
          ) : recommendedBibit ? (
            <div style={{ padding: "20px", borderRadius: "var(--r-md)", background: "var(--c-bg)", border: "1px solid var(--c-gold)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, background: "var(--c-gold)", color: "#fff", padding: "4px 12px", fontSize: "0.75rem", fontWeight: 600, borderBottomLeftRadius: "var(--r-md)" }}>
                Match Score {analysis.confidence}%
              </div>
              <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "4px 8px", borderRadius: "4px", background: "rgba(59, 130, 246, 0.1)", color: "var(--c-gold)", display: "inline-block", marginBottom: "8px" }}>
                {recommendedBibit.collection}
              </span>
              <h4 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--c-ink)", margin: "0 0 8px 0" }}>{recommendedBibit.name}</h4>
              <p style={{ fontSize: "0.9rem", color: "var(--c-ink-dim)", margin: 0 }}>{recommendedBibit.main_accord} · {recommendedBibit.intensity}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* AI Analysis Details */}
      <div style={{ padding: "24px", borderRadius: "var(--r-md)", background: "var(--c-bg)", border: "1px solid var(--c-border)", marginBottom: "32px" }}>
        <p style={{ fontSize: "1rem", color: "var(--c-ink)", lineHeight: 1.6, margin: "0 0 24px 0", fontStyle: "italic" }}>
          "{analysis.description}"
        </p>

        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
            Piramida Aroma (Predicted)
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { label: "Top Notes", notes: analysis.predicted_notes.top, bg: "rgba(245, 158, 11, 0.1)", color: "#d97706" },
              { label: "Middle Notes", notes: analysis.predicted_notes.middle, bg: "rgba(16, 185, 129, 0.1)", color: "#059669" },
              { label: "Base Notes", notes: analysis.predicted_notes.base, bg: "rgba(99, 102, 241, 0.1)", color: "#4f46e5" },
            ].map((layer, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ width: "90px", fontSize: "0.85rem", fontWeight: 600, color: layer.color, paddingTop: "4px" }}>
                  {layer.label}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", flex: 1 }}>
                  {layer.notes.map((note, i) => (
                    <span key={i} style={{ fontSize: "0.85rem", padding: "4px 10px", borderRadius: "100px", background: layer.bg, color: layer.color, fontWeight: 500 }}>
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
            Prediksi Intensitas
          </h4>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--c-ink)" }}>{analysis.predicted_intensity}</span>
            <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "var(--c-surface-2)", overflow: "hidden" }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: analysis.predicted_intensity.toLowerCase().includes("strong") || analysis.predicted_intensity.toLowerCase().includes("kuat") ? "85%" : 
                         analysis.predicted_intensity.toLowerCase().includes("medium") || analysis.predicted_intensity.toLowerCase().includes("sedang") ? "60%" : "35%", 
                  background: "var(--c-gold)",
                  borderRadius: "3px" 
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="step-actions-container">
        <button
          onClick={onRetry}
          style={{
            flex: 1,
            padding: "16px",
            borderRadius: "var(--r-md)",
            background: "transparent",
            color: "var(--c-ink-dim)",
            border: "1px solid var(--c-border)",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--c-ink)"; e.currentTarget.style.background = "var(--c-surface-2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--c-ink-dim)"; e.currentTarget.style.background = "transparent"; }}
        >
          <RotateCcw size={18} />
          Coba Lagi
        </button>
        <button
          onClick={onAccept}
          style={{
            flex: 2,
            padding: "16px",
            borderRadius: "var(--r-md)",
            background: "var(--c-gold)",
            color: "#ffffff",
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <Check size={20} />
          Setuju, Lanjutkan
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .step-actions-container {
          display: flex;
          gap: 16px;
          flex-direction: column-reverse;
        }
        @media (min-width: 640px) {
          .step-actions-container {
            flex-direction: row;
          }
        }
      `}} />
    </motion.div>
  );
}
