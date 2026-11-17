"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  CreditCard,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { formatRupiah } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart-context";
import { openMidtransSnap } from "@/lib/snap-client";
import {
  getCheckoutOrderDetails,
  resolveOrderIdByCode,
  restoreOrderToCartData,
  retryMidtransPayment,
  syncMidtransOrderStatus,
} from "../actions";

function getReasonCopy(reason: string | null, txStatus: string | null) {
  const normalized = (txStatus || reason || "").toLowerCase();
  if (normalized === "expire") {
    return {
      isUnfinish: false,
      badge: "Waktu Pembayaran Habis",
      title: "Sesi Pembayaran Telah Kedaluwarsa",
      desc: "Batas waktu pembayaran untuk transaksi ini telah berakhir. Pesanan Anda tetap tersimpan—silakan ulangi pembayaran untuk mendapatkan kode QRIS/VA baru.",
    };
  }
  if (normalized === "deny" || normalized === "failure" || normalized === "cancel" || normalized === "error") {
    return {
      isUnfinish: false,
      badge: "Pembayaran Gagal",
      title: "Pembayaran Tidak Dapat Diproses",
      desc: "Transaksi ditolak atau mengalami kendala pada kanal pembayaran. Pesanan Anda tetap aman di sistem dan belum terhapus—Anda dapat mencoba metode pembayaran lain.",
    };
  }
  return {
    isUnfinish: true,
    badge: "Menunggu Penyelesaian",
    title: "Pembayaran Belum Diselesaikan",
    desc: "Jendela pembayaran ditutup sebelum transaksi selesai. Pesanan Anda tetap tersimpan di Riwayat Pesanan dan keranjang Anda tetap aman untuk dilanjutkan.",
  };
}

function CheckoutFailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const orderCodeParam = searchParams.get("order_id");
  const reasonParam = searchParams.get("reason");
  const txStatusParam = searchParams.get("transaction_status");

  const supabase = createClient();
  const { addItem, clearCart } = useCart();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      let resolvedId = idParam ? parseInt(idParam, 10) : NaN;
      if (Number.isNaN(resolvedId) && orderCodeParam) {
        const res = await resolveOrderIdByCode(orderCodeParam);
        if (res.success && res.orderId) {
          resolvedId = res.orderId;
        }
      }

      if (Number.isNaN(resolvedId)) {
        router.push("/riwayat-pesanan");
        return;
      }

      // Sync latest Midtrans status first in case payment already succeeded
      const syncRes = await syncMidtransOrderStatus(resolvedId);
      const syncedOrder = (syncRes as any)?.order;
      if (
        syncedOrder &&
        (syncedOrder.payment_status === "paid" ||
          syncedOrder.status === "paid" ||
          syncedOrder.status === "processing" ||
          syncedOrder.status === "completed")
      ) {
        clearCart();
        try {
          sessionStorage.removeItem("ela-last-checkout-cart");
        } catch {
          // ignore
        }
        router.replace(`/checkout/success?id=${resolvedId}`);
        return;
      }

      const detailRes = await getCheckoutOrderDetails(resolvedId);
      if (!active) return;

      if (detailRes.error || !detailRes.order) {
        router.push("/riwayat-pesanan");
        return;
      }

      setOrder(detailRes.order);
      setLoading(false);
    }

    loadOrder();
    return () => {
      active = false;
    };
  }, [idParam, orderCodeParam, router, supabase, clearCart]);

  const handleRetryPayment = async () => {
    if (!order?.id) return;

    setRetrying(true);
    setErrorMsg("");

    try {
      const res = await retryMidtransPayment(order.id);
      if (res.alreadyPaid) {
        clearCart();
        router.replace(`/checkout/success?id=${order.id}`);
        return;
      }
      if (res.error || (!res.token && !res.url)) {
        setErrorMsg(res.error || "Gagal membuat ulang sesi pembayaran Midtrans.");
        setRetrying(false);
        return;
      }

      openMidtransSnap(res.token, res.url || "", order.id, {
        onPaidOrPending: () => {
          clearCart();
          try {
            sessionStorage.removeItem("ela-last-checkout-cart");
          } catch {
            // ignore
          }
        },
        onFailedOrClosed: (reason) => {
          setRetrying(false);
          toast.info(
            reason === "error"
              ? "Pembayaran belum berhasil. Silakan coba metode pembayaran lain."
              : "Jendela pembayaran ditutup. Pesanan Anda tetap tersimpan."
          );
        },
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan saat memulai ulang pembayaran.");
      setRetrying(false);
    }
  };

  const handleBackToCheckout = async () => {
    if (!order?.id) return;

    setRestoring(true);
    setErrorMsg("");

    try {
      const res = await restoreOrderToCartData(order.id);

      if (res.customRedirectUrl) {
        router.push(res.customRedirectUrl);
        return;
      }

      if (res.success && res.items && res.items.length > 0) {
        clearCart();
        res.items.forEach((item) => addItem(item, item.quantity));
        try {
          sessionStorage.removeItem("ela-last-checkout-cart");
        } catch {
          // ignore
        }
        toast.success("Item pesanan dikembalikan ke keranjang. Silakan lanjutkan checkout.");
        router.push("/checkout");
        return;
      }

      // Fallback: restore from sessionStorage snapshot if available
      try {
        const cachedRaw = sessionStorage.getItem("ela-last-checkout-cart");
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached?.items?.length > 0) {
            clearCart();
            cached.items.forEach((item: any) => addItem(item, item.quantity));
            router.push("/checkout");
            return;
          }
        }
      } catch {
        // ignore
      }

      setErrorMsg(res.error || "Gagal memulihkan pesanan ke keranjang.");
      setRestoring(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan saat memulihkan pesanan.");
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          background: "var(--c-bg)",
          color: "var(--c-ink-dim)",
        }}
      >
        <Loader2 className="animate-spin" style={{ color: "var(--c-gold)" }} size={34} />
        <span style={{ fontSize: "0.9rem" }}>Memeriksa status transaksi...</span>
      </div>
    );
  }

  if (!order) return null;

  const copy = getReasonCopy(reasonParam, txStatusParam);
  const storeName =
    order.store_id === 1
      ? "Ela Parfum Condet"
      : order.store_id === 3
        ? "Ela Parfum Tangerang"
        : "Ela Parfum Rawa Belong";
  const accentColor = copy.isUnfinish ? "var(--c-gold)" : "var(--c-rose)";
  const accentBg = copy.isUnfinish
    ? "rgba(201, 168, 76, 0.12)"
    : "rgba(225, 29, 72, 0.12)";
  const accentBorder = copy.isUnfinish
    ? "rgba(201, 168, 76, 0.35)"
    : "rgba(225, 29, 72, 0.35)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--c-bg)", color: "var(--c-ink)" }}>
      <PageHeader />

      <main style={{ width: "min(860px, calc(100% - 32px))", margin: "0 auto", padding: "110px 0 80px" }}>
        {/* Status Hero Card */}
        <section
          style={{
            background: "var(--c-surface-1)",
            border: `1px solid ${accentBorder}`,
            borderRadius: "var(--r-lg)",
            padding: "36px 28px",
            textAlign: "center",
            marginBottom: 24,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: 4,
              background: accentColor,
            }}
          />

          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: accentBg,
              color: accentColor,
              display: "grid",
              placeItems: "center",
              margin: "0 auto 18px",
              border: `1px solid ${accentBorder}`,
            }}
          >
            {copy.isUnfinish ? <Clock size={32} /> : <AlertTriangle size={32} />}
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 100,
              background: accentBg,
              color: accentColor,
              fontSize: "0.78rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            {copy.badge}
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.7rem, 3.2vw, 2.3rem)",
              fontWeight: 500,
              marginBottom: 12,
              color: "var(--c-ink)",
            }}
          >
            {copy.title}
          </h1>

          <p
            style={{
              color: "var(--c-ink-dim)",
              fontSize: "0.95rem",
              lineHeight: 1.65,
              maxWidth: 600,
              margin: "0 auto 22px",
            }}
          >
            {copy.desc}
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
              borderRadius: "var(--r-md)",
              background: "var(--c-surface-2)",
              border: "1px solid var(--c-border)",
              fontSize: "0.86rem",
              color: "var(--c-ink)",
            }}
          >
            <ShieldCheck size={18} style={{ color: "var(--c-gold)", flexShrink: 0 }} />
            <span>
              Pesanan <strong>{order.order_code}</strong> tetap aman tersimpan dan belum dihapus.
            </span>
          </div>
        </section>

        {errorMsg && (
          <div
            style={{
              marginBottom: 20,
              padding: "14px 18px",
              borderRadius: "var(--r-md)",
              background: "rgba(225, 29, 72, 0.1)",
              border: "1px solid rgba(225, 29, 72, 0.25)",
              color: "var(--c-rose)",
              fontSize: "0.9rem",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Order Summary Card */}
        <section
          style={{
            background: "var(--c-surface-1)",
            border: "1px solid var(--c-border)",
            borderRadius: "var(--r-lg)",
            padding: "28px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 16,
              paddingBottom: 18,
              borderBottom: "1px solid var(--c-border)",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Nomor Pesanan
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 600, color: "var(--c-ink)", marginTop: 2 }}>
                {order.order_code}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--r-sm)",
                  background: "var(--c-surface-2)",
                  border: "1px solid var(--c-border)",
                  fontSize: "0.82rem",
                  color: "var(--c-ink-dim)",
                }}
              >
                <Store size={14} style={{ color: "var(--c-gold)" }} />
                {storeName}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--r-sm)",
                  background: "var(--c-surface-2)",
                  border: "1px solid var(--c-border)",
                  fontSize: "0.82rem",
                  color: "var(--c-ink-dim)",
                }}
              >
                <Truck size={14} style={{ color: "var(--c-gold)" }} />
                {order.courier_name || "Pengiriman"}
              </span>
            </div>
          </div>

          {/* Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {(order.order_items || []).length > 0 ? (
              order.order_items.map((item: any, idx: number) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: "var(--r-md)",
                    background: "var(--c-surface-2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "var(--r-sm)",
                        background: "rgba(201, 168, 76, 0.1)",
                        color: "var(--c-gold)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Package size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--c-ink)" }}>
                        {item.perfume_name}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>
                        {item.size_label} • {item.quantity}x
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.94rem", color: "var(--c-ink)", fontVariantNumeric: "tabular-nums" }}>
                    {formatRupiah(item.subtotal || item.price * item.quantity)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: "0.9rem", color: "var(--c-ink-dim)" }}>
                Detail item pesanan tersimpan pada kode transaksi {order.order_code}.
              </div>
            )}
          </div>

          {/* Total Breakdown */}
          <div
            style={{
              paddingTop: 16,
              borderTop: "1px solid var(--c-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", color: "var(--c-ink-dim)" }}>
              <CreditCard size={16} style={{ color: "var(--c-gold)" }} />
              <span>Total Tagihan ({order.payment_method || "Midtrans"})</span>
            </div>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "var(--c-gold)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatRupiah(order.total)}
            </div>
          </div>
        </section>

        {/* Action Panel */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <button
              type="button"
              onClick={handleRetryPayment}
              disabled={retrying || restoring}
              className="btn btn-primary"
              style={{
                height: 52,
                borderRadius: 100,
                fontSize: "0.98rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {retrying ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Membuka Midtrans...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Bayar Ulang Sekarang
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleBackToCheckout}
              disabled={retrying || restoring}
              className="btn btn-outline"
              style={{
                height: 52,
                borderRadius: 100,
                fontSize: "0.96rem",
                fontWeight: 600,
                border: "1px solid var(--c-gold)",
                color: "var(--c-gold)",
                background: "transparent",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              {restoring ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Mengembalikan Pesanan...
                </>
              ) : (
                <>
                  <ArrowLeft size={18} />
                  Kembali ke Checkout & Ubah Pesanan
                </>
              )}
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 10, flexWrap: "wrap" }}>
            <Link
              href="/riwayat-pesanan"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "var(--c-ink-dim)",
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              <ShoppingBag size={16} style={{ color: "var(--c-gold)" }} />
              Simpan & Lihat di Riwayat Pesanan
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CheckoutFailedPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--c-bg)",
          }}
        >
          <Loader2 className="animate-spin" style={{ color: "var(--c-gold)" }} size={32} />
        </div>
      }
    >
      <CheckoutFailedContent />
    </Suspense>
  );
}
