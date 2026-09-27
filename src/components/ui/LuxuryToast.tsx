"use client";

import React from "react";
import { toast } from "sonner";
import { ShoppingBag, ArrowRight, X } from "lucide-react";

interface LuxuryToastProps {
  id: string | number;
  title: string;
  description: string;
  price?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function LuxuryToast({
  id,
  title,
  description,
  price,
  actionLabel = "Keranjang",
  onAction,
}: LuxuryToastProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        width: "100%",
        maxWidth: 440,
        padding: "14px 16px",
        background: "rgba(15, 17, 16, 0.94)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(217, 119, 6, 0.35)",
        borderRadius: "16px",
        boxShadow: "0 16px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(217, 119, 6, 0.12)",
        color: "#ffffff",
        fontFamily: "var(--font-sans, inherit)",
      }}
    >
      {/* Icon Badge */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "12px",
          background: "linear-gradient(135deg, rgba(217, 119, 6, 0.25), rgba(217, 119, 6, 0.08))",
          border: "1px solid rgba(217, 119, 6, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--c-gold, #d97706)",
          flexShrink: 0,
        }}
      >
        <ShoppingBag size={20} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span
            style={{
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.2px",
            }}
          >
            {title}
          </span>
          {price && (
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--c-gold, #d97706)",
                background: "rgba(217, 119, 6, 0.15)",
                padding: "1px 6px",
                borderRadius: "4px",
              }}
            >
              {price}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            color: "rgba(255, 255, 255, 0.72)",
            lineHeight: 1.35,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {description}
        </div>
      </div>

      {/* Action CTA & Close */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {onAction && (
          <button
            type="button"
            onClick={() => {
              toast.dismiss(id);
              onAction();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "7px 12px",
              borderRadius: "100px",
              background: "var(--c-gold, #d97706)",
              color: "#000000",
              fontWeight: 700,
              fontSize: "0.78rem",
              border: "none",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span>{actionLabel}</span>
            <ArrowRight size={13} />
          </button>
        )}

        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255, 255, 255, 0.4)",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)")}
          title="Tutup"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export function showLuxuryCartToast(params: {
  title?: string;
  perfumeName: string;
  variantDetails?: string;
  quantity: number;
  totalPrice?: number;
  onOpenCart: () => void;
}) {
  const {
    title = "Racikan Masuk Keranjang",
    perfumeName,
    variantDetails,
    quantity,
    totalPrice,
    onOpenCart,
  } = params;

  const description = `${quantity}x ${perfumeName}${variantDetails ? ` • ${variantDetails}` : ""}`;
  const priceStr = totalPrice ? `Rp ${totalPrice.toLocaleString("id-ID")}` : undefined;

  toast.custom((t) => (
    <LuxuryToast
      id={t}
      title={title}
      description={description}
      price={priceStr}
      actionLabel="Keranjang"
      onAction={onOpenCart}
    />
  ), {
    duration: 3500,
  });
}
