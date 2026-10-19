"use client";

import React, { useState, useMemo } from "react";
import { PosBibitItem, PosBottleItem, PosBillItem } from "../actions";
import {
  X,
  Sparkles,
  Droplets,
  Plus,
  Trash2,
  Check,
  FlaskConical,
  Wine,
  Percent,
  Search,
  Bot,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { formatRupiah } from "@/lib/types";

interface KasirMixModalProps {
  initialBibit: PosBibitItem;
  allBibits: PosBibitItem[];
  bottles: PosBottleItem[];
  onClose: () => void;
  onAddToCart: (item: PosBillItem) => void;
}

export default function KasirMixModal({
  initialBibit,
  allBibits,
  bottles,
  onClose,
  onAddToCart,
}: KasirMixModalProps) {
  // 1. Kemasan Botol
  const [containerType, setContainerType] = useState<"ela_bottle" | "own_bottle">("ela_bottle");
  const [selectedBottleId, setSelectedBottleId] = useState<number>(bottles[0]?.id || 1);
  const [ownBottleCapacity, setOwnBottleCapacity] = useState<number>(30);

  // 2. Komposisi Bibit
  const [bibit1] = useState<PosBibitItem>(initialBibit);
  const [hasBibit2, setHasBibit2] = useState<boolean>(false);
  const [bibit2, setBibit2] = useState<PosBibitItem | null>(null);
  const [bibit2Search, setBibit2Search] = useState<string>("");
  const [showBibit2Picker, setShowBibit2Picker] = useState<boolean>(false);
  const [bibitSplitPercent, setBibitSplitPercent] = useState<number>(50); // 50:50

  // 3. Rasio Konsentrasi
  const [ratioPreset, setRatioPreset] = useState<"100/0" | "70/30" | "50/50" | "30/70" | "custom">("50/50");
  const [customBibitPercent, setCustomBibitPercent] = useState<number>(50);

  // 4. AI Advisor State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  // Botol terpilih
  const selectedBottle = useMemo(() => {
    return bottles.find((b) => b.id === selectedBottleId) || bottles[0];
  }, [bottles, selectedBottleId]);

  // Kapasitas Total Wadah (ml)
  const totalCapacityMl = containerType === "ela_bottle" ? selectedBottle?.capacity_ml || 30 : Math.max(1, ownBottleCapacity);

  // Persentase Bibit Aktual (0 - 100)
  const bibitRatioPercent = useMemo(() => {
    if (ratioPreset === "100/0") return 100;
    if (ratioPreset === "70/30") return 70;
    if (ratioPreset === "50/50") return 50;
    if (ratioPreset === "30/70") return 30;
    return Math.min(100, Math.max(1, customBibitPercent));
  }, [ratioPreset, customBibitPercent]);

  // Perhitungan Volume
  const totalBibitMl = parseFloat(((totalCapacityMl * bibitRatioPercent) / 100).toFixed(1));
  const totalSolventMl = parseFloat((Math.max(0, totalCapacityMl - totalBibitMl)).toFixed(1));

  // Pembagian Volume Bibit 1 & Bibit 2
  const bibit1Ml = useMemo(() => {
    if (!hasBibit2 || !bibit2) return totalBibitMl;
    return parseFloat(((totalBibitMl * (100 - bibitSplitPercent)) / 100).toFixed(1));
  }, [hasBibit2, bibit2, totalBibitMl, bibitSplitPercent]);

  const bibit2Ml = useMemo(() => {
    if (!hasBibit2 || !bibit2) return 0;
    return parseFloat(((totalBibitMl * bibitSplitPercent) / 100).toFixed(1));
  }, [hasBibit2, bibit2, totalBibitMl, bibitSplitPercent]);

  // Kalkulasi Harga
  const bottlePrice = containerType === "ela_bottle" ? selectedBottle?.price || 0 : 0;
  const bibit1Price = bibit1Ml * bibit1.price_per_ml;
  const bibit2Price = bibit2 ? bibit2Ml * bibit2.price_per_ml : 0;
  const totalPrice = Math.round(bottlePrice + bibit1Price + bibit2Price);

  // Filter pencarian Bibit #2
  const filteredBibit2 = useMemo(() => {
    if (!bibit2Search.trim()) return allBibits.slice(0, 15);
    const q = bibit2Search.toLowerCase();
    return allBibits
      .filter((b) => b.id !== bibit1.id && (b.name.toLowerCase().includes(q) || b.collection.toLowerCase().includes(q)))
      .slice(0, 20);
  }, [allBibits, bibit2Search, bibit1.id]);

  // Konsultasi AI Scent Advisor
  const handleConsultAi = async () => {
    if (!hasBibit2 || !bibit2) {
      setAiAdvice(`Aroma tunggal ${bibit1.name} dengan konsentrasi ${bibitRatioPercent}% (${ratioPreset === "70/30" ? "Extrait" : "Eau de Parfum"}) memberikan proyeksi aroma yang solid dan tahan lama.`);
      return;
    }

    setAiLoading(true);
    setAiAdvice(null);
    try {
      const prompt = `Kombinasi racikan kasir Ela Parfum:
Bibit 1: ${bibit1.name} (Accord: ${bibit1.main_accord || "aromatic"})
Bibit 2: ${bibit2.name} (Accord: ${bibit2.main_accord || "fresh"})
Berikan 1-2 kalimat rekomendasi perpaduan rasio terbaik agar wanginya seimbang dan mewah.`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] }),
      });
      const data = await res.json();
      if (data?.response) {
        setAiAdvice(data.response);
      } else {
        setAiAdvice(`Rekomendasi rasio seimbang: 60% ${bibit1.name} (Top/Body) dan 40% ${bibit2.name} (Base) untuk harmoni aroma yang elegan.`);
      }
    } catch {
      setAiAdvice(`Saran racikan: 60% ${bibit1.name} & 40% ${bibit2.name} menghasilkan transisi aroma yang mulus dan tahan lama.`);
    } finally {
      setAiLoading(false);
    }
  };

  // Submit ke Bill
  const handleAdd = () => {
    const ratioLabel =
      ratioPreset === "100/0"
        ? "100/0 Murni"
        : ratioPreset === "70/30"
        ? "70/30 Extrait"
        : ratioPreset === "50/50"
        ? "50/50 EDP"
        : ratioPreset === "30/70"
        ? "30/70 EDT"
        : `${bibitRatioPercent}% Custom`;

    const bottleLabel = containerType === "ela_bottle" ? selectedBottle.name : `Botol Sendiri (${totalCapacityMl}ml)`;

    const title = hasBibit2 && bibit2
      ? `Racik: ${bibit1.name} + ${bibit2.name}`
      : `Racik: ${bibit1.name}`;

    const subtitle = `${bottleLabel} • Rasio ${ratioLabel} • Bibit ${totalBibitMl}ml, Pelarut ${totalSolventMl}ml`;

    const bibitsList = [
      { id: bibit1.id, name: bibit1.name, volumeMl: bibit1Ml, pricePerMl: bibit1.price_per_ml },
    ];
    if (hasBibit2 && bibit2) {
      bibitsList.push({ id: bibit2.id, name: bibit2.name, volumeMl: bibit2Ml, pricePerMl: bibit2.price_per_ml });
    }

    const adminRecipe = `RESEP: [${bottleLabel}] Rasio: ${ratioLabel} | Bibit: ${bibitsList.map((b) => `${b.name} (${b.volumeMl}ml)`).join(", ")} | Pelarut: ${totalSolventMl}ml`;

    const billItem: PosBillItem = {
      type: "refill",
      title,
      subtitle,
      price: totalPrice,
      quantity: 1,
      subtotal: totalPrice,
      meta: {
        bottleId: containerType === "ela_bottle" ? selectedBottle.id : null,
        bottleName: bottleLabel,
        capacityMl: totalCapacityMl,
        useOwnBottle: containerType === "own_bottle",
        ratio: ratioLabel,
        bibits: bibitsList,
        adminRecipe,
      },
    };

    onAddToCart(billItem);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          backgroundColor: "#121614",
          border: "1px solid rgba(217, 119, 6, 0.35)",
          borderRadius: "20px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(217, 119, 6, 0.12)",
          color: "#F3F4F6",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(90deg, rgba(217, 119, 6, 0.12) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(217, 119, 6, 0.2)",
                border: "1px solid rgba(217, 119, 6, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F59E0B",
              }}
            >
              <FlaskConical size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "#FFFFFF" }}>
                Form Racik Kasir: {bibit1.name}
              </h2>
              <span style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>
                Koleksi {bibit1.collection} • {formatRupiah(bibit1.price_per_ml)}/ml
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div
          style={{
            padding: "1.5rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          {/* Section 1: Pilihan Kemasan Botol */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#E5E7EB", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 6 }}>
                <Wine size={16} color="#F59E0B" />
                1. Pilih Wadah / Kemasan Botol
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setContainerType("ela_bottle")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: containerType === "ela_bottle" ? "1px solid #D97706" : "1px solid rgba(255,255,255,0.1)",
                    background: containerType === "ela_bottle" ? "rgba(217, 119, 6, 0.2)" : "rgba(255,255,255,0.04)",
                    color: containerType === "ela_bottle" ? "#FBBF24" : "#9CA3AF",
                  }}
                >
                  Botol Ela Parfum
                </button>
                <button
                  type="button"
                  onClick={() => setContainerType("own_bottle")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: containerType === "own_bottle" ? "1px solid #D97706" : "1px solid rgba(255,255,255,0.1)",
                    background: containerType === "own_bottle" ? "rgba(217, 119, 6, 0.2)" : "rgba(255,255,255,0.04)",
                    color: containerType === "own_bottle" ? "#FBBF24" : "#9CA3AF",
                  }}
                >
                  Bawa Botol Sendiri
                </button>
              </div>
            </div>

            {containerType === "ela_bottle" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.5rem", maxHeight: "160px", overflowY: "auto", padding: "4px" }}>
                {bottles.map((b) => {
                  const isSelected = selectedBottleId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBottleId(b.id)}
                      style={{
                        padding: "0.6rem 0.75rem",
                        borderRadius: "10px",
                        textAlign: "left",
                        cursor: "pointer",
                        border: isSelected ? "1.5px solid #F59E0B" : "1px solid rgba(255,255,255,0.08)",
                        background: isSelected ? "rgba(217, 119, 6, 0.15)" : "rgba(20, 24, 22, 0.6)",
                        color: "#FFFFFF",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isSelected ? "#FBBF24" : "#FFFFFF" }}>
                          {b.capacity_ml}ml
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>
                          {formatRupiah(b.price)}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#D1D5DB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "rgba(20, 24, 22, 0.6)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "0.85rem", color: "#D1D5DB", display: "block", marginBottom: 4 }}>
                    Kapasitas Botol Pelanggan (ml):
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={ownBottleCapacity}
                      onChange={(e) => setOwnBottleCapacity(parseInt(e.target.value, 10) || 1)}
                      style={{
                        width: "120px",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "#0B0D0C",
                        border: "1px solid rgba(217, 119, 6, 0.4)",
                        borderRadius: "8px",
                        color: "#FFFFFF",
                        fontSize: "1rem",
                        fontWeight: 700,
                      }}
                    />
                    <span style={{ fontSize: "0.85rem", color: "#9CA3AF" }}>Mililiter</span>
                  </div>
                </div>
                <div style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10B981", fontSize: "0.75rem", fontWeight: 600 }}>
                  Harga Kemasan: Rp 0 (Gratis)
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Komposisi Bibit (1 atau 2 Bibit Layering) */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#E5E7EB", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 6 }}>
                <Droplets size={16} color="#F59E0B" />
                2. Komposisi Bibit Parfum
              </label>

              {!hasBibit2 ? (
                <button
                  type="button"
                  onClick={() => {
                    setHasBibit2(true);
                    setShowBibit2Picker(true);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid rgba(217, 119, 6, 0.3)",
                    background: "rgba(217, 119, 6, 0.15)",
                    color: "#FBBF24",
                  }}
                >
                  <Plus size={14} />
                  <span>+ Mix Bibit ke-2 (Layering)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setHasBibit2(false);
                    setBibit2(null);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 8px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#F87171",
                  }}
                >
                  <Trash2 size={12} />
                  <span>Hapus Bibit #2</span>
                </button>
              )}
            </div>

            {/* Bibit #1 Card */}
            <div style={{ background: "rgba(20, 24, 22, 0.7)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.7rem", color: "#F59E0B", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Bibit Utama #1</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF" }}>{bibit1.name}</span>
                <span style={{ fontSize: "0.75rem", color: "#9CA3AF", display: "block" }}>{formatRupiah(bibit1.price_per_ml)}/ml</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#FBBF24" }}>{bibit1Ml} ml</span>
                {hasBibit2 && (
                  <span style={{ fontSize: "0.75rem", color: "#9CA3AF", display: "block" }}>({100 - bibitSplitPercent}%)</span>
                )}
              </div>
            </div>

            {/* Bibit #2 Section */}
            {hasBibit2 && (
              <div style={{ marginTop: "0.75rem" }}>
                {bibit2 ? (
                  <div style={{ background: "rgba(20, 24, 22, 0.7)", border: "1px solid rgba(217, 119, 6, 0.3)", borderRadius: "12px", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#10B981", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Bibit Campuran #2</span>
                      <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF" }}>{bibit2.name}</span>
                      <span style={{ fontSize: "0.75rem", color: "#9CA3AF", display: "block" }}>{formatRupiah(bibit2.price_per_ml)}/ml</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#10B981" }}>{bibit2Ml} ml</span>
                        <span style={{ fontSize: "0.75rem", color: "#9CA3AF", display: "block" }}>({bibitSplitPercent}%)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBibit2Picker(true)}
                        style={{ padding: "4px 8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#D1D5DB", cursor: "pointer", fontSize: "0.75rem" }}
                      >
                        Ganti
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "1rem", borderRadius: "12px", border: "1px dashed rgba(217, 119, 6, 0.4)", textAlign: "center", background: "rgba(217, 119, 6, 0.05)" }}>
                    <span style={{ fontSize: "0.85rem", color: "#FBBF24", display: "block", marginBottom: 6 }}>
                      Pilih bibit kedua dari katalog:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBibit2Picker(true)}
                      style={{ padding: "6px 14px", background: "var(--c-gold)", border: "none", color: "#000", borderRadius: "8px", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      Buka Katalog Bibit #2
                    </button>
                  </div>
                )}

                {/* Slider Proporsi Bibit 1 vs Bibit 2 */}
                {bibit2 && (
                  <div style={{ marginTop: "0.75rem", background: "rgba(10, 13, 11, 0.6)", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 6 }}>
                      <span style={{ color: "#FBBF24" }}>{bibit1.name}: {100 - bibitSplitPercent}%</span>
                      <span style={{ color: "#10B981" }}>{bibit2.name}: {bibitSplitPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={5}
                      value={bibitSplitPercent}
                      onChange={(e) => setBibitSplitPercent(parseInt(e.target.value, 10))}
                      style={{ width: "100%", accentColor: "#F59E0B" }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Rasio Konsentrasi & Pelarut */}
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#E5E7EB", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 6, marginBottom: "0.75rem" }}>
              <Percent size={16} color="#F59E0B" />
              3. Rasio Konsentrasi (Bibit vs Pelarut)
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
              {[
                { id: "50/50", label: "50/50 EDP", desc: "50% Bibit" },
                { id: "70/30", label: "70/30 Extrait", desc: "70% Bibit" },
                { id: "100/0", label: "100/0 Murni", desc: "100% Bibit" },
                { id: "custom", label: "Custom %", desc: `${customBibitPercent}% Bibit` },
              ].map((r) => {
                const isSelected = ratioPreset === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRatioPreset(r.id as any)}
                    style={{
                      padding: "0.6rem 0.5rem",
                      borderRadius: "10px",
                      border: isSelected ? "1.5px solid #F59E0B" : "1px solid rgba(255,255,255,0.08)",
                      background: isSelected ? "rgba(217, 119, 6, 0.18)" : "rgba(20, 24, 22, 0.6)",
                      color: isSelected ? "#FBBF24" : "#D1D5DB",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, display: "block" }}>{r.label}</span>
                    <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>{r.desc}</span>
                  </button>
                );
              })}
            </div>

            {ratioPreset === "custom" && (
              <div style={{ marginTop: "0.75rem", background: "rgba(10, 13, 11, 0.6)", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 6 }}>
                  <span>Persentase Bibit: <strong style={{ color: "#FBBF24" }}>{customBibitPercent}%</strong></span>
                  <span>Pelarut: <strong style={{ color: "#9CA3AF" }}>{100 - customBibitPercent}%</strong></span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={customBibitPercent}
                  onChange={(e) => setCustomBibitPercent(parseInt(e.target.value, 10))}
                  style={{ width: "100%", accentColor: "#F59E0B" }}
                />
              </div>
            )}
          </div>

          {/* Section 4: AI Advisor Button & Box */}
          <div style={{ background: "rgba(18, 22, 20, 0.8)", border: "1px solid rgba(217, 119, 6, 0.2)", borderRadius: "12px", padding: "0.85rem 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bot size={18} color="#F59E0B" />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#FFFFFF" }}>AI Scent Advisor (Nove AI)</span>
              </div>
              <button
                type="button"
                onClick={handleConsultAi}
                disabled={aiLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "linear-gradient(135deg, rgba(217, 119, 6, 0.3) 0%, rgba(180, 83, 9, 0.15) 100%)",
                  border: "1px solid rgba(217, 119, 6, 0.4)",
                  color: "#FBBF24",
                }}
              >
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>{aiLoading ? "Menganalisis..." : "Saran Racikan AI"}</span>
              </button>
            </div>

            {aiAdvice && (
              <p style={{ marginTop: "0.6rem", fontSize: "0.8rem", color: "#D1D5DB", lineHeight: 1.5, marginBottom: 0, fontStyle: "italic", background: "rgba(0,0,0,0.25)", padding: "8px 12px", borderRadius: "8px" }}>
                "{aiAdvice}"
              </p>
            )}
          </div>

          {/* Section 5: Rincian Kalkulasi Volume & Harga */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(20, 24, 22, 0.8) 100%)",
              border: "1px solid rgba(217, 119, 6, 0.35)",
              borderRadius: "14px",
              padding: "1rem 1.25rem",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ color: "#9CA3AF" }}>Total Wadah:</span>
                <strong style={{ color: "#FFFFFF", marginLeft: 4 }}>{totalCapacityMl} ml</strong>
              </div>
              <div>
                <span style={{ color: "#9CA3AF" }}>Total Bibit:</span>
                <strong style={{ color: "#FBBF24", marginLeft: 4 }}>{totalBibitMl} ml ({bibitRatioPercent}%)</strong>
              </div>
              <div>
                <span style={{ color: "#9CA3AF" }}>Pelarut (Absolute):</span>
                <strong style={{ color: "#10B981", marginLeft: 4 }}>{totalSolventMl} ml (Gratis)</strong>
              </div>
              <div>
                <span style={{ color: "#9CA3AF" }}>Biaya Botol:</span>
                <strong style={{ color: "#FFFFFF", marginLeft: 4 }}>{formatRupiah(bottlePrice)}</strong>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.75rem" }}>
              <span style={{ fontSize: "0.9rem", color: "#D1D5DB" }}>Total Harga Racikan:</span>
              <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#FBBF24" }}>{formatRupiah(totalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            background: "#0E1110",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.65rem 1.25rem",
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#9CA3AF",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleAdd}
            style={{
              padding: "0.65rem 1.5rem",
              background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              color: "#0B0D0C",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 6px 20px -4px rgba(217, 119, 6, 0.4)",
            }}
          >
            <span>Tambah ke Bill Kasir</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Sub-Modal: Picker Bibit #2 */}
        {showBibit2Picker && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(10, 13, 11, 0.95)",
              backdropFilter: "blur(6px)",
              display: "flex",
              flexDirection: "column",
              padding: "1.25rem",
              zIndex: 250,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Search size={18} color="#F59E0B" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>Pilih Bibit Campuran #2</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBibit2Picker(false)}
                style={{ background: "transparent", border: "none", color: "#9CA3AF", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Ketik nama bibit atau aroma..."
              value={bibit2Search}
              onChange={(e) => setBibit2Search(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                backgroundColor: "#161B18",
                border: "1px solid rgba(217, 119, 6, 0.4)",
                borderRadius: "10px",
                color: "#FFFFFF",
                fontSize: "0.9rem",
                outline: "none",
                marginBottom: "1rem",
                boxSizing: "border-box",
              }}
            />

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filteredBibit2.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBibit2(b);
                    setShowBibit2Picker(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "#FFFFFF",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, display: "block" }}>{b.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>
                      {b.collection} • Stok: {b.stock_ml}ml
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#FBBF24" }}>
                      {formatRupiah(b.price_per_ml)}/ml
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
