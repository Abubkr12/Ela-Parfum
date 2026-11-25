"use client";

import React, { useState } from "react";
import { kasirLogin } from "./actions";
import { Store, Lock, Mail, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import "../kasir.css";

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
      if (err?.digest?.startsWith("NEXT_REDIRECT") || err?.message?.includes("NEXT_REDIRECT")) {
        throw err;
      }
      setError("Terjadi kesalahan saat masuk ke terminal kasir.");
      setLoading(false);
    }
  }

  return (
    <main className="pos-login-root">
      <div className="pos-login-card">
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "var(--c-gold-dim, rgba(37, 99, 235, 0.16))",
              border: "1px solid var(--pos-border-control, #6c7a76)",
              color: "var(--pos-accent-text)",
              marginBottom: "1rem",
            }}
          >
            <Store size={26} />
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              fontSize: "2rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              margin: 0,
              color: "var(--c-ink)",
            }}
          >
            Ela Parfum POS
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--pos-muted)",
              marginTop: "0.45rem",
              marginBottom: 0,
            }}
          >
            Masuk dengan akun staf internal untuk mengelola kasir cabang toko.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: "var(--pos-soft-danger-bg)",
              border: "1px solid var(--pos-soft-danger-border)",
              color: "var(--pos-danger)",
              padding: "0.75rem 1rem",
              borderRadius: "12px",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <ShieldCheck size={18} aria-hidden="true" style={{ flexShrink: 0, color: "var(--pos-danger)" }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
          <div>
            <label
              htmlFor="kasir-login-email"
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--c-ink)",
                marginBottom: "0.45rem",
                letterSpacing: "0.02em",
              }}
            >
              Email Staf
            </label>
            <div style={{ position: "relative" }}>
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--pos-muted)",
                  pointerEvents: "none",
                }}
              >
                <Mail size={18} />
              </div>
              <input
                id="kasir-login-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="nama@elaparfum.com"
                className="pos-login-input"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="kasir-login-password"
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--c-ink)",
                marginBottom: "0.45rem",
                letterSpacing: "0.02em",
              }}
            >
              Kata Sandi
            </label>
            <div style={{ position: "relative" }}>
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--pos-muted)",
                  pointerEvents: "none",
                }}
              >
                <Lock size={18} />
              </div>
              <input
                id="kasir-login-password"
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="pos-login-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="pos-login-submit"
            style={{ opacity: loading ? 0.75 : 1 }}
          >
            {loading ? (
              <>
                <Loader2 size={18} aria-hidden="true" className="animate-spin" />
                <span>Memverifikasi Akses Kasir...</span>
              </>
            ) : (
              <>
                <span>Buka Terminal Kasir</span>
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.75rem",
            paddingTop: "1.15rem",
            borderTop: "1px solid var(--c-border)",
            textAlign: "center",
            fontSize: "0.78rem",
            color: "var(--pos-muted)",
          }}
        >
          <span>Multi-Cabang POS: Condet • Rawa Belong • Tangerang</span>
        </div>
      </div>
    </main>
  );
}
