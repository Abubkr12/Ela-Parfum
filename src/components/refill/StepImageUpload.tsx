"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StepImageUploadProps {
  imageBase64: string | null;
  onImageSelect: (base64: string) => void;
  onRemove: () => void;
  onSubmit: () => void;
  loading: boolean;
}

export function StepImageUpload({ imageBase64, onImageSelect, onRemove, onSubmit, loading }: StepImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        // Resize if width > 800px
        if (width > 800) {
          height = Math.round((height * 800) / width);
          width = 800;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.7);
          onImageSelect(compressed);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
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
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: "8px", fontFamily: "var(--font-display)" }}>
        Upload Foto Referensi
      </h2>
      <p style={{ color: "var(--c-ink-dim)", marginBottom: "24px" }}>
        Punya botol parfum favorit? Upload fotonya, AI kami akan menganalisis dan mencarikan bibit yang mirip.
      </p>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !imageBase64 && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "var(--c-gold)" : "var(--c-border-mid, #cbd5e1)"}`,
          borderRadius: "var(--r-md)",
          padding: imageBase64 ? "0" : "48px 24px",
          textAlign: "center",
          cursor: imageBase64 ? "default" : "pointer",
          transition: "all 0.3s ease",
          background: isDragging ? "rgba(59, 130, 246, 0.05)" : "var(--c-bg)",
          position: "relative",
          overflow: "hidden",
          minHeight: "240px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
        }}
      >
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: "none" }} 
        />
        
        <AnimatePresence mode="wait">
          {imageBase64 ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ width: "100%", height: "100%", position: "relative" }}
            >
              <img 
                src={imageBase64} 
                alt="Preview" 
                style={{ width: "100%", height: "300px", objectFit: "contain", background: "#f1f5f9" }} 
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)",
                }}
              >
                <X size={16} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}
            >
              <div style={{ padding: "16px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", color: "var(--c-gold)" }}>
                <UploadCloud size={32} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: "var(--c-ink)", margin: "0 0 4px 0" }}>
                  Klik atau Drag & Drop foto di sini
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", margin: 0 }}>
                  Format: JPG, PNG (Max 5MB)
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={onSubmit}
        disabled={loading || !imageBase64}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: "var(--r-md)",
          background: loading || !imageBase64 ? "var(--c-surface-2)" : "var(--c-gold)",
          color: loading || !imageBase64 ? "var(--c-ink-dim)" : "#ffffff",
          border: "none",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: loading || !imageBase64 ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "all 0.2s ease",
        }}
      >
        {loading ? (
          <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
            <Search size={20} />
          </span>
        ) : (
          <Search size={20} />
        )}
        Identifikasi Parfum
      </button>
    </motion.div>
  );
}
