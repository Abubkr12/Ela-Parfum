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
  ChevronRight,
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
  const [bibit2Category, setBibit2Category] = useState<"all" | "Global Parfume" | "Arabian Parfume">("all");
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
    let list = allBibits.filter((b) => b.id !== bibit1.id);

    if (bibit2Category !== "all") {
      list = list.filter((b) => b.collection === bibit2Category);
    }

    if (bibit2Search.trim()) {
      const q = bibit2Search.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.collection.toLowerCase().includes(q) ||
          (b.main_accord && b.main_accord.toLowerCase().includes(q))
      );
    }

    return list.slice(0, 30);
  }, [allBibits, bibit2Search, bibit1.id, bibit2Category]);

  // Konsultasi AI Scent Advisor
  const showAiAdvisor = ratioPreset === "custom" || (hasBibit2 && !!bibit2);

  const handleConsultAi = async () => {
    setAiLoading(true);
    setAiAdvice(null);
    try {
      let prompt = "";
      if (hasBibit2 && bibit2) {
        prompt = `Kombinasi layering kasir Ela Parfum:
Bibit 1: ${bibit1.name} (Koleksi: ${bibit1.collection}, Accord: ${bibit1.main_accord || "aromatic"})
Bibit 2: ${bibit2.name} (Koleksi: ${bibit2.collection}, Accord: ${bibit2.main_accord || "fresh"})
Berikan 1-2 kalimat rekomendasi perpaduan rasio terbaik antara Bibit 1 dan Bibit 2 agar aromanya harmonis, mewah, dan tidak tumpang tindih.`;
      } else {
        prompt = `Rekomendasi rasio konsentrasi parfum Ela Parfum:
Varian: ${bibit1.name} (Koleksi: ${bibit1.collection}, Accord: ${bibit1.main_accord || "aromatic"})
Berikan rekomendasi persentase bibit vs pelarut terbaik untuk racikan custom agar ketahanan dan proyeksi aroma optimal.`;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] }),
      });
      const data = await res.json();
      if (data?.response) {
        setAiAdvice(data.response);
      } else {
        setAiAdvice(
          hasBibit2 && bibit2
            ? `Rekomendasi perpaduan: 60% ${bibit1.name} (Top/Body) dan 40% ${bibit2.name} (Base) untuk harmoni aroma yang elegan dan seimbang.`
            : `Konsentrasi ${bibitRatioPercent}% (${ratioPreset === "70/30" ? "Extrait" : "EDP"}) sangat ideal untuk varian ${bibit1.name} agar karakter aromanya tahan lama.`
        );
      }
    } catch {
      setAiAdvice(
        hasBibit2 && bibit2
          ? `Saran racikan: 60% ${bibit1.name} & 40% ${bibit2.name} menghasilkan transisi aroma yang mulus dan tahan lama.`
          : `Rasio bibit ${bibitRatioPercent}% memberikan proyeksi yang solid dan ketahanan 6-8 jam.`
      );
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
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
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
          maxWidth: "700px",
          maxHeight: "92vh",
          backgroundColor: "var(--c-surface-1, #111614)",
          border: "1px solid var(--c-border-mid, rgba(255, 255, 255, 0.13))",
          borderRadius: "20px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.85), 0 0 35px var(--c-gold-glow, rgba(59,130,246,0.15))",
          color: "var(--c-ink, #f0ede8)",
          position: "relative",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--c-border, rgba(255, 255, 255, 0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(90deg, var(--c-gold-dim, rgba(59, 130, 246, 0.1)) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "var(--c-gold-dim, rgba(59, 130, 246, 0.12))",
                border: "1px solid var(--c-gold, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--c-gold, #3b82f6)",
              }}
            >
              <FlaskConical size={20} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--c-ink, #ffffff)",
                  fontFamily: "var(--font-display, serif)",
                  letterSpacing: "0.01em",
                }}
              >
                Form Racik Kasir: {bibit1.name}
              </h2>
              <span style={{ fontSize: "0.8rem", color: "var(--c-ink-muted, #8a9491)" }}>
                Koleksi {bibit1.collection} • {formatRupiah(bibit1.price_per_ml)}/ml • Stok Cabang:{" "}
                <strong style={{ color: "var(--c-ink, #ffffff)" }}>{bibit1.stock_ml.toLocaleString("id-ID")} ml</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--c-border, rgba(255, 255, 255, 0.08))",
              color: "var(--c-ink-muted, #8a9491)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
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
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--c-ink, #f0ede8)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Wine size={16} color="var(--c-gold, #3b82f6)" />
                1. Pilih Wadah / Kemasan Botol
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setContainerType("ela_bottle")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: containerType === "ela_bottle" ? "1px solid var(--c-gold, #3b82f6)" : "1px solid var(--c-border)",
                    background: containerType === "ela_bottle" ? "var(--c-gold-dim, rgba(59, 130, 246, 0.15))" : "var(--c-surface-2)",
                    color: containerType === "ela_bottle" ? "var(--c-gold-light, #60a5fa)" : "var(--c-ink-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  Botol Ela Parfum
                </button>
                <button
                  type="button"
                  onClick={() => setContainerType("own_bottle")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: containerType === "own_bottle" ? "1px solid var(--c-gold, #3b82f6)" : "1px solid var(--c-border)",
                    background: containerType === "own_bottle" ? "var(--c-gold-dim, rgba(59, 130, 246, 0.15))" : "var(--c-surface-2)",
                    color: containerType === "own_bottle" ? "var(--c-gold-light, #60a5fa)" : "var(--c-ink-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  Bawa Botol Sendiri
                </button>
              </div>
            </div>

            {containerType === "ela_bottle" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: "0.5rem",
                  maxHeight: "170px",
                  overflowY: "auto",
                  padding: "2px",
                }}
              >
                {bottles.map((b) => {
                  const isSelected = selectedBottleId === b.id;
                  const bottleStock = b.stock ?? (b as any).stock_qty ?? 0;
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
                        border: isSelected ? "1.5px solid var(--c-gold, #3b82f6)" : "1px solid var(--c-border)",
                        background: isSelected ? "var(--c-gold-dim, rgba(59, 130, 246, 0.15))" : "var(--c-surface-2, #181e1c)",
                        color: "var(--c-ink, #ffffff)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isSelected ? "var(--c-gold-light, #60a5fa)" : "var(--c-ink)" }}>
                          {b.capacity_ml}ml
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--c-ink-muted)" }}>
                          {formatRupiah(b.price)}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--c-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.name}
                      </span>
                      <span style={{ fontSize: "0.68rem", color: bottleStock < 10 ? "#f87171" : "#34d399", fontWeight: 600 }}>
                        Stok: {bottleStock} pcs
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--c-surface-2, #181e1c)",
                  padding: "1rem 1.25rem",
                  borderRadius: "12px",
                  border: "1px solid var(--c-border)",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--c-ink-muted)", display: "block", marginBottom: 6 }}>
                    Kapasitas Botol Pelanggan (ml):
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={ownBottleCapacity}
                      onChange={(e) => setOwnBottleCapacity(parseInt(e.target.value, 10) || 1)}
                      style={{
                        width: "120px",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "var(--c-bg, #0a0c0b)",
                        border: "1px solid var(--c-gold, #3b82f6)",
                        borderRadius: "8px",
                        color: "var(--c-ink, #ffffff)",
                        fontSize: "1rem",
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                    <span style={{ fontSize: "0.85rem", color: "var(--c-ink-muted)" }}>Mililiter (ml)</span>
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#10b981",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                  }}
                >
                  Harga Wadah: Rp 0 (Gratis)
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Komposisi Bibit (1 atau 2 Bibit Layering) */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--c-ink, #f0ede8)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Droplets size={16} color="var(--c-gold, #3b82f6)" />
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
                    gap: 6,
                    padding: "5px 12px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid var(--c-gold, #3b82f6)",
                    background: "var(--c-gold-dim, rgba(59, 130, 246, 0.15))",
                    color: "var(--c-gold-light, #60a5fa)",
                    transition: "all 0.15s ease",
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
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#f87171",
                    fontWeight: 600,
                  }}
                >
                  <Trash2 size={13} />
                  <span>Batal Campur Bibit #2</span>
                </button>
              )}
            </div>

            {/* Bibit #1 Card */}
            <div
              style={{
                background: "var(--c-surface-2, #181e1c)",
                border: "1px solid var(--c-border)",
                borderRadius: "12px",
                padding: "0.85rem 1.15rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--c-gold, #3b82f6)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    display: "block",
                    letterSpacing: "0.04em",
                  }}
                >
                  Bibit Utama #1
                </span>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-ink, #ffffff)" }}>{bibit1.name}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)", display: "block", marginTop: 2 }}>
                  {bibit1.collection} • {formatRupiah(bibit1.price_per_ml)}/ml • Stok Cabang:{" "}
                  <strong style={{ color: "#34d399" }}>{bibit1.stock_ml.toLocaleString("id-ID")} ml</strong>
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--c-gold-light, #60a5fa)" }}>
                  {bibit1Ml} ml
                </span>
                {hasBibit2 && (
                  <span style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", display: "block" }}>
                    ({100 - bibitSplitPercent}%)
                  </span>
                )}
              </div>
            </div>

            {/* Bibit #2 Section */}
            {hasBibit2 && (
              <div style={{ marginTop: "0.75rem" }}>
                {bibit2 ? (
                  <div
                    style={{
                      background: "var(--c-surface-2, #181e1c)",
                      border: "1px solid var(--c-border-mid)",
                      borderRadius: "12px",
                      padding: "0.85rem 1.15rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "#10b981",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          display: "block",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Bibit Campuran #2 (Layering)
                      </span>
                      <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-ink, #ffffff)" }}>
                        {bibit2.name}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)", display: "block", marginTop: 2 }}>
                        {bibit2.collection} • {formatRupiah(bibit2.price_per_ml)}/ml • Stok Cabang:{" "}
                        <strong style={{ color: "#34d399" }}>{bibit2.stock_ml.toLocaleString("id-ID")} ml</strong>
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#10b981" }}>
                          {bibit2Ml} ml
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", display: "block" }}>
                          ({bibitSplitPercent}%)
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          type="button"
                          onClick={() => setShowBibit2Picker(true)}
                          style={{
                            padding: "5px 10px",
                            background: "var(--c-surface-3, #1f2724)",
                            border: "1px solid var(--c-border)",
                            borderRadius: "8px",
                            color: "var(--c-ink)",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          Ganti
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBibit2(null);
                            setHasBibit2(false);
                          }}
                          title="Hapus Bibit #2"
                          style={{
                            padding: "5px 8px",
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            borderRadius: "8px",
                            color: "#f87171",
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "1.25rem",
                      borderRadius: "12px",
                      border: "1px dashed var(--c-gold, #3b82f6)",
                      textAlign: "center",
                      background: "var(--c-gold-dim, rgba(59, 130, 246, 0.06))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", color: "var(--c-ink-muted)" }}>
                      Bibit #2 belum dipilih. Pilih dari katalog:
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setHasBibit2(false);
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          border: "1px solid var(--c-border)",
                          color: "var(--c-ink-dim)",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBibit2Picker(true)}
                        style={{
                          padding: "6px 14px",
                          background: "var(--c-gold, #3b82f6)",
                          border: "none",
                          color: "#ffffff",
                          borderRadius: "8px",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Search size={14} />
                        <span>Pilih Bibit #2</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Slider Proporsi Bibit 1 vs Bibit 2 */}
                {bibit2 && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      background: "var(--c-surface-2, #181e1c)",
                      padding: "0.85rem 1.15rem",
                      borderRadius: "10px",
                      border: "1px solid var(--c-border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 8 }}>
                      <span style={{ color: "var(--c-gold-light, #60a5fa)", fontWeight: 600 }}>
                        {bibit1.name}: {100 - bibitSplitPercent}%
                      </span>
                      <span style={{ color: "#10b981", fontWeight: 600 }}>
                        {bibit2.name}: {bibitSplitPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={1}
                      value={bibitSplitPercent}
                      onChange={(e) => setBibitSplitPercent(parseInt(e.target.value, 10))}
                      style={{ width: "100%", accentColor: "var(--c-gold, #3b82f6)" }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Rasio Konsentrasi & Pelarut */}
          <div>
            <label
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--c-ink, #f0ede8)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: "0.75rem",
              }}
            >
              <Percent size={16} color="var(--c-gold, #3b82f6)" />
              3. Rasio Konsentrasi (Bibit vs Pelarut)
            </label>

            {/* 5 Preset buttons: EDT, EDP, Extrait, Murni, Custom */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem" }}>
              {[
                { id: "30/70", label: "30/70 EDT", desc: "30% Bibit" },
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
                      padding: "0.65rem 0.4rem",
                      borderRadius: "10px",
                      border: isSelected ? "1.5px solid var(--c-gold, #3b82f6)" : "1px solid var(--c-border)",
                      background: isSelected ? "var(--c-gold-dim, rgba(59, 130, 246, 0.18))" : "var(--c-surface-2, #181e1c)",
                      color: isSelected ? "var(--c-gold-light, #60a5fa)" : "var(--c-ink-muted)",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, display: "block" }}>{r.label}</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--c-ink-dim)" }}>{r.desc}</span>
                  </button>
                );
              })}
            </div>

            {ratioPreset === "custom" && (
              <div
                style={{
                  marginTop: "0.75rem",
                  background: "var(--c-surface-2, #181e1c)",
                  padding: "0.85rem 1.15rem",
                  borderRadius: "10px",
                  border: "1px solid var(--c-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 8 }}>
                  <span>
                    Persentase Bibit: <strong style={{ color: "var(--c-gold-light, #60a5fa)" }}>{customBibitPercent}%</strong>
                  </span>
                  <span>
                    Pelarut: <strong style={{ color: "var(--c-ink-muted)" }}>{100 - customBibitPercent}%</strong>
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={customBibitPercent}
                  onChange={(e) => setCustomBibitPercent(parseInt(e.target.value, 10))}
                  style={{ width: "100%", accentColor: "var(--c-gold, #3b82f6)" }}
                />
              </div>
            )}
          </div>

          {/* Section 4: AI Advisor Button & Box (Kontekstual: Hanya saat custom rasio ATAU bibit kedua aktif) */}
          {showAiAdvisor && (
            <div
              style={{
                background: "var(--c-surface-2, #181e1c)",
                border: "1px solid var(--c-border-mid)",
                borderRadius: "12px",
                padding: "0.85rem 1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Bot size={18} color="var(--c-gold, #3b82f6)" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink, #ffffff)" }}>
                    {hasBibit2 && bibit2 ? "AI Layering Advisor (Nove AI)" : "AI Ratio Advisor (Nove AI)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleConsultAi}
                  disabled={aiLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: "var(--c-gold-dim, rgba(59, 130, 246, 0.15))",
                    border: "1px solid var(--c-gold, #3b82f6)",
                    color: "var(--c-gold-light, #60a5fa)",
                  }}
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  <span>{aiLoading ? "Menganalisis..." : "Saran Racikan AI"}</span>
                </button>
              </div>

              {aiAdvice && (
                <p
                  style={{
                    marginTop: "0.6rem",
                    fontSize: "0.8rem",
                    color: "var(--c-ink, #f0ede8)",
                    lineHeight: 1.5,
                    marginBottom: 0,
                    fontStyle: "italic",
                    background: "rgba(0,0,0,0.3)",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    borderLeft: "2px solid var(--c-gold, #3b82f6)",
                  }}
                >
                  "{aiAdvice}"
                </p>
              )}
            </div>
          )}

          {/* Section 5: Rincian Kalkulasi Volume & Harga */}
          <div
            style={{
              background: "var(--c-surface-2, #181e1c)",
              border: "1px solid var(--c-border-mid)",
              borderRadius: "14px",
              padding: "1rem 1.25rem",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ color: "var(--c-ink-dim)" }}>Total Wadah:</span>
                <strong style={{ color: "var(--c-ink)", marginLeft: 6 }}>{totalCapacityMl} ml</strong>
              </div>
              <div>
                <span style={{ color: "var(--c-ink-dim)" }}>Total Bibit:</span>
                <strong style={{ color: "var(--c-gold-light, #60a5fa)", marginLeft: 6 }}>
                  {totalBibitMl} ml ({bibitRatioPercent}%)
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--c-ink-dim)" }}>Pelarut (Absolute):</span>
                <strong style={{ color: "#34d399", marginLeft: 6 }}>{totalSolventMl} ml (Gratis)</strong>
              </div>
              <div>
                <span style={{ color: "var(--c-ink-dim)" }}>Biaya Botol:</span>
                <strong style={{ color: "var(--c-ink)", marginLeft: 6 }}>{formatRupiah(bottlePrice)}</strong>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid var(--c-border)",
                paddingTop: "0.75rem",
              }}
            >
              <span style={{ fontSize: "0.9rem", color: "var(--c-ink-muted)" }}>Total Harga Racikan:</span>
              <span
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "var(--c-gold-light, #60a5fa)",
                  fontFamily: "var(--font-display, serif)",
                }}
              >
                {formatRupiah(totalPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--c-border)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            background: "var(--c-surface-1, #111614)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.65rem 1.25rem",
              background: "transparent",
              border: "1px solid var(--c-border)",
              color: "var(--c-ink-muted)",
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
              background: "linear-gradient(135deg, var(--c-gold, #3b82f6) 0%, #1e40af 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 6px 20px -4px rgba(59, 130, 246, 0.4)",
            }}
          >
            <span>Tambah ke Bill Kasir</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Sub-Modal: Centered Dialog Picker Bibit #2 */}
        {showBibit2Picker && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 300,
              padding: "1rem",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "540px",
                maxHeight: "82vh",
                background: "var(--c-surface-1, #111614)",
                border: "1px solid var(--c-border-mid)",
                borderRadius: "18px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 25px 60px rgba(0,0,0,0.9)",
              }}
            >
              {/* Header Picker */}
              <div
                style={{
                  padding: "1.25rem 1.5rem",
                  borderBottom: "1px solid var(--c-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Search size={18} color="var(--c-gold, #3b82f6)" />
                  <h3
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 600,
                      color: "var(--c-ink, #ffffff)",
                      margin: 0,
                      fontFamily: "var(--font-display, serif)",
                    }}
                  >
                    Pilih Bibit Campuran #2
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowBibit2Picker(false);
                    if (!bibit2) setHasBibit2(false);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "none",
                    color: "var(--c-ink-muted)",
                    cursor: "pointer",
                    padding: "6px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Filter Tabs & Search */}
              <div style={{ padding: "1rem 1.5rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Collection Filter Tabs */}
                <div style={{ display: "flex", gap: "6px" }}>
                  {[
                    { id: "all", label: "Semua" },
                    { id: "Global Parfume", label: "Global Parfume" },
                    { id: "Arabian Parfume", label: "Arabian Parfume" },
                  ].map((tab) => {
                    const isActive = bibit2Category === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setBibit2Category(tab.id as any)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          border: isActive ? "1px solid var(--c-gold, #3b82f6)" : "1px solid var(--c-border)",
                          background: isActive ? "var(--c-gold-dim, rgba(59, 130, 246, 0.15))" : "var(--c-surface-2)",
                          color: isActive ? "var(--c-gold-light, #60a5fa)" : "var(--c-ink-muted)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Ketik nama aroma bibit..."
                  value={bibit2Search}
                  onChange={(e) => setBibit2Search(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "var(--c-bg, #0a0c0b)",
                    border: "1px solid var(--c-border)",
                    borderRadius: "10px",
                    color: "var(--c-ink, #ffffff)",
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Bibits List */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "0.5rem 1.5rem 1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {filteredBibit2.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--c-ink-dim)", fontSize: "0.85rem" }}>
                    Tidak ada bibit yang cocok dengan pencarian.
                  </div>
                ) : (
                  filteredBibit2.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBibit2(b);
                        setShowBibit2Picker(false);
                      }}
                      style={{
                        padding: "0.8rem 1rem",
                        borderRadius: "10px",
                        background: "var(--c-surface-2, #181e1c)",
                        border: "1px solid var(--c-border)",
                        color: "var(--c-ink, #ffffff)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--c-gold, #3b82f6)";
                        e.currentTarget.style.transform = "translateX(2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--c-border)";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600, display: "block" }}>{b.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)" }}>
                          {b.collection} • Stok: <strong style={{ color: "#34d399" }}>{b.stock_ml.toLocaleString("id-ID")} ml</strong>
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--c-gold-light, #60a5fa)" }}>
                          {formatRupiah(b.price_per_ml)}/ml
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
