"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  FlaskConical,
  Grid3X3,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";
import { useCart, getItemKey } from "@/lib/cart-context";
import { formatRupiah } from "@/lib/types";

export default function KeranjangPage() {
  const {
    cart,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    subtotal,
  } = useCart();

  const isEmpty = cart.items.length === 0;

  return (
    <div className="customer-page">
      {/* Topbar */}
      <PageHeader />

      {/* Breadcrumb */}
      <div style={{ padding: "80px 0 0", width: "min(1200px, calc(100% - 32px))", margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.8rem", color: "var(--c-ink-dim)", padding: "16px 0" }}>
          <Link href="/" style={{ color: "var(--c-ink-dim)" }}>Beranda</Link>
          <ChevronRight size={12} />
          <span style={{ color: "var(--c-gold)" }}>Keranjang Belanja</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ width: "min(1200px, calc(100% - 32px))", margin: "0 auto", padding: "8px 0 80px", minHeight: "60vh" }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2rem, 4vw, 2.6rem)",
          fontWeight: 400,
          color: "var(--c-ink)",
          marginBottom: 32,
          textAlign: "center",
        }}>
          Keranjang <em>Belanja</em>
        </h1>

        {isEmpty ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <ShoppingBag size={64} style={{ color: "var(--c-ink-dim)", opacity: 0.25, marginBottom: 20 }} />
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, color: "var(--c-ink-muted)", marginBottom: 8 }}>
              Keranjang belanja Anda kosong
            </h3>
            <p style={{ color: "var(--c-ink-dim)", fontSize: "0.9rem", marginBottom: 24 }}>
              Sepertinya Anda belum menambahkan parfum apapun.
            </p>
            <Link href="/katalog" className="btn btn-primary">
              <ArrowLeft size={16} />
              Mulai Berbelanja
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32, alignItems: "start" }}>
            {/* Left — Cart items */}
            <div>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 16,
              }}>
                <span style={{ fontSize: "0.84rem", color: "var(--c-ink-muted)" }}>
                  {totalItems} item di keranjang
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { if (confirm("Hapus semua item dari keranjang?")) clearCart(); }}
                  style={{ color: "var(--c-rose)" }}
                >
                  <Trash2 size={14} />
                  Kosongkan
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cart.items.map((item) => {
                  const itemKey = getItemKey(item);
                  const isRefill = item.itemType === "refill" || !!item.refillData;

                  return (
                    <div
                      key={itemKey}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px 1fr auto auto auto",
                        gap: 16,
                        alignItems: "center",
                        padding: 16,
                        background: "var(--c-surface-1)",
                        border: isRefill ? "1px solid rgba(234, 179, 8, 0.3)" : "1px solid var(--c-border)",
                        borderRadius: "var(--r-md)",
                        position: "relative",
                      }}
                    >
                      {/* Thumbnail */}
                      {item.imageUrl ? (
                        <div
                          style={{
                            width: 70,
                            height: 70,
                            borderRadius: "var(--r-sm)",
                            overflow: "hidden",
                            background: "var(--c-surface-2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid var(--c-border)",
                          }}
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.perfumeName}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                      ) : isRefill ? (
                        <div
                          style={{
                            width: 70,
                            height: 70,
                            borderRadius: "var(--r-sm)",
                            background: "rgba(234, 179, 8, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(234, 179, 8, 0.2)",
                            color: "var(--c-gold)",
                          }}
                        >
                          <FlaskConical size={28} />
                        </div>
                      ) : (
                        <Link
                          href={`/parfum/${item.perfumeSlug || ""}`}
                          style={{
                            width: 70,
                            height: 70,
                            borderRadius: "var(--r-sm)",
                            background: `linear-gradient(135deg, var(--c-surface-3), var(--c-surface-2))`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Package size={24} style={{ color: "var(--c-ink-dim)", opacity: 0.4 }} />
                        </Link>
                      )}

                      {/* Info */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                          {isRefill ? (
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                color: "var(--c-ink)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Sparkles size={14} style={{ color: "var(--c-gold)" }} />
                              {item.perfumeName}
                            </span>
                          ) : (
                            <Link
                              href={`/parfum/${item.perfumeSlug || ""}`}
                              style={{
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                color: "var(--c-ink)",
                                textDecoration: "none",
                              }}
                            >
                              {item.perfumeName}
                            </Link>
                          )}

                          {isRefill && (
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 100,
                                background: "rgba(234, 179, 8, 0.15)",
                                color: "var(--c-gold)",
                                border: "1px solid rgba(234, 179, 8, 0.3)",
                              }}
                            >
                              Racikan Refill
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: "0.82rem", color: "var(--c-ink-dim)", marginTop: 2 }}>
                          {item.sizeLabel} · <strong style={{ color: "var(--c-ink)" }}>{formatRupiah(item.price)}</strong> / botol
                        </div>

                        {/* Refill Composition preview if any */}
                        {item.refillData?.bibits && item.refillData.bibits.length > 0 && (
                          <div style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)", marginTop: 4, lineHeight: 1.4 }}>
                            Komposisi: {item.refillData.bibits.map((b) => `${b.name} (${b.volumeMl?.toFixed(1) || 0}ml)`).join(", ")}
                          </div>
                        )}
                      </div>

                      {/* Quantity Stepper */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0,
                          border: "1px solid var(--c-border)",
                          borderRadius: "var(--r-sm)",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                          className="btn-icon"
                          style={{ borderRadius: 0, width: 32, height: 32, fontSize: "0.8rem" }}
                          aria-label="Kurangi jumlah"
                        >
                          <Minus size={13} />
                        </button>
                        <div
                          style={{
                            width: 36,
                            height: 32,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 600,
                            fontSize: "0.82rem",
                            color: "var(--c-ink)",
                            borderLeft: "1px solid var(--c-border)",
                            borderRight: "1px solid var(--c-border)",
                          }}
                        >
                          {item.quantity}
                        </div>
                        <button
                          onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                          className="btn-icon"
                          style={{ borderRadius: 0, width: 32, height: 32, fontSize: "0.8rem" }}
                          aria-label="Tambah jumlah"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--c-gold)", whiteSpace: "nowrap" }}>
                        {formatRupiah(item.price * item.quantity)}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => removeItem(itemKey)}
                        className="btn-icon btn-icon-sm"
                        style={{ color: "var(--c-ink-dim)" }}
                        aria-label={`Hapus ${item.perfumeName}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right — Summary */}
            <div style={{ position: "sticky", top: 100 }}>
              <div style={{
                background: "var(--c-surface-1)",
                border: "1px solid var(--c-border)",
                borderRadius: "var(--r-lg)",
                padding: 24,
              }}>
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.2rem",
                  fontWeight: 400,
                  color: "var(--c-ink)",
                  marginBottom: 20,
                }}>
                  Ringkasan Belanja
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                    <span style={{ color: "var(--c-ink-muted)" }}>Subtotal ({totalItems} item)</span>
                    <span style={{ color: "var(--c-ink)" }}>{formatRupiah(subtotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                    <span style={{ color: "var(--c-ink-muted)" }}>Ongkos Kirim</span>
                    <span style={{ color: "var(--c-teal)", fontSize: "0.82rem" }}>Dihitung saat checkout</span>
                  </div>
                </div>

                <div style={{ height: 1, background: "var(--c-border)", marginBottom: 16 }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--c-ink)" }}>Total</span>
                  <span style={{ fontWeight: 700, fontSize: "1.3rem", color: "var(--c-gold)" }}>
                    {formatRupiah(subtotal)}
                  </span>
                </div>

                <Link
                  href="/checkout"
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center", height: 46 }}
                >
                  <ChevronRight size={17} />
                  Lanjut ke Pembayaran
                </Link>

                <Link
                  href="/katalog"
                  className="btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
                >
                  <ArrowLeft size={15} />
                  Lanjut Belanja
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
