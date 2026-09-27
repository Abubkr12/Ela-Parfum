"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ShoppingBag, 
  Store, 
  Sliders, 
  Check, 
  Plus, 
  Minus, 
  Sparkles, 
  Gem, 
  Wind, 
  Droplets 
} from "lucide-react";
import { toast } from "sonner";
import { showLuxuryCartToast } from "@/components/ui/LuxuryToast";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { BibitData, BottleData } from "@/components/refill/types";
import { CartItem, formatRupiah } from "@/lib/types";
import { 
  BottleSeriesType, 
  getBottleSeries, 
  getBottleSeriesBadge, 
  sortBottlesLogically 
} from "@/lib/bottles";

interface BibitVariantModalProps {
  bibit: BibitData | null;
  bottles: BottleData[];
  isOpen: boolean;
  onClose: () => void;
}

const RATIOS: { id: "30/70" | "50/50" | "70/30" | "100/0"; name: string; desc: string; percent: number }[] = [
  { id: "30/70", name: "Eau De Toilette (3:7)", desc: "Aroma ringan & segar untuk sehari-hari (3-4 jam)", percent: 0.3 },
  { id: "50/50", name: "Eau De Parfum (1:1)", desc: "Keseimbangan ideal ketahanan & tebaran (6-8 jam)", percent: 0.5 },
  { id: "70/30", name: "Extrait De Parfum (1:3)", desc: "Konsentrasi pekat tahan lama (8-12 jam)", percent: 0.7 },
  { id: "100/0", name: "Elixir (Murni)", desc: "100% konsentrat murni tanpa pelarut (12+ jam)", percent: 1.0 },
];

