"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Lock, MapPin, CreditCard, Loader2, Truck, CheckCircle2, Landmark, QrCode } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";
import { useCart } from "@/lib/cart-context";
import { formatRupiah } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { processCheckout, validateVoucher } from "./actions";

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const { cart, subtotal, clearCart } = useCart();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    setDiscountAmount(0); // Reset discount on location change (if free shipping is based on shippingCost)
    setVoucherSuccess("");
    setVoucherError("");
    
    try {
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_area_id: destinationId })
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
      console.error('Error fetching rates', err);
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/checkout");
        return;
      }
      
      const { data: addrs } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (addrs && addrs.length > 0) {
        setAddresses(addrs);
        const defaultAddr = addrs[0];
        setSelectedAddress(defaultAddr);
        fetchRates(defaultAddr.region_code);
      }

      setLoading(false);
    }
    
    checkUser();
  }, [router, supabase]);

  useEffect(() => {
    if (!loading && !submitting && cart.items.length === 0) {
      router.push("/keranjang");
    }
  }, [loading, submitting, cart, router]);

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
    if (!selectedAddress) {
      setError("Silakan tambahkan alamat pengiriman terlebih dahulu.");
      return;
    }
    if (!selectedCourier) {
      setError("Silakan pilih opsi pengiriman terlebih dahulu.");
      return;
    }
    if (!paymentMethod) {
      setError("Silakan pilih metode pembayaran terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const data = new FormData();
      data.append('fullName', selectedAddress.recipient_name);
      data.append('phone', selectedAddress.phone);
      data.append('address', selectedAddress.full_address);
      data.append('shippingCost', shippingCost.toString());
      data.append('courierInfo', `${selectedCourier.courier_name} - ${selectedCourier.courier_service_name}`);
      data.append('paymentMethod', paymentMethod);
      data.append('originAreaId', selectedCourier.origin_area_id || "");
      data.append('originName', selectedCourier.origin_name || "");
      data.append('destinationAreaId', selectedAddress.region_code || "");
      if (discountAmount > 0) {
        data.append('voucherCode', voucherCode.trim());
      }

      const res = await processCheckout(data, cart, subtotal);
      
      if (res.error) {
        setError(res.error);
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (res.success && res.url) {
        clearCart();
        window.location.href = res.url;
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses pesanan.");
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading || cart.items.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--c-gold)" }} size={32} />
      </div>
    );
  }

  return (
    <div className="customer-page">
      <PageHeader />

      <div style={{ width: "min(1200px, calc(100% - 32px))", margin: "0 auto", padding: "100px 0 80px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.8rem", color: "var(--c-ink-dim)", marginBottom: 32 }}>
          <Link href="/keranjang" style={{ color: "var(--c-ink-dim)" }}>Keranjang</Link>
          <ChevronRight size={12} />
          <span style={{ color: "var(--c-gold)" }}>Checkout</span>
        </div>

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 3vw, 2.2rem)", fontWeight: 400, color: "var(--c-ink)", marginBottom: 32 }}>
          Selesaikan Pesanan
        </h1>

        {error && (
          <div style={{ background: "rgba(225, 29, 72, 0.1)", color: "var(--c-rose)", padding: "16px", borderRadius: "var(--r-md)", marginBottom: "24px", fontSize: "0.9rem", border: "1px solid rgba(225, 29, 72, 0.2)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* ALAMAT PENGIRIMAN */}
            <div style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)" }}>
                  <MapPin size={18} style={{ color: "var(--c-gold)" }} />
                  Alamat Pengiriman
                </h2>
                {addresses.length > 1 && !showAddressSelector && (
                  <button type="button" onClick={() => setShowAddressSelector(true)} style={{ background: 'transparent', border: 'none', color: 'var(--c-gold)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                    Pilih Alamat Lain
                  </button>
                )}
              </div>
              
              {showAddressSelector ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {addresses.map((addr) => (
                    <div 
                      key={addr.id} 
                      onClick={() => handleSelectAddress(addr)}
                      style={{ padding: '16px', border: selectedAddress?.id === addr.id ? '1px solid var(--c-gold)' : '1px solid var(--c-border)', borderRadius: 'var(--r-md)', cursor: 'pointer', background: selectedAddress?.id === addr.id ? 'var(--c-gold-dim)' : 'transparent', transition: 'all 0.2s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--c-ink)' }}>{addr.label}</span>
                        {addr.is_default && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--c-gold)', color: '#fff', borderRadius: '4px' }}>Utama</span>}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--c-ink)' }}>{addr.recipient_name} | {addr.phone}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--c-ink-dim)', marginTop: 4 }}>{addr.full_address}</div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setShowAddressSelector(false)} style={{ background: 'var(--c-border)', border: 'none', padding: '12px', borderRadius: 'var(--r-md)', color: 'var(--c-ink)', cursor: 'pointer', marginTop: 8 }}>
                    Batal Pilih
                  </button>
                </div>
              ) : selectedAddress ? (
                <div style={{ padding: '16px', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', position: 'relative' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--c-ink)' }}>{selectedAddress.label}</span>
                    {selectedAddress.is_default && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--c-gold)', color: '#fff', borderRadius: '4px' }}>Utama</span>}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--c-ink)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{selectedAddress.recipient_name}</span> <span style={{ color: 'var(--c-ink-dim)' }}>| {selectedAddress.phone}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--c-ink-dim)', lineHeight: 1.5 }}>
                    {selectedAddress.full_address}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--glass-bg)', border: '1px dashed var(--c-border)', borderRadius: 'var(--r-md)' }}>
                  <p style={{ color: 'var(--c-ink-dim)', fontSize: '0.9rem', marginBottom: 16 }}>Belum ada alamat pengiriman tersimpan.</p>
                  <Link href="/profil/alamat/tambah" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'inline-block' }}>
                    + Tambah Alamat Baru
                  </Link>
                </div>
              )}
            </div>

            {/* OPSI PENGIRIMAN */}
            <div style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
               <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20 }}>
                <Truck size={18} style={{ color: "var(--c-gold)" }} />
                Opsi Pengiriman
              </h2>
              {loadingRates ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--c-ink-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 className="animate-spin" size={16} /> Memuat ongkos kirim...
                </div>
              ) : !selectedAddress ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--c-ink-dim)' }}>
                   Silakan pilih alamat pengiriman terlebih dahulu.
                </div>
              ) : rates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {rates.map((rate, idx) => (
                    <label key={`${rate.courier_service_code}-${rate.price}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', cursor: 'pointer', background: selectedCourier?.courier_service_code === rate.courier_service_code && selectedCourier?.price === rate.price ? 'var(--glass-bg)' : 'transparent' }}>
                      <input 
                        type="radio" 
                        name="courier" 
                        value={rate.courier_service_code}
                        checked={selectedCourier?.courier_service_code === rate.courier_service_code && selectedCourier?.price === rate.price}
                        onChange={() => {
                          setSelectedCourier(rate);
                          setShippingCost(rate.price);
                          setDiscountAmount(0); // reset discount on shipping change
                          setVoucherCode("");
                          setVoucherSuccess("");
                          if (rate.courier_service_code !== "pickup") {
                            setPaymentMethod("QRIS");
                          }
                        }}
                        style={{ accentColor: 'var(--c-gold)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{rate.courier_name} - {rate.courier_service_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--c-ink-dim)' }}>Estimasi: {rate.duration}</div>
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--c-gold)' }}>{formatRupiah(rate.price)}</div>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.9rem', color: 'var(--c-ink-dim)' }}>
                   Kurir tidak tersedia untuk alamat ini. Pastikan titik lokasi akurat.
                </div>
              )}
            </div>

            <div style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
               <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20 }}>
                <CreditCard size={18} style={{ color: "var(--c-gold)" }} />
                Metode Pembayaran
              </h2>
              {selectedCourier?.courier_service_code === 'pickup' ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* QRIS Option */}
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
                  {/* Tunai Option */}
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
                        Bayar langsung ke kasir saat mengambil pesanan.
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
            
            <button type="submit" disabled={submitting || !selectedCourier || !selectedAddress || !paymentMethod} className="btn btn-primary" style={{ padding: "16px", justifyContent: "center", fontSize: "1rem", opacity: (!selectedCourier || !selectedAddress || !paymentMethod || submitting) ? 0.6 : 1 }}>
              {submitting ? (
                <><Loader2 className="animate-spin" size={18} /> Memproses...</>
              ) : (
                <><Lock size={16} /> Bayar Sekarang</>
              )}
            </button>
          </form>

          {/* Right: Summary */}
          <div style={{ position: "sticky", top: 100 }}>
            <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: 24 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 400, color: "var(--c-ink)", marginBottom: 20 }}>
                Ringkasan Belanja
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {cart.items.map((item) => (
                  <div key={item.sizeId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <div style={{ color: "var(--c-ink)", maxWidth: "70%" }}>
                      <span style={{ fontWeight: 600 }}>{item.quantity}x</span> {item.perfumeName} <span style={{ color: "var(--c-ink-dim)" }}>({item.sizeLabel})</span>
                    </div>
                    <span style={{ color: "var(--c-ink)", fontWeight: 500 }}>{formatRupiah(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Voucher Section */}
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

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--c-ink)" }}>Total Pembayaran</span>
                <span style={{ fontWeight: 700, fontSize: "1.3rem", color: "var(--c-gold)" }}>
                  {formatRupiah(
                    Math.max(0, subtotal + shippingCost - discountAmount) + 
                    (selectedCourier?.courier_service_code !== 'pickup' ? Math.floor((subtotal + shippingCost - discountAmount) * 0.01) : 0)
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
