"use client";

import React, { useState } from "react";
import { kasirLogin } from "./actions";
import { Store, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, Loader2 } from "lucide-react";

export default function KasirLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await kasirLogin(formData);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      }
    } catch (err: any) {
      // Next.js redirect will throw NEXT_REDIRECT, let it pass
      if (err?.message?.includes("NEXT_REDIRECT")) {
        return;
      }
      setError("Terjadi kesalahan saat masuk ke terminal kasir.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        backgroundColor: "#0B0D0C",
        backgroundImage:
          "radial-gradient(circle at 50% 15%, rgba(217, 119, 6, 0.12) 0%, transparent 60%), radial-gradient(circle at 80% 85%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)",
        color: "#F3F4F6",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "rgba(18, 22, 20, 0.88)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(217, 119, 6, 0.28)",
          borderRadius: "24px",
          padding: "2.5rem 2rem",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px -5px rgba(217, 119, 6, 0.15)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "60px",
              height: "60px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, rgba(217, 119, 6, 0.25) 0%, rgba(180, 83, 9, 0.1) 100%)",
              border: "1px solid rgba(217, 119, 6, 0.4)",
              color: "#F59E0B",
              marginBottom: "1rem",
              boxShadow: "0 0 20px rgba(217, 119, 6, 0.2)",
            }}
          >
            <Store size={28} />
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              backgroundColor: "rgba(217, 119, 6, 0.12)",
              color: "#FBBF24",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "0.6rem",
              border: "1px solid rgba(217, 119, 6, 0.25)",
            }}
          >
            <Sparkles size={12} />
            <span>Point of Sale Terminal</span>
          </div>

          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "#FFFFFF",
            }}
          >
            Ela Parfum POS
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#9CA3AF",
              marginTop: "0.4rem",
              marginBottom: 0,
            }}
          >
            Masuk dengan akun staf internal untuk mengelola kasir cabang toko.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#FCA5A5",
              padding: "0.75rem 1rem",
              borderRadius: "12px",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <ShieldCheck size={18} style={{ flexShrink: 0, color: "#EF4444" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#D1D5DB",
                marginBottom: "0.45rem",
                letterSpacing: "0.02em",
              }}
            >
              Email Staf
            </label>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#6B7280",
                  pointerEvents: "none",
                }}
              >
                <Mail size={18} />
              </div>
              <input
                type="email"
                name="email"
                required
                placeholder="nama@elaparfum.com"
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem 0.85rem 2.85rem",
                  backgroundColor: "rgba(10, 13, 11, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "14px",
                  color: "#FFFFFF",
                  fontSize: "0.925rem",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(217, 119, 6, 0.6)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(217, 119, 6, 0.18)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.12)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#D1D5DB",
                marginBottom: "0.45rem",
                letterSpacing: "0.02em",
              }}
            >
              Kata Sandi
            </label>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#6B7280",
                  pointerEvents: "none",
                }}
              >
                <Lock size={18} />
              </div>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem 0.85rem 2.85rem",
                  backgroundColor: "rgba(10, 13, 11, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "14px",
                  color: "#FFFFFF",
                  fontSize: "0.925rem",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(217, 119, 6, 0.6)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(217, 119, 6, 0.18)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.12)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.5rem",
              width: "100%",
              padding: "0.95rem",
              background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              color: "#0B0D0C",
              border: "none",
              borderRadius: "14px",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              boxShadow: "0 10px 25px -5px rgba(217, 119, 6, 0.4)",
              transition: "transform 0.15s, opacity 0.15s",
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Memverifikasi Akses Kasir...</span>
              </>
            ) : (
              <>
                <span>Buka Terminal Kasir</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            textAlign: "center",
            fontSize: "0.75rem",
            color: "#6B7280",
          }}
        >
          <span>Multi-Cabang POS: Condet • Rawa Belong • Tangerang</span>
        </div>
      </div>
    </div>
  );
}