export function BibitVariantModal({ bibit, bottles, isOpen, onClose }: BibitVariantModalProps) {
  const router = useRouter();
  const { addItem } = useCart();

  const [ratio, setRatio] = useState<"30/70" | "50/50" | "70/30" | "100/0">("50/50");
  const [useOwnBottle, setUseOwnBottle] = useState(false);
  const [ownBottleVolumeMl, setOwnBottleVolumeMl] = useState(30);
  const [selectedBottle, setSelectedBottle] = useState<BottleData | null>(bottles[0] || null);
  const [selectedSeries, setSelectedSeries] = useState<"all" | BottleSeriesType>("all");
  const [quantity, setQuantity] = useState(1);

  // Sort bottles logically: Luxury Glass first, then Spray Reguler, then Tola & Roll-on
  const sortedBottles = useMemo(() => {
    return sortBottlesLogically(bottles);
  }, [bottles]);

  // Update selected bottle when bottles prop loads
  React.useEffect(() => {
    if (sortedBottles.length > 0 && !selectedBottle) {
      setSelectedBottle(sortedBottles[0]);
    }
  }, [sortedBottles, selectedBottle]);

  // Series count
  const seriesCounts = useMemo(() => {
    let luxury = 0;
    let spray = 0;
    let tola = 0;
    sortedBottles.forEach((b) => {
      const s = getBottleSeries(b.name);
      if (s === "luxury") luxury++;
      else if (s === "spray") spray++;
      else if (s === "tola") tola++;
    });
    return { all: sortedBottles.length, luxury, spray, tola };
  }, [sortedBottles]);

  // Filtered bottles by active series tab
  const displayBottles = useMemo(() => {
    if (selectedSeries === "all") return sortedBottles;
    return sortedBottles.filter((b) => getBottleSeries(b.name) === selectedSeries);
  }, [sortedBottles, selectedSeries]);

  const ratioInfo = useMemo(() => RATIOS.find(r => r.id === ratio) || RATIOS[1], [ratio]);
  const capacityMl = useOwnBottle ? ownBottleVolumeMl : (selectedBottle?.capacity_ml || 30);
  const bibitVolume = capacityMl * ratioInfo.percent;
  const solventVolume = ratio === "100/0" ? 0 : Math.max(0, capacityMl - bibitVolume);
  
  const pricePerMl = bibit?.price_per_ml || 1500;
  const bibitPrice = Math.round(bibitVolume * pricePerMl);
  const bottlePrice = useOwnBottle ? 0 : (selectedBottle?.price || 0);
  const unitPrice = bibitPrice + bottlePrice;
  const totalPrice = unitPrice * quantity;

  if (!isOpen || !bibit) return null;

  const handleAddToCart = () => {
    try {
      const ratioName = ratio === "100/0" ? "Elixir (Murni)" : ratio === "70/30" ? "Extrait de Parfum (1:3)" : ratio === "50/50" ? "Eau De Parfum (1:1)" : "Eau De Toilette (3:7)";
      const uniqueId = `refill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      const adminRecipe = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRACIKAN PARFUM — ${capacityMl}ml (${ratioName})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nBibit ${bibit.name} (100%) : ${bibitVolume.toFixed(1)} ml\nPelarut Absolute : ${solventVolume.toFixed(1)} ml\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal Volume : ${capacityMl.toFixed(1)} ml`;

      const cartItem: CartItem = {
        id: uniqueId,
        itemType: "refill",
        perfumeName: `Refill ${bibit.name}`,
        sizeLabel: `${capacityMl}ml · ${ratioName}`,
        price: unitPrice,
        quantity: quantity,
        imageUrl: useOwnBottle ? "/images/bottles/preview/bottle-1.jpg" : (selectedBottle?.image_url || "/images/bottles/preview/bottle-1.jpg"),
        familyName: bibit.collection || "Refill Bibit",
        refillData: {
          mode: "manual",
          customName: `Refill ${bibit.name}`,
          ratio: ratio,
          volumeMl: capacityMl,
          bottle: {
            id: useOwnBottle ? null : selectedBottle?.id,
            name: useOwnBottle ? `Botol Sendiri (${ownBottleVolumeMl}ml)` : (selectedBottle?.name || "Botol Ela"),
            capacity_ml: capacityMl,
            price: bottlePrice,
            image_url: selectedBottle?.image_url,
          },
          useOwnBottle: useOwnBottle,
          ownBottleVolumeMl: useOwnBottle ? ownBottleVolumeMl : undefined,
          bibits: [{
            id: bibit.id,
            name: bibit.name,
            volumeMl: bibitVolume,
            pricePerMl: pricePerMl,
          }],
          adminRecipe: adminRecipe,
          intensity: bibit.intensity,
        }
      };

      addItem(cartItem, quantity);
      onClose();
      showLuxuryCartToast({
        title: "Racikan Masuk Keranjang",
        perfumeName: `Refill ${bibit.name}`,
        variantDetails: `${capacityMl}ml • ${ratioName}`,
        quantity: quantity,
        totalPrice: totalPrice,
        onOpenCart: () => router.push("/keranjang"),
      });
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan ke keranjang");
    }
  };

  return (
    <AnimatePresence>
      <div 
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(6px)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          style={{
            width: "100%",
            maxWidth: "580px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden", // Eliminasi overflow siku / buntut
            background: "var(--c-surface-1)",
            border: "1px solid var(--c-border)",
            borderRadius: "var(--r-xl, 20px)",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.35)",
            position: "relative",
          }}
        >
          {/* Header - Fixed top */}
          <div style={{ 
            padding: "20px 24px 16px", 
            borderBottom: "1px solid var(--c-border)", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "flex-start",
            background: "var(--c-surface-1)",
            flexShrink: 0
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 100, background: "rgba(217, 119, 6, 0.15)", color: "var(--c-gold)", fontWeight: 600 }}>
                  {bibit.collection || "Bibit Parfum"}
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>
                  {bibit.intensity} · {bibit.main_accord}
                </span>
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 700, color: "var(--c-ink)", margin: 0 }}>
                {bibit.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "var(--c-surface-2)",
                border: "none",
                borderRadius: "50%",
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--c-ink-dim)",
                transition: "all 0.15s ease",
              }}
              title="Tutup"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body - Scrollable with smooth rounded scrollbar */}
          <div 
            className="variant-modal-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(217, 119, 6, 0.25) transparent",
            }}
          >
            {/* 1. Pilih Rasio Konsentrasi */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--c-ink)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                1. Pilih Rasio Konsentrasi
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {RATIOS.map((r) => {
                  const isSelected = ratio === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRatio(r.id)}
                      style={{
                        padding: "12px",
                        borderRadius: "var(--r-md)",
                        border: isSelected ? "1.5px solid var(--c-gold)" : "1px solid var(--c-border)",
                        background: isSelected ? "var(--glass-bg)" : "var(--c-surface-2)",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: isSelected ? "var(--c-gold)" : "var(--c-ink)" }}>
                          {r.id === "50/50" ? "EDP (1:1)" : r.id === "70/30" ? "Extrait (1:3)" : r.id === "100/0" ? "Elixir (Murni)" : "EDT (3:7)"}
                        </span>
                        {isSelected && <Check size={14} style={{ color: "var(--c-gold)" }} />}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", lineHeight: 1.3 }}>
                        {r.id === "50/50" ? "50% Bibit : 50% Pelarut" : r.id === "70/30" ? "70% Bibit : 30% Pelarut" : r.id === "100/0" ? "100% Murni Konsentrat" : "30% Bibit : 70% Pelarut"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Pilih Botol Kemasan */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--c-ink)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  2. Pilihan Kemasan Botol
                </label>
                {!useOwnBottle && (
                  <span style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)" }}>
                    {displayBottles.length} Varian Botol
                  </span>
                )}
              </div>
              
              {/* Toggle Ours vs Own */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => setUseOwnBottle(false)}
                  style={{
                    padding: "10px",
                    borderRadius: "var(--r-md)",
                    border: !useOwnBottle ? "1.5px solid var(--c-gold)" : "1px solid var(--c-border)",
                    background: !useOwnBottle ? "var(--glass-bg)" : "var(--c-surface-2)",
                    color: !useOwnBottle ? "var(--c-gold)" : "var(--c-ink-dim)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Gunakan Botol Ela
                </button>
                <button
                  type="button"
                  onClick={() => setUseOwnBottle(true)}
                  style={{
                    padding: "10px",
                    borderRadius: "var(--r-md)",
                    border: useOwnBottle ? "1.5px solid #a855f7" : "1px solid var(--c-border)",
                    background: useOwnBottle ? "rgba(168, 85, 247, 0.1)" : "var(--c-surface-2)",
                    color: useOwnBottle ? "#a855f7" : "var(--c-ink-dim)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Bawa Botol Sendiri
                </button>
              </div>

              {/* Botol Ela: Series Tabs Filter */}
              {!useOwnBottle ? (
                <div>
                  <div style={{ 
                    display: "flex", 
                    gap: 6, 
                    marginBottom: 12, 
                    overflowX: "auto", 
                    paddingBottom: 4,
                    scrollbarWidth: "none"
                  }}>
                    <button
                      type="button"
                      onClick={() => setSelectedSeries("all")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "100px",
                        border: selectedSeries === "all" ? "1px solid var(--c-gold)" : "1px solid var(--c-border)",
                        background: selectedSeries === "all" ? "rgba(217, 119, 6, 0.15)" : "var(--c-surface-2)",
                        color: selectedSeries === "all" ? "var(--c-gold)" : "var(--c-ink-dim)",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Sparkles size={13} />
                      <span>Semua ({seriesCounts.all})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSeries("luxury")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "100px",
                        border: selectedSeries === "luxury" ? "1px solid var(--c-gold)" : "1px solid var(--c-border)",
                        background: selectedSeries === "luxury" ? "rgba(217, 119, 6, 0.15)" : "var(--c-surface-2)",
                        color: selectedSeries === "luxury" ? "var(--c-gold)" : "var(--c-ink-dim)",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Gem size={13} />
                      <span>Luxury Glass ({seriesCounts.luxury})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSeries("spray")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "100px",
                        border: selectedSeries === "spray" ? "1px solid #38bdf8" : "1px solid var(--c-border)",
                        background: selectedSeries === "spray" ? "rgba(56, 189, 248, 0.15)" : "var(--c-surface-2)",
                        color: selectedSeries === "spray" ? "#38bdf8" : "var(--c-ink-dim)",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Wind size={13} />
                      <span>Spray Reguler ({seriesCounts.spray})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSeries("tola")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "100px",
                        border: selectedSeries === "tola" ? "1px solid #a855f7" : "1px solid var(--c-border)",
                        background: selectedSeries === "tola" ? "rgba(168, 85, 247, 0.15)" : "var(--c-surface-2)",
                        color: selectedSeries === "tola" ? "#a855f7" : "var(--c-ink-dim)",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Droplets size={13} />
                      <span>Tola & Oles ({seriesCounts.tola})</span>
                    </button>
                  </div>

                  {/* List Botol Ela Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 8 }}>
                    {displayBottles.map((b) => {
                      const isSelected = selectedBottle?.id === b.id;
                      const series = getBottleSeries(b.name);
                      const badge = getBottleSeriesBadge(series);

                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBottle(b)}
                          style={{
                            padding: "10px 8px",
                            borderRadius: "var(--r-md)",
                            border: isSelected ? "1.5px solid var(--c-gold)" : "1px solid var(--c-border)",
                            background: isSelected ? "var(--glass-bg)" : "var(--c-surface-2)",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            minHeight: 88,
                            position: "relative",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <span style={{ 
                                fontSize: "0.65rem", 
                                fontWeight: 700, 
                                padding: "1px 5px", 
                                borderRadius: 4, 
                                background: badge.bg, 
                                color: badge.color, 
                                border: `1px solid ${badge.border}` 
                              }}>
                                {badge.label}
                              </span>
                              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: isSelected ? "var(--c-gold)" : "var(--c-ink)" }}>
                                {b.capacity_ml}ml
                              </span>
                            </div>
                            <div style={{ 
                              fontSize: "0.74rem", 
                              color: "var(--c-ink)", 
                              fontWeight: 500,
                              margin: "2px 0 6px", 
                              lineHeight: 1.25,
                              textAlign: "left",
                              wordBreak: "break-word"
                            }}>
                              {b.name}
                            </div>
                          </div>
                          
                          <div style={{ 
                            fontSize: "0.78rem", 
                            fontWeight: 700, 
                            color: isSelected ? "var(--c-gold)" : "var(--c-ink-dim)",
                            textAlign: "left",
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                            paddingTop: 4
                          }}>
                            {formatRupiah(b.price)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Slider Botol Sendiri (1 - 1000ml) */
                <div style={{ background: "rgba(168, 85, 247, 0.05)", border: "1px solid rgba(168, 85, 247, 0.25)", padding: "16px", borderRadius: "var(--r-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600, color: "#a855f7" }}>
                      <Sliders size={16} />
                      <span>Kapasitas Botol Anda</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={ownBottleVolumeMl}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setOwnBottleVolumeMl(Math.max(1, Math.min(1000, val)));
                          }
                        }}
                        style={{
                          width: 70,
                          padding: "4px 8px",
                          textAlign: "center",
                          borderRadius: "var(--r-sm)",
                          border: "1px solid rgba(168, 85, 247, 0.4)",
                          background: "var(--c-surface-1)",
                          color: "var(--c-ink)",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                        }}
                      />
                      <span style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", fontWeight: 600 }}>ml</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={1000}
                    step={1}
                    value={ownBottleVolumeMl}
                    onChange={(e) => setOwnBottleVolumeMl(parseInt(e.target.value, 10))}
                    style={{ width: "100%", accentColor: "#a855f7", cursor: "pointer", marginBottom: 12 }}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>
                    <span>1 ml</span>
                    <span>50 ml</span>
                    <span>100 ml</span>
                    <span>250 ml</span>
                    <span>500 ml</span>
                    <span>1000 ml</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "#a855f7" }}>
                    <Store size={14} style={{ flexShrink: 0 }} />
                    <span>Wajib diambil di toko agar botol fisik dapat diserahkan ke kasir.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Rincian Komposisi & Harga */}
            <div style={{ background: "var(--c-surface-2)", padding: "16px", borderRadius: "var(--r-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 6 }}>
                <span>Bibit ({bibitVolume.toFixed(1)}ml @{formatRupiah(pricePerMl)}/ml)</span>
                <span style={{ fontWeight: 600, color: "var(--c-ink)" }}>{formatRupiah(bibitPrice)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 6 }}>
                <span>Pelarut Absolute ({solventVolume.toFixed(1)}ml)</span>
                <span style={{ fontWeight: 600, color: "var(--c-teal)" }}>Gratis</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 10 }}>
                <span>{useOwnBottle ? "Botol Sendiri" : `Botol ${selectedBottle?.name || 'Ela'}`}</span>
                <span style={{ fontWeight: 600, color: useOwnBottle ? "var(--c-teal)" : "var(--c-ink)" }}>
                  {useOwnBottle ? "Gratis" : formatRupiah(bottlePrice)}
                </span>
              </div>

              <div style={{ height: 1, background: "var(--c-border)", margin: "10px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--c-ink)" }}>Harga Satuan</span>
                <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--c-gold)" }}>{formatRupiah(unitPrice)}</span>
              </div>
            </div>
          </div>

          {/* Footer - Fixed bottom */}
          <div style={{ 
            padding: "16px 24px", 
            borderTop: "1px solid var(--c-border)", 
            background: "var(--c-surface-1)", 
            display: "flex", 
            gap: 12, 
            alignItems: "center",
            flexShrink: 0
          }}>
            {/* Stepper */}
            <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", background: "var(--c-surface-2)", padding: 4 }}>
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  borderRadius: "var(--r-sm)",
                  color: quantity <= 1 ? "var(--c-ink-dim)" : "var(--c-ink)",
                  cursor: quantity <= 1 ? "not-allowed" : "pointer",
                }}
              >
                <Minus size={16} />
              </button>
              <span style={{ width: 36, textAlign: "center", fontWeight: 700, fontSize: "0.95rem", color: "var(--c-ink)" }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  borderRadius: "var(--r-sm)",
                  color: "var(--c-ink)",
                  cursor: "pointer",
                }}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleAddToCart}
              style={{
                flex: 1,
                padding: "14px 20px",
                borderRadius: "var(--r-md)",
                background: "var(--c-gold)",
                color: "#000000",
                border: "none",
                fontWeight: 700,
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(217, 119, 6, 0.25)",
              }}
            >
              <ShoppingBag size={18} />
              <span>+ Keranjang ({formatRupiah(totalPrice)})</span>
            </button>
          </div>

          <style jsx>{`
            .variant-modal-scroll::-webkit-scrollbar {
              width: 6px;
            }
            .variant-modal-scroll::-webkit-scrollbar-track {
              background: transparent;
              margin: 8px 0;
            }
            .variant-modal-scroll::-webkit-scrollbar-thumb {
              background: rgba(217, 119, 6, 0.25);
              border-radius: 999px;
            }
            .variant-modal-scroll::-webkit-scrollbar-thumb:hover {
              background: var(--c-gold);
            }
          `}</style>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
