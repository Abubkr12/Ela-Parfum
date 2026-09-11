"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ChevronRight, 
  Lock, 
  MapPin, 
  CreditCard, 
  Loader2, 
  Truck, 
  Landmark, 
  QrCode, 
  Sparkles, 
  Beaker, 
  Wine, 
  Store,
  AlertCircle 
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";
import { formatRupiah } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { validateVoucher, processCustomCheckout } from "@/app/checkout/actions";

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

  // Fulfillment Type: 'delivery' | 'pickup'
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">("delivery");

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);

  // Store selection & distances
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [isRealtimeGps, setIsRealtimeGps] = useState(false);

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

  const isOwnBottle = recipe?.own_bottle === true;

  const fetchRates = useCallback(async (destinationId: string, lat?: string, lng?: string, originStoreId?: number) => {
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
        body: JSON.stringify({ 
          destination_area_id: destinationId,
          destination_latitude: lat,
          destination_longitude: lng,
          origin_store_id: originStoreId || 2
        }),
      });
      const data = await res.json();
      if (data && data.pricing) {
        const deliveryOnly = data.pricing.filter((p: any) => p.courier_service_code !== "pickup");
        setRates(deliveryOnly);
        if (deliveryOnly.length > 0) {
          setSelectedCourier(deliveryOnly[0]);
          setShippingCost(deliveryOnly[0].price);
        }
      }
    } catch (err) {
      console.error("Error fetching rates", err);
    } finally {
      setLoadingRates(false);
    }
  }, []);

  const evaluateStores = useCallback(async (lat: number, lng: number, isGps = false, autoFetchRatesForDest = "") => {
    setLoadingStores(true);
    try {
      const distRes = await fetch("/api/stores/distances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      });
      const distData = await distRes.json();

      const stockRes = await fetch("/api/stores/check-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "custom", customRequestId: id })
      });
      const stockData = await stockRes.json();

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

      const bestStore = combined.find((s) => s.isAvailable) || combined[0];
      if (bestStore) {
        setSelectedStore(bestStore);
        if (autoFetchRatesForDest) {
          fetchRates(autoFetchRatesForDest, lat.toString(), lng.toString(), bestStore.storeId);
        }
      }
    } catch (err) {
      console.error("Error evaluating custom stores:", err);
    } finally {
      setLoadingStores(false);
    }
  }, [id, fetchRates]);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push(`/login?redirect=/checkout/custom/${id}`);
          return;
        }

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

        // Jika bawa botol sendiri, otomatis paksa ke 'pickup'
        if (parsedRecipe?.own_bottle === true) {
          setFulfillmentType("pickup");
        }

        // Fetch Addresses
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

          const lat = defaultAddr.maps_latitude || -6.2088;
          const lng = defaultAddr.maps_longitude || 106.8456;
          evaluateStores(lat, lng, false, parsedRecipe?.own_bottle ? "" : defaultAddr.region_code);
        } else {
          evaluateStores(-6.2088, 106.8456, false);
        }
      } catch (err: any) {
        setError(err.message || "Gagal memuat data checkout.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router, supabase, evaluateStores]);

  const handleFulfillmentChange = (type: "delivery" | "pickup") => {
    if (isOwnBottle && type === "delivery") return;
    setFulfillmentType(type);
    setError("");

    if (type === "pickup") {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            evaluateStores(lat, lng, true);
          },
          () => {
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

  const handleSelectStore = (st: StoreOption) => {
    if (!st.isAvailable) return;
    setSelectedStore(st);

    if (fulfillmentType === "delivery" && selectedAddress) {
      fetchRates(
        selectedAddress.region_code,
        selectedAddress.maps_latitude?.toString(),
        selectedAddress.maps_longitude?.toString(),
        st.storeId
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
      setError("Cabang yang dipilih memiliki stok bibit/botol yang tidak mencukupi.");
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
      data.append("storeId", selectedStore.storeId.toString());
      data.append("fulfillmentType", fulfillmentType);

      if (fulfillmentType === "pickup") {
        data.append("fullName", request.customer_name || selectedAddress?.recipient_name || "Pelanggan Ela");
        data.append("phone", request.customer_whatsapp || selectedAddress?.phone || "");
        data.append("address", `[Ambil di Toko: ${selectedStore.name}] ${selectedStore.address}`);
        data.append("shippingCost", "0");
        data.append("courierInfo", `Ambil di Tempat (${selectedStore.shortName})${isOwnBottle ? " - Bawa Botol Sendiri" : ""}`);
        data.append("courierCompany", "toko");
        data.append("courierServiceCode", "pickup");
        data.append("originName", selectedStore.shortName);
        data.append("originAreaId", selectedStore.areaId || "pickup");
      } else {
        data.append("fullName", selectedAddress.recipient_name);
        data.append("phone", selectedAddress.phone);
        data.append("address", selectedAddress.full_address);
        data.append("shippingCost", shippingCost.toString());
        data.append("courierInfo", `${selectedCourier.courier_name} - ${selectedCourier.courier_service_name}`);
        data.append("courierCompany", selectedCourier.courier_code || selectedCourier.company || selectedCourier.courier_name || "");
        data.append("courierServiceCode", selectedCourier.courier_service_code || selectedCourier.type || "");
        data.append("originName", selectedStore.shortName);
        data.append("originAreaId", selectedStore.areaId || "");
        data.append("destinationAreaId", selectedAddress.region_code || "");
        data.append("destinationLatitude", selectedAddress.maps_latitude ? selectedAddress.maps_latitude.toString() : "");
        data.append("destinationLongitude", selectedAddress.maps_longitude ? selectedAddress.maps_longitude.toString() : "");
      }

      data.append("paymentMethod", paymentMethod);

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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--c-ink)", marginBottom: 12 }}>
            Data Pesanan Tidak Ditemukan
          </h2>
          <Link href="/refill" className="btn btn-primary">
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

  return (
    <div className="customer-page" style={{ background: "var(--c-bg)", minHeight: "100vh" }}>
      <PageHeader />

      <div style={{ width: "min(1200px, calc(100% - 32px))", margin: "0 auto", padding: "100px 0 80px" }}>
        
        {/* BREADCRUMB */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.8rem", color: "var(--c-ink-dim)", marginBottom: 24 }}>
          <Link href="/refill" style={{ color: "var(--c-ink-dim)" }}>Refill</Link>
          <ChevronRight size={12} />
          <span style={{ color: "var(--c-gold)" }}>Checkout Custom</span>
        </div>

        {/* PAGE TITLE */}
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 3vw, 2.2rem)", fontWeight: 400, color: "var(--c-ink)", marginBottom: 28 }}>
          Selesaikan Pesanan Custom Refill
        </h1>

        {error && (
          <div style={{ background: "rgba(225, 29, 72, 0.1)", color: "var(--c-rose)", padding: "16px", borderRadius: "var(--r-md)", marginBottom: "24px", fontSize: "0.9rem", border: "1px solid rgba(225, 29, 72, 0.2)" }}>
            {error}
          </div>
        )}

        {/* METODE PEMENUHAN (KURIR vs AMBIL DI TOKO) */}
        {!isOwnBottle ? (
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
        ) : (
          <div style={{ background: "rgba(168, 85, 247, 0.08)", padding: "16px 20px", borderRadius: "var(--r-lg)", border: "1px solid rgba(168, 85, 247, 0.2)", marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
            <Wine size={22} style={{ color: "#a855f7", flexShrink: 0 }} />
            <div style={{ fontSize: "0.9rem", color: "var(--c-ink)" }}>
              <strong style={{ color: "#a855f7" }}>Mode Bawa Botol Sendiri:</strong> Pesanan wajib diambil langsung di toko fisik Ela Parfum pilihan Anda agar botol dapat diisi ulang di tempat.
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* ALAMAT PENGIRIMAN (HANYA JIKA DELIVERY) */}
            {fulfillmentType === "delivery" && (
              <div style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
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
            )}

            {/* PILIHAN CABANG TOKO & JARAK */}
            <div style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 4 }}>
                    <Store size={18} style={{ color: "var(--c-gold)" }} />
                    {fulfillmentType === "pickup" ? "Pilih Cabang Toko Pengambilan" : "Pilih Cabang Toko Peracikan"}
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--c-ink-dim)", margin: 0 }}>
                    {fulfillmentType === "pickup"
                      ? isRealtimeGps 
                        ? "📍 Jarak dihitung dari posisi GPS Anda saat ini via jaringan jalan raya."
                        : "📍 Jarak dihitung dari alamat utama Anda via jaringan jalan raya."
                      : "📍 Sistem memeriksa stok bibit & botol pada tiap cabang untuk peracikan optimal."}
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
                        transition: "all 0.2s ease"
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
                                  Stok Racikan Tidak Cukup
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

            {/* OPSI KURIR (HANYA JIKA DELIVERY) */}
            {fulfillmentType === "delivery" && (
              <div style={{ background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)" }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20 }}>
                  <Truck size={18} style={{ color: "var(--c-gold)" }} />
                  Opsi Kurir Pengiriman
                </h2>

                {loadingRates ? (
                  <div style={{ fontSize: "0.9rem", color: "var(--c-ink-dim)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Loader2 className="animate-spin" size={16} /> Menghitung ongkir dari {selectedStore?.name || "Toko"}...
                  </div>
                ) : !selectedAddress ? (
                  <div style={{ fontSize: "0.9rem", color: "var(--c-ink-dim)" }}>
                    Silakan pilih alamat pengiriman terlebih dahulu.
                  </div>
                ) : rates.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {rates.map((rate, idx) => (
                      <label key={`${rate.courier_service_code}-${rate.price}-${idx}`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", border: selectedCourier?.courier_service_code === rate.courier_service_code && selectedCourier?.price === rate.price ? "1px solid var(--c-gold)" : "1px solid var(--c-border)", borderRadius: "var(--r-md)", cursor: "pointer", background: selectedCourier?.courier_service_code === rate.courier_service_code && selectedCourier?.price === rate.price ? "var(--glass-bg)" : "transparent" }}>
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
                  <div style={{ fontSize: "0.9rem", color: "var(--c-ink-dim)" }}>
                    Kurir tidak tersedia untuk alamat ini.
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
                        Bayar langsung ke kasir saat mengambil racikan custom di toko.
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
              disabled={submitting || !selectedStore || !selectedStore.isAvailable || (fulfillmentType === "delivery" && (!selectedCourier || !selectedAddress))}
              className="btn btn-primary"
              style={{
                padding: "16px",
                justifyContent: "center",
                fontSize: "1rem",
                opacity: (submitting || !selectedStore || !selectedStore.isAvailable) ? 0.6 : 1,
              }}
            >
              {submitting ? (
                <><Loader2 className="animate-spin" size={18} /> Memproses...</>
              ) : (
                <><Lock size={16} /> {fulfillmentType === "pickup" && paymentMethod === "TUNAI" ? "Buat Pesanan & Bayar di Toko" : "Bayar Sekarang"}</>
              )}
            </button>
          </form>

          {/* RIGHT: RINGKASAN RACIKAN */}
          <div style={{ position: "sticky", top: 100 }}>
            <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: 24 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 400, color: "var(--c-ink)", marginBottom: 16 }}>
                Detail Racikan Refill
              </h3>

              <div style={{ padding: "14px", background: "var(--glass-bg)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border)", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Sparkles size={16} style={{ color: "var(--c-gold)" }} />
                  <span style={{ fontWeight: 600, color: "var(--c-ink)", fontSize: "0.95rem" }}>
                    {recipe?.name_suggestion || request?.title || "Custom Ela Parfum"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: "0.8rem", color: "var(--c-ink-dim)", flexWrap: "wrap" }}>
                  <span>Volume: <strong>{bottleObj?.capacity_ml || request.volume || 0}ml</strong></span>
                  <span>Rasio: <strong>{ratioStr}</strong></span>
                  <span>Metode: <strong>{modeStr === "ai" ? "Prompt AI" : modeStr === "image" ? "Scan Gambar" : "Manual"}</strong></span>
                </div>
              </div>

              {/* Rincian Komposisi Bibit */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Komposisi:</div>
                {bibitsList.map((b: any, idx: number) => (
                  <div key={b.id || idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--c-ink)" }}>• {b.name}</span>
                    <span style={{ color: "var(--c-ink-dim)" }}>{formatRupiah(b.price_per_ml || 0)}/ml</span>
                  </div>
                ))}
                {!isOwnBottle && bottleObj && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--c-ink)" }}>• Botol {bottleObj.name}</span>
                    <span style={{ color: "var(--c-ink-dim)" }}>{formatRupiah(bottleObj.price || 0)}</span>
                  </div>
                )}
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

              {/* Rincian Harga */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.9rem", color: "var(--c-ink-dim)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Harga Racikan</span>
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
