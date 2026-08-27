"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Lock, MapPin, CreditCard, Loader2, Truck, Landmark, QrCode, Sparkles, Beaker, CheckCircle2, Wine, Store } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";
import { formatRupiah } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { validateVoucher, processCustomCheckout } from "@/app/checkout/actions";

export default function CustomCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [request, setRequest] = useState<any>(null);
  const [recipe, setRecipe] = useState<any>(null);
  const [subtotal, setSubtotal] = useState<number>(0);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);

  const [rates, setRates] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "TUNAI">("QRIS");

  const [voucherCode, setVoucherCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucherError, setVoucherError] = useState("");
  const [voucherSuccess, setVoucherSuccess] = useState("");
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  const fetchRates = async (destinationId: string) => {
    setLoadingRates(true);
    setRates([]);
    setSelectedCourier(null);
    setShippingCost(0);
    setDiscountAmount(0);
    setVoucherSuccess("");
    setVoucherError("");

    try {
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_area_id: destinationId }),
      });
      const data = await res.json();
      if (data && data.pricing) {
        setRates(data.pricing);
        if (data.pricing.length > 0) {
          setSelectedCourier(data.pricing[0]);
          setShippingCost(data.pricing[0].price);
        }
      }
    } catch (err) {
      console.error("Error fetching rates", err);
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push(`/login?redirect=/checkout/custom/${id}`);
          return;
        }

        // Fetch Custom Request Detail
        const res = await fetch(`/api/custom-requests/${id}`);
        const data = await res.json();
        if (!res.ok || !data.data) {
          setError("Data pesanan custom tidak ditemukan.");
          setLoading(false);
          return;
        }

        const req = data.data;
        setRequest(req);

        let parsedRecipe: any = null;
        try {
          parsedRecipe = typeof req.ai_recipe === "string" ? JSON.parse(req.ai_recipe) : req.ai_recipe;
        } catch {
          parsedRecipe = {};
        }
        setRecipe(parsedRecipe);

        // Calculate Subtotal (Harga Racikan)
        let calcSubtotal = 0;
        if (parsedRecipe?.price_breakdown?.total) {
          calcSubtotal = parsedRecipe.price_breakdown.total;
        } else if (req.total_price && req.total_price > 0) {
          calcSubtotal = req.total_price;
        } else {
          const bottlePrice = parsedRecipe?.bottle?.price || req.price_bottle || 0;
          const perfumePrice = req.price_perfume || 0;
          calcSubtotal = bottlePrice + perfumePrice;
        }
        setSubtotal(calcSubtotal);

        // Fetch User Addresses
        const { data: addrs } = await supabase
          .from("customer_addresses")
          .select("*")
          .eq("customer_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });

        if (addrs && addrs.length > 0) {
          setAddresses(addrs);
          const defaultAddr = addrs[0];
          setSelectedAddress(defaultAddr);
          fetchRates(defaultAddr.region_code);
        }
      } catch (err: any) {
        setError(err.message || "Gagal memuat data checkout.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router, supabase]);

  const handleSelectAddress = (addr: any) => {
    setSelectedAddress(addr);
    setShowAddressSelector(false);
    fetchRates(addr.region_code);
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setValidatingVoucher(true);
    setVoucherError("");
    setVoucherSuccess("");

    const res = await validateVoucher(voucherCode.trim(), subtotal, shippingCost);
    if (res.error) {
      setVoucherError(res.error);
      setDiscountAmount(0);
    } else if (res.success && res.discountAmount) {
      setVoucherSuccess(`Voucher diterapkan! Diskon: ${formatRupiah(res.discountAmount)}`);
      setDiscountAmount(res.discountAmount);
    }
    setValidatingVoucher(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnBottle) {
      if (!selectedAddress) {
        setError("Silakan tambahkan alamat pengiriman terlebih dahulu.");
        return;
      }
      if (!selectedCourier) {
        setError("Silakan pilih opsi pengiriman terlebih dahulu.");
        return;
      }
    }
    if (!paymentMethod) {
      setError("Silakan pilih metode pembayaran terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const data = new FormData();
      if (isOwnBottle) {
        data.append("fullName", request.customer_name || "Pelanggan Ela");
        data.append("phone", request.customer_whatsapp || "");
        data.append("address", "Ambil di Toko Ela Parfum");
        data.append("shippingCost", "0");
        data.append("courierInfo", "Ambil di Tempat (Bawa Botol Sendiri)");
        data.append("paymentMethod", paymentMethod);
        data.append("originAreaId", "");
        data.append("originName", "");
        data.append("destinationAreaId", "");
      } else {
        data.append("fullName", selectedAddress.recipient_name);
        data.append("phone", selectedAddress.phone);
        data.append("address", selectedAddress.full_address);
        data.append("shippingCost", shippingCost.toString());
        data.append("courierInfo", `${selectedCourier.courier_name} - ${selectedCourier.courier_service_name}`);
        data.append("paymentMethod", paymentMethod);
        data.append("originAreaId", selectedCourier.origin_area_id || "");
        data.append("originName", selectedCourier.origin_name || "");
        data.append("destinationAreaId", selectedAddress.region_code || "");
      }
      if (discountAmount > 0) {
        data.append("voucherCode", voucherCode.trim());
      }

      const res = await processCustomCheckout(data, id, subtotal);

      if (res.error) {
        setError(res.error);
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (res.success && res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses pesanan.");
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--c-bg)" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--c-gold)" }} size={32} />
      </div>
    );
  }

  if (!request) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--c-bg)" }}>
        <PageHeader />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <h2 style={{ fontSize: "1.5rem", color: "var(--c-ink)", marginBottom: 12 }}>Pesanan Custom Tidak Ditemukan</h2>
          <Link href="/refill" className="btn btn-primary" style={{ padding: "10px 24px" }}>
            Kembali ke Refill
          </Link>
        </div>
      </div>
    );
  }

  const bibitsList = recipe?.bibits || [];
  const bottleObj = recipe?.bottle || null;
  const ratioStr = recipe?.ratio || "50/50";
  const modeStr = recipe?.mode || "ai";
  const isOwnBottle = recipe?.own_bottle === true;

  return (
    <div className="customer-page" style={{ background: "var(--c-bg)", minHeight: "100vh" }}>
      <PageHeader />

      <div style={{ width: "min(1200px, calc(100% - 32px))", margin: "0 auto", padding: "100px 0 80px" }}>
        
        {/* BREADCRUMB */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.8rem", color: "var(--c-ink-dim)", marginBottom: 32 }}>
          <Link href="/refill" style={{ color: "var(--c-ink-dim)" }}>Refill</Link>
          <ChevronRight size={12} />
          <span style={{ color: "var(--c-gold)" }}>Checkout Custom</span>
        </div>

        {/* PAGE TITLE */}
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 3vw, 2.2rem)", fontWeight: 400, color: "var(--c-ink)", marginBottom: 32 }}>
          Selesaikan Pesanan Custom Refill
        </h1>

        {error && (
          <div style={{ background: "rgba(225, 29, 72, 0.1)", color: "var(--c-rose)", padding: "16px", borderRadius: "var(--r-md)", marginBottom: "24px", fontSize: "0.9rem", border: "1px solid rgba(225, 29, 72, 0.2)" }}>
            {error}
          </div>
        )}

        <div className="checkout-grid">
          
          {/* LEFT: FORM */}
          <form onSubmit={handleSubmit} className="checkout-form-col">
            
            {/* ALAMAT & PENGIRIMAN (hanya jika BUKAN bawa botol sendiri) */}
            {isOwnBottle ? (
              /* OWN BOTTLE: PICKUP ONLY */
              <div className="co-alamat" style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", margin: 0, marginBottom: 20 }}>
                  <Store size={18} style={{ color: "#a855f7" }} />
                  Ambil di Toko
                </h2>
                <div style={{ padding: 20, background: "rgba(168, 85, 247, 0.06)", borderRadius: "var(--r-md)", border: "1px solid rgba(168, 85, 247, 0.15)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(168, 85, 247, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7", flexShrink: 0 }}>
                      <Wine size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--c-ink)", fontSize: "1rem" }}>Bawa Botol Sendiri</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>Botol {bottleObj?.capacity_ml || 0}ml</div>
                    </div>
                  </div>
                  <div style={{ height: 1, background: "var(--c-border)", margin: "12px 0" }} />
                  <div style={{ fontSize: "0.88rem", color: "var(--c-ink)", lineHeight: 1.6 }}>
                    <strong>Toko Ela Parfum</strong><br />
                    Silakan bawa botol parfum Anda langsung ke toko untuk diisi ulang. Pengiriman tidak tersedia untuk opsi ini.
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "10px 14px", background: "var(--c-surface-1)", borderRadius: "var(--r-sm)" }}>
                    <span style={{ fontSize: "0.88rem", color: "var(--c-ink)" }}>Ongkos Kirim</span>
                    <span style={{ fontWeight: 600, color: "var(--c-green)" }}>Gratis</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* ALAMAT PENGIRIMAN */}
            <div className="co-alamat" style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", margin: 0 }}>
                      <MapPin size={18} style={{ color: "var(--c-gold)" }} />
                      Alamat Pengiriman
                    </h2>
                    {addresses.length > 1 && !showAddressSelector && (
                      <button type="button" onClick={() => setShowAddressSelector(true)} style={{ background: "transparent", border: "none", color: "var(--c-gold)", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                        Pilih Alamat Lain
                      </button>
                    )}
                  </div>

                  {showAddressSelector ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectAddress(addr)}
                          style={{
                            padding: "16px",
                            border: selectedAddress?.id === addr.id ? "1px solid var(--c-gold)" : "1px solid var(--c-border)",
                            borderRadius: "var(--r-md)",
                            cursor: "pointer",
                            background: selectedAddress?.id === addr.id ? "var(--c-gold-dim)" : "transparent",
                            transition: "all 0.2s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--c-ink)" }}>{addr.label}</span>
                            {addr.is_default && <span style={{ fontSize: "0.7rem", padding: "2px 6px", background: "var(--c-gold)", color: "#fff", borderRadius: "4px" }}>Utama</span>}
                          </div>
                          <div style={{ fontSize: "0.9rem", color: "var(--c-ink)" }}>{addr.recipient_name} | {addr.phone}</div>
                          <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", marginTop: 4 }}>{addr.full_address}</div>
                        </div>
                      ))}
                      <button type="button" onClick={() => setShowAddressSelector(false)} style={{ background: "var(--c-border)", border: "none", padding: "12px", borderRadius: "var(--r-md)", color: "var(--c-ink)", cursor: "pointer", marginTop: 8 }}>
                        Batal Pilih
                      </button>
                    </div>
                  ) : selectedAddress ? (
                    <div style={{ padding: "16px", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--c-ink)" }}>{selectedAddress.label}</span>
                        {selectedAddress.is_default && <span style={{ fontSize: "0.7rem", padding: "2px 6px", background: "var(--c-gold)", color: "#fff", borderRadius: "4px" }}>Utama</span>}
                      </div>
                      <div style={{ fontSize: "0.95rem", color: "var(--c-ink)", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{selectedAddress.recipient_name}</span> <span style={{ color: "var(--c-ink-dim)" }}>| {selectedAddress.phone}</span>
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "var(--c-ink-dim)", lineHeight: 1.5 }}>
                        {selectedAddress.full_address}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "24px", textAlign: "center", background: "var(--glass-bg)", border: "1px dashed var(--c-border)", borderRadius: "var(--r-md)" }}>
                      <p style={{ color: "var(--c-ink-dim)", fontSize: "0.9rem", marginBottom: 16 }}>Belum ada alamat pengiriman tersimpan.</p>
                      <Link href="/profil/alamat/tambah" className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem", display: "inline-block" }}>
                        + Tambah Alamat Baru
                      </Link>
                    </div>
                  )}
                </div>

                {/* OPSI PENGIRIMAN */}
                <div className="co-opsi" style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
                  <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20, margin: 0 }}>
                    <Truck size={18} style={{ color: "var(--c-gold)" }} />
                    Opsi Pengiriman
                  </h2>
                  {loadingRates ? (
                    <div style={{ fontSize: "0.9rem", color: "var(--c-ink-dim)", display: "flex", alignItems: "center", gap: "8px", marginTop: 16 }}>
                      <Loader2 className="animate-spin" size={16} /> Memuat ongkos kirim...
                    </div>
                  ) : !selectedAddress ? (
                    <div style={{ fontSize: "0.9rem", color: "var(--c-ink-dim)", marginTop: 16 }}>
                      Silakan pilih alamat pengiriman terlebih dahulu.
                    </div>
                  ) : rates.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: 16 }}>
                      {rates.map((rate, idx) => (
                        <label key={`${rate.courier_service_code}-${rate.price}-${idx}`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", cursor: "pointer", background: selectedCourier?.courier_service_code === rate.courier_service_code && selectedCourier?.price === rate.price ? "var(--glass-bg)" : "transparent" }}>
                          <input
                            type="radio"
                            name="courier"
                            value={rate.courier_service_code}
                            checked={selectedCourier?.courier_service_code === rate.courier_service_code && selectedCourier?.price === rate.price}
                            onChange={() => {
                              setSelectedCourier(rate);
                              setShippingCost(rate.price);
                              setDiscountAmount(0);
                              setVoucherCode("");
                              setVoucherSuccess("");
                              if (rate.courier_service_code !== "pickup") {
                                setPaymentMethod("QRIS");
                              }
                            }}
                            style={{ accentColor: "var(--c-gold)" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: "var(--c-ink)" }}>{rate.courier_name} - {rate.courier_service_name}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>Estimasi: {rate.duration}</div>
                          </div>
                          <div style={{ fontWeight: 600, color: "var(--c-gold)" }}>{formatRupiah(rate.price)}</div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.9rem", color: "var(--c-ink-dim)", marginTop: 16 }}>
                      Kurir tidak tersedia untuk alamat ini. Pastikan titik lokasi akurat.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* METODE PEMBAYARAN */}
            <div className="co-metode" style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20, margin: 0 }}>
                <CreditCard size={18} style={{ color: "var(--c-gold)" }} />
                Metode Pembayaran
              </h2>

              <div style={{ marginTop: 16 }}>
                {(isOwnBottle || selectedCourier?.courier_service_code === "pickup") ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 16, border: paymentMethod === "QRIS" ? "1px solid var(--c-gold)" : "1px solid var(--c-border)", borderRadius: "var(--r-md)", background: paymentMethod === "QRIS" ? "var(--glass-bg)" : "transparent", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="QRIS"
                        checked={paymentMethod === "QRIS"}
                        onChange={() => setPaymentMethod("QRIS")}
                        style={{ accentColor: "var(--c-gold)", marginTop: 4 }}
                      />
                      <div style={{ width: 34, height: 34, borderRadius: "var(--r-sm)", background: "var(--c-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-gold)", flexShrink: 0 }}>
                        <QrCode size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "var(--c-ink)", marginBottom: 4 }}>QRIS (Otomatis)</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>
                          Bayar praktis menggunakan QRIS, proses otomatis via Mayar.
                        </div>
                      </div>
                    </label>

                    <label style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 16, border: paymentMethod === "TUNAI" ? "1px solid var(--c-gold)" : "1px solid var(--c-border)", borderRadius: "var(--r-md)", background: paymentMethod === "TUNAI" ? "var(--glass-bg)" : "transparent", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="TUNAI"
                        checked={paymentMethod === "TUNAI"}
                        onChange={() => setPaymentMethod("TUNAI")}
                        style={{ accentColor: "var(--c-gold)", marginTop: 4 }}
                      />
                      <div style={{ width: 34, height: 34, borderRadius: "var(--r-sm)", background: "var(--c-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-gold)", flexShrink: 0 }}>
                        <Landmark size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "var(--c-ink)", marginBottom: 4 }}>Bayar Tunai di Toko</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>
                          Bayar langsung ke kasir saat mengambil racikan custom.
                        </div>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 16, border: "1px solid var(--c-gold)", borderRadius: "var(--r-md)", background: "var(--glass-bg)", cursor: "default" }}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="QRIS"
                        checked={true}
                        readOnly
                        style={{ accentColor: "var(--c-gold)", marginTop: 4 }}
                      />
                      <div style={{ width: 34, height: 34, borderRadius: "var(--r-sm)", background: "var(--c-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-gold)", flexShrink: 0 }}>
                        <QrCode size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "var(--c-ink)", marginBottom: 4 }}>QRIS (Mayar)</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>
                          Pembayaran otomatis menggunakan QRIS (Dikenakan biaya layanan 1%).
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={submitting || (!isOwnBottle && (!selectedCourier || !selectedAddress)) || !paymentMethod}
              className="btn btn-primary co-button"
              style={{
                padding: "16px",
                justifyContent: "center",
                fontSize: "1rem",
                opacity: ((!isOwnBottle && (!selectedCourier || !selectedAddress)) || !paymentMethod || submitting) ? 0.6 : 1,
              }}
            >
              {submitting ? (
                <><Loader2 className="animate-spin" size={18} /> Memproses...</>
              ) : (
                <><Lock size={16} /> Bayar Sekarang</>
              )}
            </button>
          </form>

          {/* RIGHT: SUMMARY SIDEBAR */}
          <div className="co-ringkasan" style={{ position: "sticky", top: 100 }}>
            <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: 24 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 400, color: "var(--c-ink)", marginBottom: 16, marginTop: 0 }}>
                Ringkasan Belanja Custom
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {bibitsList.map((b: any, i: number) => {
                  const ratioPercent = ratioStr === "100/0" ? 1.0 : ratioStr === "70/30" ? 0.7 : ratioStr === "50/50" ? 0.5 : 0.3;
                  const vol = (bottleObj?.capacity_ml || 0) * ratioPercent / (bibitsList.length || 1);
                  const cost = vol * (b.price_per_ml || 0);
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <div style={{ color: "var(--c-ink)", maxWidth: "70%" }}>
                        Bibit: {b.name} <span style={{ color: "var(--c-ink-dim)" }}>({vol.toFixed(1)}ml)</span>
                      </div>
                      <span style={{ color: "var(--c-ink)", fontWeight: 500 }}>{formatRupiah(cost)}</span>
                    </div>
                  );
                })}
                
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <div style={{ color: "var(--c-ink)", maxWidth: "70%" }}>
                    {ratioStr === "100/0" ? (
                      <>Pelarut: <span style={{ color: "var(--c-ink-dim)" }}>Tidak Menggunakan Pelarut</span></>
                    ) : (
                      <>Pelarut: Absolute <span style={{ color: "var(--c-ink-dim)" }}>{bottleObj?.capacity_ml ? `(${((bottleObj.capacity_ml) * (ratioStr === "30/70" ? 0.7 : ratioStr === "50/50" ? 0.5 : 0.3)).toFixed(1)}ml)` : ''}</span></>
                    )}
                  </div>
                  <span style={{ color: "var(--c-green)", fontWeight: 500, fontSize: "0.8rem" }}>Gratis</span>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <div style={{ color: "var(--c-ink)", maxWidth: "70%" }}>
                    {isOwnBottle 
                      ? <>Botol Sendiri <span style={{ color: "var(--c-ink-dim)" }}>({bottleObj?.capacity_ml || 0}ml)</span></>
                      : <>Botol: {bottleObj?.name || 'Botol'} <span style={{ color: "var(--c-ink-dim)" }}>{bottleObj?.capacity_ml ? `(${bottleObj.capacity_ml}ml)` : ''}</span></>
                    }
                  </div>
                  <span style={{ color: isOwnBottle ? "var(--c-green)" : "var(--c-ink)", fontWeight: 500, fontSize: isOwnBottle ? "0.8rem" : "0.85rem" }}>
                    {isOwnBottle ? "Gratis" : formatRupiah(bottleObj?.price || 0)}
                  </span>
                </div>
              </div>

              {/* VOUCHER SECTION */}
              <div style={{ background: "var(--glass-bg)", padding: 16, borderRadius: "var(--r-md)", marginBottom: 20 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 8 }}>Punya Kode Voucher?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input-field"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode"
                    style={{ textTransform: "uppercase", padding: "8px 12px" }}
                    disabled={validatingVoucher}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleApplyVoucher}
                    disabled={validatingVoucher || !voucherCode}
                    style={{ padding: "8px 16px" }}
                  >
                    {validatingVoucher ? <Loader2 className="animate-spin" size={16} /> : "Terapkan"}
                  </button>
                </div>
                {voucherError && <div style={{ color: "var(--c-rose)", fontSize: "0.75rem", marginTop: 8 }}>{voucherError}</div>}
                {voucherSuccess && <div style={{ color: "var(--c-gold)", fontSize: "0.75rem", marginTop: 8 }}>{voucherSuccess}</div>}
              </div>

              <div style={{ height: 1, background: "var(--c-border)", marginBottom: 16 }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--c-ink-muted)" }}>Subtotal</span>
                  <span style={{ color: "var(--c-ink)" }}>{formatRupiah(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--c-ink-muted)" }}>Ongkos Kirim</span>
                  <span style={{ color: "var(--c-ink)", fontSize: "0.88rem" }}>{shippingCost > 0 ? formatRupiah(shippingCost) : "-"}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "var(--c-gold)" }}>
                    <span style={{ fontWeight: 500 }}>Diskon Voucher</span>
                    <span style={{ fontWeight: 600 }}>-{formatRupiah(discountAmount)}</span>
                  </div>
                )}
                {selectedCourier?.courier_service_code !== 'pickup' && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                    <span style={{ color: "var(--c-ink-muted)" }}>Biaya Layanan (1%)</span>
                    <span style={{ color: "var(--c-ink)" }}>{formatRupiah(Math.floor((subtotal + shippingCost - discountAmount) * 0.01))}</span>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: "var(--c-border)", marginBottom: 16 }} />

              {/* TOTAL */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--c-ink)" }}>Total Pembayaran</span>
                <span style={{ fontWeight: 700, fontSize: "1.35rem", color: "var(--c-gold)" }}>
                  {formatRupiah(
                    Math.max(0, subtotal + shippingCost - discountAmount) +
                      (selectedCourier?.courier_service_code !== "pickup" ? Math.floor((subtotal + shippingCost - discountAmount) * 0.01) : 0)
                  )}
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
