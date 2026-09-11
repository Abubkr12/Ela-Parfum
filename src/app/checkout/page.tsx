"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ChevronRight, 
  Lock, 
  MapPin, 
  CreditCard, 
  Loader2, 
  Truck, 
  CheckCircle2, 
  Landmark, 
  QrCode, 
  Store, 
  Sparkles, 
  AlertCircle, 
  Navigation 
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useCart } from "@/lib/cart-context";
import { formatRupiah } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { processCheckout, validateVoucher } from "./actions";
import { ELA_STORES } from "@/lib/stores";

interface StoreOption {
  storeId: number;
  name: string;
  shortName: string;
  address: string;
  areaId: string;
  distanceMeters: number;
  distanceText: string;
  durationText: string;
  isRoadNetwork: boolean;
  isNearest: boolean;
  isAvailable: boolean;
  outOfStockItems: string[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const { cart, subtotal, clearCart } = useCart();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fulfillment Type: 'delivery' (Kurir) atau 'pickup' (Ambil di Toko)
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">("delivery");

  // Alamat Pengiriman Customer
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);

  // Toko Cabang & Jarak
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [isRealtimeGps, setIsRealtimeGps] = useState(false);

  // Kurir Biteship (Untuk Delivery)
  const [rates, setRates] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);
  const [shippingCost, setShippingCost] = useState(0);

  // Metode Pembayaran
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "TUNAI">("QRIS");

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucherError, setVoucherError] = useState("");
  const [voucherSuccess, setVoucherSuccess] = useState("");
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  // Fetch Biteship Rates untuk Toko Terpilih
  const fetchRates = useCallback(async (destinationId: string, lat?: string, lng?: string, originStoreId?: number) => {
    setLoadingRates(true);
    setRates([]);
    setSelectedCourier(null);
    setShippingCost(0);
    setDiscountAmount(0);
    setVoucherSuccess("");
    setVoucherError("");
    
    try {
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          destination_area_id: destinationId,
          destination_latitude: lat,
          destination_longitude: lng,
          origin_store_id: originStoreId || 2
        })
      });
      const data = await res.json();
      if (data && data.pricing) {
        // Filter keluar opsi pickup bawaan karena sudah dikelola lewat tab Ambil di Toko
        const deliveryOnly = data.pricing.filter((p: any) => p.courier_service_code !== 'pickup');
        setRates(deliveryOnly);
        if (deliveryOnly.length > 0) {
          setSelectedCourier(deliveryOnly[0]);
          setShippingCost(deliveryOnly[0].price);
        }
      }
    } catch (err) {
      console.error('Error fetching rates', err);
    } finally {
      setLoadingRates(false);
    }
  }, []);

  // Evaluasi Jarak Toko (OSRM Jaringan Jalan) & Ketersediaan Stok
  const evaluateStores = useCallback(async (lat: number, lng: number, isGps = false, autoFetchRatesForDest = "") => {
    setLoadingStores(true);
    try {
      // 1. Ambil jarak jaringan jalan raya OSRM
      const distRes = await fetch("/api/stores/distances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      });
      const distData = await distRes.json();

      // 2. Ambil ketersediaan stok produk per cabang
      const cartItemsPayload = cart.items.map((it) => ({
        sizeId: it.sizeId,
        quantity: it.quantity,
        name: it.perfumeName
      }));

      const stockRes = await fetch("/api/stores/check-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "regular", items: cartItemsPayload })
      });
      const stockData = await stockRes.json();

      // 3. Gabungkan hasil jarak dan stok
      const combined: StoreOption[] = (distData.stores || []).map((st: any) => {
        const stockMatch = (stockData.stores || []).find((s: any) => s.storeId === st.storeId);
        return {
          ...st,
          isAvailable: stockMatch?.isAvailable ?? true,
          outOfStockItems: stockMatch?.outOfStockItems ?? []
        };
      });

      setStoreOptions(combined);
      setIsRealtimeGps(isGps);

      // Pilih toko terdekat yang memiliki stok tersedia
      const bestAvailableStore = combined.find((s) => s.isAvailable) || combined[0];
      if (bestAvailableStore) {
        setSelectedStore(bestAvailableStore);
        if (autoFetchRatesForDest) {
          fetchRates(autoFetchRatesForDest, lat.toString(), lng.toString(), bestAvailableStore.storeId);
        }
      }
    } catch (err) {
      console.error("Error evaluating stores:", err);
    } finally {
      setLoadingStores(false);
    }
  }, [cart.items, fetchRates]);

  // Auth & Alamat Init
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

        const lat = defaultAddr.maps_latitude || -6.2088;
        const lng = defaultAddr.maps_longitude || 106.8456;
        evaluateStores(lat, lng, false, defaultAddr.region_code);
      } else {
        // Fallback default Jakarta jika belum ada alamat
        evaluateStores(-6.2088, 106.8456, false);
      }

      setLoading(false);
    }
    
    checkUser();
  }, [router, supabase, evaluateStores]);

  useEffect(() => {
    if (!loading && !submitting && cart.items.length === 0) {
      router.push("/keranjang");
    }
  }, [loading, submitting, cart, router]);

  // Handle Switch Mode Pengiriman
  const handleFulfillmentChange = (type: "delivery" | "pickup") => {
    setFulfillmentType(type);
    setError("");

    if (type === "pickup") {
      // Ambil di Toko -> Coba dapatkan GPS Real-time Customer
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            evaluateStores(lat, lng, true);
          },
          () => {
            // Jika user tolak akses GPS, gunakan koordinat alamat tersimpan
            if (selectedAddress?.maps_latitude && selectedAddress?.maps_longitude) {
              evaluateStores(selectedAddress.maps_latitude, selectedAddress.maps_longitude, false);
            }
          },
          { timeout: 5000 }
        );
      }
      setShippingCost(0);
      setSelectedCourier({
        courier_name: "Toko Ela Parfum",
        courier_service_name: "Ambil di Toko",
        courier_service_code: "pickup",
        price: 0
      });
    } else {
      // Mode Kurir -> Gunakan koordinat Alamat Penerima
      if (selectedAddress) {
        evaluateStores(
          selectedAddress.maps_latitude || -6.2088,
          selectedAddress.maps_longitude || 106.8456,
          false,
          selectedAddress.region_code
        );
      }
      setPaymentMethod("QRIS");
    }
  };

  const handleSelectAddress = (addr: any) => {
    setSelectedAddress(addr);
    setShowAddressSelector(false);
    evaluateStores(
      addr.maps_latitude || -6.2088,
      addr.maps_longitude || 106.8456,
      false,
      addr.region_code
    );
  };

  // Pilih Toko Pengirim (Kurir) atau Toko Pengambilan (Pickup)
  const handleSelectStore = (store: StoreOption) => {
    if (!store.isAvailable) return;
    setSelectedStore(store);

    if (fulfillmentType === "delivery" && selectedAddress) {
      fetchRates(
        selectedAddress.region_code,
        selectedAddress.maps_latitude?.toString(),
        selectedAddress.maps_longitude?.toString(),
        store.storeId
      );
    }
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
    if (!selectedStore) {
      setError("Silakan pilih cabang toko terlebih dahulu.");
      return;
    }
    if (!selectedStore.isAvailable) {
      setError("Cabang yang Anda pilih memiliki stok yang tidak mencukupi.");
      return;
    }
    if (fulfillmentType === "delivery" && !selectedAddress) {
      setError("Silakan tambahkan alamat pengiriman terlebih dahulu.");
      return;
    }
    if (fulfillmentType === "delivery" && !selectedCourier) {
      setError("Silakan pilih opsi kurir pengiriman terlebih dahulu.");
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
      data.append('storeId', selectedStore.storeId.toString());
      data.append('fulfillmentType', fulfillmentType);

      if (fulfillmentType === 'pickup') {
        data.append('fullName', selectedAddress?.recipient_name || 'Pelanggan');
        data.append('phone', selectedAddress?.phone || '');
        data.append('address', `[Ambil di Toko: ${selectedStore.name}] ${selectedStore.address}`);
        data.append('shippingCost', '0');
        data.append('courierInfo', `Ambil di Tempat (${selectedStore.shortName})`);
        data.append('courierCompany', 'toko');
        data.append('courierServiceCode', 'pickup');
        data.append('originName', selectedStore.shortName);
        data.append('originAreaId', selectedStore.areaId || 'pickup');
      } else {
        data.append('fullName', selectedAddress.recipient_name);
        data.append('phone', selectedAddress.phone);
        data.append('address', selectedAddress.full_address);
        data.append('shippingCost', shippingCost.toString());
        data.append('courierInfo', `${selectedCourier.courier_name} - ${selectedCourier.courier_service_name}`);
        data.append('courierCompany', selectedCourier.courier_code || selectedCourier.company || selectedCourier.courier_name || '');
        data.append('courierServiceCode', selectedCourier.courier_service_code || selectedCourier.type || '');
        data.append('originName', selectedStore.shortName);
        data.append('originAreaId', selectedStore.areaId || '');
        data.append('destinationAreaId', selectedAddress.region_code || '');
        data.append('destinationLatitude', selectedAddress.maps_latitude ? selectedAddress.maps_latitude.toString() : '');
        data.append('destinationLongitude', selectedAddress.maps_longitude ? selectedAddress.maps_longitude.toString() : '');
      }

      data.append('paymentMethod', paymentMethod);

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
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.8rem", color: "var(--c-ink-dim)", marginBottom: 24 }}>
          <Link href="/keranjang" style={{ color: "var(--c-ink-dim)" }}>Keranjang</Link>
          <ChevronRight size={12} />
          <span style={{ color: "var(--c-gold)" }}>Checkout</span>
        </div>

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 3vw, 2.2rem)", fontWeight: 400, color: "var(--c-ink)", marginBottom: 28 }}>
          Selesaikan Pesanan
        </h1>

        {error && (
          <div style={{ background: "rgba(225, 29, 72, 0.1)", color: "var(--c-rose)", padding: "16px", borderRadius: "var(--r-md)", marginBottom: "24px", fontSize: "0.9rem", border: "1px solid rgba(225, 29, 72, 0.2)" }}>
            {error}
          </div>
        )}

        {/* METODE PEMENUHAN (PILIH: KURIR vs AMBIL DI TOKO) */}
        <div style={{ background: "var(--c-surface-1)", padding: "6px", borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)", marginBottom: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => handleFulfillmentChange("delivery")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "14px",
              borderRadius: "var(--r-md)",
              border: "none",
              background: fulfillmentType === "delivery" ? "var(--c-surface-2)" : "transparent",
              color: fulfillmentType === "delivery" ? "var(--c-gold)" : "var(--c-ink-dim)",
              boxShadow: fulfillmentType === "delivery" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <Truck size={18} />
            Dikirim Kurir Ekspedisi
          </button>

          <button
            type="button"
            onClick={() => handleFulfillmentChange("pickup")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "14px",
              borderRadius: "var(--r-md)",
              border: "none",
              background: fulfillmentType === "pickup" ? "var(--c-surface-2)" : "transparent",
              color: fulfillmentType === "pickup" ? "var(--c-gold)" : "var(--c-ink-dim)",
              boxShadow: fulfillmentType === "pickup" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <Store size={18} />
            Ambil Langsung di Toko
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* JIKA KURIR: ALAMAT PENGIRIMAN */}
            {fulfillmentType === "delivery" && (
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
            )}

            {/* PILIHAN CABANG TOKO & JARAK REAL-TIME */}
            <div style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 4 }}>
                    <Store size={18} style={{ color: "var(--c-gold)" }} />
                    {fulfillmentType === "pickup" ? "Pilih Cabang Pengambilan" : "Pilih Cabang Pengirim"}
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--c-ink-dim)", margin: 0 }}>
                    {fulfillmentType === "pickup"
                      ? isRealtimeGps 
                        ? "📍 Jarak dihitung akurat dari koordinat GPS Anda saat ini via rute jalan raya."
                        : "📍 Jarak dihitung dari alamat utama Anda via rute jalan raya."
                      : "📍 Sistem merekomendasikan cabang dengan rute jalan raya terdekat dan stok mencukupi."}
                  </p>
                </div>

                {loadingStores && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--c-gold)" }}>
                    <Loader2 size={14} className="animate-spin" /> Menghitung rute...
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {storeOptions.map((st) => {
                  const isSelected = selectedStore?.storeId === st.storeId;
                  const isAvailable = st.isAvailable;

                  return (
                    <div
                      key={st.storeId}
                      onClick={() => handleSelectStore(st)}
                      style={{
                        padding: "16px",
                        borderRadius: "var(--r-md)",
                        border: isSelected ? "1.5px solid var(--c-gold)" : "1px solid var(--c-border)",
                        background: isSelected ? "var(--glass-bg)" : "transparent",
                        cursor: isAvailable ? "pointer" : "not-allowed",
                        opacity: isAvailable ? 1 : 0.6,
                        transition: "all 0.2s ease",
                        position: "relative"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <input 
                            type="radio"
                            name="selected_store"
                            checked={isSelected}
                            disabled={!isAvailable}
                            onChange={() => handleSelectStore(st)}
                            style={{ accentColor: "var(--c-gold)", marginTop: 4 }}
                          />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--c-ink)" }}>{st.name}</span>
                              {st.isNearest && isAvailable && (
                                <span style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(234, 179, 8, 0.15)", color: "var(--c-gold)", border: "1px solid rgba(234, 179, 8, 0.3)", borderRadius: 100, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <Sparkles size={11} /> {fulfillmentType === "pickup" ? "Terdekat dari Anda" : "Direkomendasikan (Terdekat)"}
                                </span>
                              )}
                              {!isAvailable && (
                                <span style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(225, 29, 72, 0.1)", color: "var(--c-rose)", borderRadius: 100, fontWeight: 600 }}>
                                  Stok Tidak Tersedia
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.82rem", color: "var(--c-ink-dim)", lineHeight: 1.4 }}>
                              {st.address}
                            </div>
                            {!isAvailable && st.outOfStockItems.length > 0 && (
                              <div style={{ marginTop: 6, fontSize: "0.78rem", color: "var(--c-rose)", display: "flex", alignItems: "center", gap: 6 }}>
                                <AlertCircle size={13} /> {st.outOfStockItems.join(", ")}
                              </div>
                            )}
                          </div>
                        </div>

                        {st.distanceText && (
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--c-gold)" }}>{st.distanceText}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)" }}>~{st.durationText}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* OPSI PENGIRIMAN KURIR (HANYA JIKA DELIVERY) */}
            {fulfillmentType === "delivery" && (
              <div style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20 }}>
                  <Truck size={18} style={{ color: "var(--c-gold)" }} />
                  Opsi Kurir Pengiriman
                </h2>

                {loadingRates ? (
                  <div style={{ fontSize: '0.9rem', color: 'var(--c-ink-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 className="animate-spin" size={16} /> Menghitung ongkir dari {selectedStore?.name || "Toko"}...
                  </div>
                ) : !selectedAddress ? (
                  <div style={{ fontSize: '0.9rem', color: 'var(--c-ink-dim)' }}>
                    Silakan pilih alamat pengiriman terlebih dahulu.
                  </div>
                ) : rates.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {rates.map((rate, idx) => (
                      <label key={`${rate.courier_service_code}-${rate.price}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: selectedCourier?.courier_service_code === rate.courier_service_code && selectedCourier?.price === rate.price ? '1px solid var(--c-gold)' : '1px solid var(--c-border)', borderRadius: 'var(--r-md)', cursor: 'pointer', background: selectedCourier?.courier_service_code === rate.courier_service_code && selectedCourier?.price === rate.price ? 'var(--glass-bg)' : 'transparent' }}>
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
                    Kurir ekspedisi tidak tersedia untuk rute ini.
                  </div>
                )}
              </div>
            )}

            {/* METODE PEMBAYARAN */}
            <div style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20 }}>
                <CreditCard size={18} style={{ color: "var(--c-gold)" }} />
                Metode Pembayaran
              </h2>

              {fulfillmentType === "pickup" ? (
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
                        Bayar praktis menggunakan QRIS, otomatis lunas via Mayar.
                      </div>
                    </div>
                  </label>

                  {/* Tunai di Kasir Option */}
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
                      <div style={{ fontWeight: 600, color: "var(--c-ink)", marginBottom: 4 }}>Bayar Tunai di Kasir Toko</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>
                        Bayar uang tunai langsung ke kasir cabang saat mengambil pesanan.
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
            
            <button 
              type="submit" 
              disabled={submitting || !selectedStore || !selectedStore.isAvailable || (fulfillmentType === 'delivery' && (!selectedCourier || !selectedAddress))} 
              className="btn btn-primary" 
              style={{ padding: "16px", justifyContent: "center", fontSize: "1rem", opacity: (submitting || !selectedStore || !selectedStore.isAvailable) ? 0.6 : 1 }}
            >
              {submitting ? (
                <><Loader2 className="animate-spin" size={18} /> Memproses...</>
              ) : (
                <><Lock size={16} /> {fulfillmentType === "pickup" && paymentMethod === "TUNAI" ? "Buat Pesanan & Bayar di Toko" : "Bayar Sekarang"}</>
              )}
            </button>
          </form>

          {/* Ringkasan Belanja */}
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
                {voucherError && <div style={{ color: "var(--c-rose)", fontSize: "0.75rem", marginTop: 6 }}>{voucherError}</div>}
                {voucherSuccess && <div style={{ color: "var(--c-teal)", fontSize: "0.75rem", marginTop: 6 }}>{voucherSuccess}</div>}
              </div>

              {/* Kalkulasi Biaya */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.9rem", color: "var(--c-ink-dim)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Subtotal</span>
                  <span style={{ color: "var(--c-ink)" }}>{formatRupiah(subtotal)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{fulfillmentType === "pickup" ? "Biaya Ambil di Toko" : "Ongkos Kirim"}</span>
                  <span style={{ color: "var(--c-ink)" }}>{fulfillmentType === "pickup" ? "GRATIS" : formatRupiah(shippingCost)}</span>
                </div>

                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--c-teal)" }}>
                    <span>Diskon Voucher</span>
                    <span>-{formatRupiah(discountAmount)}</span>
                  </div>
                )}

                {paymentMethod === "QRIS" && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--c-ink-dim)" }}>
                    <span>Biaya Layanan QRIS (1%)</span>
                    <span>{formatRupiah(Math.floor((subtotal + (fulfillmentType === "pickup" ? 0 : shippingCost) - discountAmount) * 0.01))}</span>
                  </div>
                )}

                <div style={{ height: 1, background: "var(--c-border)", margin: "8px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: 600, color: "var(--c-gold)" }}>
                  <span>Total Tagihan</span>
                  <span>
                    {formatRupiah(
                      subtotal + 
                      (fulfillmentType === "pickup" ? 0 : shippingCost) - 
                      discountAmount + 
                      (paymentMethod === "QRIS" ? Math.floor((subtotal + (fulfillmentType === "pickup" ? 0 : shippingCost) - discountAmount) * 0.01) : 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
