"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { PosBibitItem, PosBottleItem, PosBillItem } from "../actions";
import {
  X,
  Wand2,
  Droplets,
  Plus,
  Trash2,
  FlaskConical,
  Wine,
  Percent,
  Search,
  Bot,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { formatRupiah } from "@/lib/types";
import { useModalFocusTrap } from "./useModalFocusTrap";

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
  const [containerType, setContainerType] = useState<"ela_bottle" | "own_bottle">(
    bottles.length > 0 ? "ela_bottle" : "own_bottle"
  );
  const [selectedBottleId, setSelectedBottleId] = useState<number>(bottles[0]?.id ?? 0);
  const [ownBottleCapacity, setOwnBottleCapacity] = useState<number>(30);

  const [bibit1] = useState<PosBibitItem>(initialBibit);
  const [hasBibit2, setHasBibit2] = useState<boolean>(false);
  const [bibit2, setBibit2] = useState<PosBibitItem | null>(null);
  const [bibit2Search, setBibit2Search] = useState<string>("");
  const [bibit2Category, setBibit2Category] = useState<"all" | "Global Parfume" | "Arabian Parfume">("all");
  const [showBibit2Picker, setShowBibit2Picker] = useState<boolean>(false);
  const [bibitSplitPercent, setBibitSplitPercent] = useState<number>(50);

  const [ratioPreset, setRatioPreset] = useState<"100/0" | "70/30" | "50/50" | "30/70" | "custom">("50/50");
  const [customBibitPercent, setCustomBibitPercent] = useState<number>(50);

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  const modalCardRef = useRef<HTMLDivElement>(null);
  const bibit2CardRef = useRef<HTMLDivElement>(null);
  const bibit2SearchRef = useRef<HTMLInputElement>(null);

  const closeBibit2Picker = useCallback(() => {
    setShowBibit2Picker(false);
    if (!bibit2) setHasBibit2(false);
  }, [bibit2]);

  useModalFocusTrap(true, modalCardRef, {
    onEscape: onClose,
  });

  useModalFocusTrap(showBibit2Picker, bibit2CardRef, {
    onEscape: closeBibit2Picker,
  });

  // Autofocus search only on desktop so mobile keyboards do not cover picker results.
  useEffect(() => {
    if (showBibit2Picker && typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      bibit2SearchRef.current?.focus();
    }
  }, [showBibit2Picker]);

  const selectedBottle = useMemo(() => {
    return bottles.find((b) => b.id === selectedBottleId) || bottles[0] || null;
  }, [bottles, selectedBottleId]);

  const totalCapacityMl = containerType === "ela_bottle" ? selectedBottle?.capacity_ml || 30 : Math.max(1, ownBottleCapacity);

  const bibitRatioPercent = useMemo(() => {
    if (ratioPreset === "100/0") return 100;
    if (ratioPreset === "70/30") return 70;
    if (ratioPreset === "50/50") return 50;
    if (ratioPreset === "30/70") return 30;
    return Math.min(100, Math.max(1, customBibitPercent));
  }, [ratioPreset, customBibitPercent]);

  const totalBibitMl = parseFloat(((totalCapacityMl * bibitRatioPercent) / 100).toFixed(1));
  const totalSolventMl = parseFloat(Math.max(0, totalCapacityMl - totalBibitMl).toFixed(1));

  const bibit1Ml = useMemo(() => {
    if (!hasBibit2 || !bibit2) return totalBibitMl;
    return parseFloat(((totalBibitMl * (100 - bibitSplitPercent)) / 100).toFixed(1));
  }, [hasBibit2, bibit2, totalBibitMl, bibitSplitPercent]);

  const bibit2Ml = useMemo(() => {
    if (!hasBibit2 || !bibit2) return 0;
    return parseFloat(((totalBibitMl * bibitSplitPercent) / 100).toFixed(1));
  }, [hasBibit2, bibit2, totalBibitMl, bibitSplitPercent]);

  const bottlePrice = containerType === "ela_bottle" ? selectedBottle?.price || 0 : 0;
  const bibit1Price = bibit1Ml * bibit1.price_per_ml;
  const bibit2Price = bibit2 ? bibit2Ml * bibit2.price_per_ml : 0;
  const totalPrice = Math.round(bottlePrice + bibit1Price + bibit2Price);

  const filteredBibit2 = useMemo(() => {
    let list = allBibits.filter((b) => b.id !== bibit1.id);

    if (bibit2Category === "Global Parfume") {
      list = list.filter((b) => (b.collection || "").toLowerCase().includes("global"));
    } else if (bibit2Category === "Arabian Parfume") {
      list = list.filter(
        (b) =>
          (b.collection || "").toLowerCase().includes("arab") ||
          (b.collection || "").toLowerCase().includes("timur")
      );
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

  const showAiAdvisor = ratioPreset === "custom" || (hasBibit2 && !!bibit2);
  const cannotAddWithoutBottle = containerType === "ela_bottle" && !selectedBottle;

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
        body: JSON.stringify({
          messages: [{ role: "user", text: prompt }],
        }),
      });
      const data = await res.json();
      if (data?.text) {
        setAiAdvice(data.text);
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

  const handleAdd = () => {
    if (containerType === "ela_bottle" && !selectedBottle) return;

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

    const bottleLabel =
      containerType === "ela_bottle" && selectedBottle
        ? selectedBottle.name
        : `Botol Sendiri (${totalCapacityMl}ml)`;

    const title = hasBibit2 && bibit2 ? `Racik: ${bibit1.name} + ${bibit2.name}` : `Racik: ${bibit1.name}`;
    const subtitle = `${bottleLabel} • Rasio ${ratioLabel} • Bibit ${totalBibitMl}ml, Pelarut ${totalSolventMl}ml`;

    const bibitsList = [
      { id: bibit1.id, name: bibit1.name, volumeMl: bibit1Ml, pricePerMl: bibit1.price_per_ml },
    ];
    if (hasBibit2 && bibit2) {
      bibitsList.push({ id: bibit2.id, name: bibit2.name, volumeMl: bibit2Ml, pricePerMl: bibit2.price_per_ml });
    }

    const adminRecipe = `RESEP: [${bottleLabel}] Rasio: ${ratioLabel} | Bibit: ${bibitsList
      .map((b) => `${b.name} (${b.volumeMl}ml)`)
      .join(", ")} | Pelarut: ${totalSolventMl}ml`;

    const billItem: PosBillItem = {
      type: "refill",
      title,
      subtitle,
      price: totalPrice,
      quantity: 1,
      subtotal: totalPrice,
      meta: {
        bottleId: containerType === "ela_bottle" && selectedBottle ? selectedBottle.id : null,
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
      className="pos-modal-overlay"
      style={{ zIndex: 200 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-mix-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={modalCardRef} tabIndex={-1} className="pos-modal-card pos-mix-modal-card">
        <div
          className="pos-modal-header"
          style={{
            background: "linear-gradient(90deg, var(--c-gold-dim, rgba(59, 130, 246, 0.1)) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
            <div
              aria-hidden="true"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "var(--c-gold-dim, rgba(59, 130, 246, 0.12))",
                border: "1px solid var(--c-gold, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--pos-accent-text)",
                flexShrink: 0,
              }}
            >
              <FlaskConical size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2
                id="pos-mix-modal-title"
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--c-ink)",
                  fontFamily: "var(--font-display, serif)",
                  letterSpacing: "0.01em",
                  wordBreak: "break-word",
                }}
              >
                Form Racik Kasir: {bibit1.name}
              </h2>
              <span style={{ fontSize: "0.8rem", color: "var(--pos-muted)", display: "block" }}>
                Koleksi {bibit1.collection} • {formatRupiah(bibit1.price_per_ml)}/ml • Stok Cabang:{" "}
                <strong style={{ color: "var(--c-ink)" }}>{bibit1.stock_ml.toLocaleString("id-ID")} ml</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form racik"
            className="pos-modal-close-btn"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="pos-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
          <div>
            <div className="pos-mix-section-head">
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--c-ink)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Wine size={16} aria-hidden="true" color="var(--pos-accent-text)" />
                1. Pilih Wadah / Kemasan Botol
              </span>
              <div className="pos-mix-toggle-row" role="group" aria-label="Jenis wadah botol">
                <button
                  type="button"
                  disabled={bottles.length === 0}
                  onClick={() => setContainerType("ela_bottle")}
                  aria-pressed={containerType === "ela_bottle"}
                  className={`pos-mix-toggle-btn ${containerType === "ela_bottle" ? "is-active" : ""}`}
                >
                  Botol Ela Parfum
                </button>
                <button
                  type="button"
                  onClick={() => setContainerType("own_bottle")}
                  aria-pressed={containerType === "own_bottle"}
                  className={`pos-mix-toggle-btn ${containerType === "own_bottle" ? "is-active" : ""}`}
                >
                  Bawa Botol Sendiri
                </button>
              </div>
            </div>

            {containerType === "ela_bottle" ? (
              bottles.length === 0 ? (
                <div
                  style={{
                    background: "var(--c-surface-2, #181e1c)",
                    padding: "1rem 1.25rem",
                    borderRadius: "12px",
                    border: "1px solid var(--pos-border-control)",
                    fontSize: "0.85rem",
                    color: "var(--pos-muted)",
                  }}
                >
                  Belum ada stok botol Ela Parfum tersedia di cabang ini. Gunakan opsi Bawa Botol Sendiri.
                </div>
              ) : (
                <div className="pos-mix-bottles-grid">
                  {bottles.map((b) => {
                    const isSelected = selectedBottle?.id === b.id;
                    const bottleStock = b.stock ?? (b as any).stock_qty ?? 0;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBottleId(b.id)}
                        aria-pressed={isSelected}
                        className={`pos-mix-bottle-btn ${isSelected ? "is-selected" : ""}`}
                      >
                        <span className="pos-mix-bottle-row">
                          <span
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              color: isSelected ? "var(--pos-accent-text)" : "var(--c-ink)",
                            }}
                          >
                            {b.capacity_ml}ml
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--pos-muted)" }}>
                            {formatRupiah(b.price)}
                          </span>
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--c-ink)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            width: "100%",
                            display: "block",
                          }}
                        >
                          {b.name}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: bottleStock < 10 ? "var(--pos-danger)" : "var(--pos-success)",
                            fontWeight: 600,
                            display: "block",
                          }}
                        >
                          Stok: {bottleStock} pcs
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <div
                className="pos-mix-own-bottle"
                style={{
                  background: "var(--c-surface-2, #181e1c)",
                  padding: "1rem 1.25rem",
                  borderRadius: "12px",
                  border: "1px solid var(--c-border)",
                }}
              >
                <div>
                  <label
                    htmlFor="pos-own-bottle-capacity"
                    style={{ fontSize: "0.85rem", color: "var(--pos-muted)", display: "block", marginBottom: 6 }}
                  >
                    Kapasitas Botol Pelanggan (ml):
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <input
                      id="pos-own-bottle-capacity"
                      type="number"
                      min={1}
                      max={1000}
                      value={ownBottleCapacity}
                      onChange={(e) => setOwnBottleCapacity(parseInt(e.target.value, 10) || 1)}
                      className="pos-text-input"
                      style={{
                        width: "120px",
                        padding: "0.5rem 0.75rem",
                        border: "1px solid var(--c-gold, #3b82f6)",
                        fontSize: "1rem",
                        fontWeight: 700,
                      }}
                    />
                    <span style={{ fontSize: "0.85rem", color: "var(--pos-muted)" }}>Mililiter (ml)</span>
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    background: "var(--pos-soft-success-bg)",
                    border: "1px solid var(--pos-soft-success-border)",
                    color: "var(--pos-success)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                  }}
                >
                  Harga Wadah: Rp 0 (Gratis)
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="pos-mix-section-head">
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--c-ink)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Droplets size={16} aria-hidden="true" color="var(--pos-accent-text)" />
                2. Komposisi Bibit Parfum
              </span>

              {!hasBibit2 ? (
                <button
                  type="button"
                  onClick={() => {
                    setHasBibit2(true);
                    setShowBibit2Picker(true);
                  }}
                  className="pos-mix-toggle-btn is-active"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>Mix Bibit ke-2 (Layering)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setHasBibit2(false);
                    setBibit2(null);
                  }}
                  className="pos-mix-toggle-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    border: "1px solid var(--pos-soft-danger-border)",
                    background: "var(--pos-soft-danger-bg)",
                    color: "var(--pos-danger)",
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>Batal Campur Bibit #2</span>
                </button>
              )}
            </div>

            <div
              style={{
                background: "var(--c-surface-2, #181e1c)",
                border: "1px solid var(--c-border)",
                borderRadius: "12px",
                padding: "0.85rem 1.15rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--pos-accent-text)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    display: "block",
                    letterSpacing: "0.04em",
                  }}
                >
                  Bibit Utama #1
                </span>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-ink)" }}>{bibit1.name}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--pos-muted)", display: "block", marginTop: 2 }}>
                  {bibit1.collection} • {formatRupiah(bibit1.price_per_ml)}/ml • Stok Cabang:{" "}
                  <strong style={{ color: "var(--pos-success)" }}>{bibit1.stock_ml.toLocaleString("id-ID")} ml</strong>
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--pos-accent-text)" }}>
                  {bibit1Ml} ml
                </span>
                {hasBibit2 && (
                  <span style={{ fontSize: "0.75rem", color: "var(--pos-muted)", display: "block" }}>
                    ({100 - bibitSplitPercent}%)
                  </span>
                )}
              </div>
            </div>

            {hasBibit2 && (
              <div style={{ marginTop: "0.75rem" }}>
                {bibit2 ? (
                  <div
                    className="pos-mix-bibit2-card"
                    style={{
                      background: "var(--c-surface-2, #181e1c)",
                      border: "1px solid var(--c-border-mid)",
                      borderRadius: "12px",
                      padding: "0.85rem 1.15rem",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--pos-success)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          display: "block",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Bibit Campuran #2 (Layering)
                      </span>
                      <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-ink)" }}>{bibit2.name}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--pos-muted)", display: "block", marginTop: 2 }}>
                        {bibit2.collection} • {formatRupiah(bibit2.price_per_ml)}/ml • Stok Cabang:{" "}
                        <strong style={{ color: "var(--pos-success)" }}>
                          {bibit2.stock_ml.toLocaleString("id-ID")} ml
                        </strong>
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--pos-success)" }}>
                          {bibit2Ml} ml
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--pos-muted)", display: "block" }}>
                          ({bibitSplitPercent}%)
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => setShowBibit2Picker(true)}
                          className="pos-mix-toggle-btn"
                          style={{ color: "var(--c-ink)" }}
                        >
                          Ganti
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBibit2(null);
                            setHasBibit2(false);
                          }}
                          aria-label="Hapus Bibit ke-2"
                          title="Hapus Bibit ke-2"
                          className="pos-mix-remove-btn"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="pos-mix-bibit2-empty"
                    style={{
                      padding: "1rem 1.15rem",
                      borderRadius: "12px",
                      border: "1px dashed var(--c-gold, #3b82f6)",
                      background: "var(--c-gold-dim, rgba(59, 130, 246, 0.06))",
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", color: "var(--pos-muted)" }}>
                      Bibit #2 belum dipilih. Pilih dari katalog:
                    </span>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setHasBibit2(false);
                        }}
                        className="pos-mix-toggle-btn"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBibit2Picker(true)}
                        className="pos-mix-toggle-btn"
                        style={{
                          background: "var(--pos-accent-bg)",
                          border: "none",
                          color: "#ffffff",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Search size={14} aria-hidden="true" />
                        <span>Pilih Bibit #2</span>
                      </button>
                    </div>
                  </div>
                )}

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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        marginBottom: 8,
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ color: "var(--pos-accent-text)", fontWeight: 600 }}>
                        {bibit1.name}: {100 - bibitSplitPercent}%
                      </span>
                      <span style={{ color: "var(--pos-success)", fontWeight: 600 }}>
                        {bibit2.name}: {bibitSplitPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Proporsi perbandingan bibit pertama dan kedua"
                      min={10}
                      max={90}
                      step={1}
                      value={bibitSplitPercent}
                      onChange={(e) => setBibitSplitPercent(parseInt(e.target.value, 10))}
                      className="pos-range-input"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--c-ink)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: "0.75rem",
              }}
            >
              <Percent size={16} aria-hidden="true" color="var(--pos-accent-text)" />
              3. Rasio Konsentrasi (Bibit vs Pelarut)
            </span>

            <div className="pos-mix-ratios" role="group" aria-label="Preset rasio konsentrasi">
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
                    aria-pressed={isSelected}
                    className={`pos-mix-preset-btn ${isSelected ? "is-selected" : ""} ${
                      r.id === "custom" ? "pos-mix-ratio-custom" : ""
                    }`}
                  >
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, display: "block" }}>{r.label}</span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: isSelected ? "var(--pos-accent-text)" : "var(--pos-muted)",
                      }}
                    >
                      {r.desc}
                    </span>
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
                    Persentase Bibit: <strong style={{ color: "var(--pos-accent-text)" }}>{customBibitPercent}%</strong>
                  </span>
                  <span>
                    Pelarut: <strong style={{ color: "var(--pos-muted)" }}>{100 - customBibitPercent}%</strong>
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Persentase bibit custom"
                  min={1}
                  max={100}
                  step={1}
                  value={customBibitPercent}
                  onChange={(e) => setCustomBibitPercent(parseInt(e.target.value, 10))}
                  className="pos-range-input"
                />
              </div>
            )}
          </div>

          {showAiAdvisor && (
            <div
              style={{
                background: "var(--c-surface-2, #181e1c)",
                border: "1px solid var(--c-border-mid)",
                borderRadius: "12px",
                padding: "0.85rem 1rem",
              }}
            >
              <div className="pos-mix-ai-head">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Bot size={18} aria-hidden="true" color="var(--pos-accent-text)" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink)" }}>
                    {hasBibit2 && bibit2 ? "AI Layering Advisor (Scent AI)" : "AI Ratio Advisor (Scent AI)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleConsultAi}
                  disabled={aiLoading}
                  className="pos-mix-toggle-btn is-active"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {aiLoading ? (
                    <Loader2 size={13} aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Wand2 size={13} aria-hidden="true" />
                  )}
                  <span>{aiLoading ? "Menganalisis..." : "Saran Racikan AI"}</span>
                </button>
              </div>

              {aiAdvice && (
                <p
                  style={{
                    marginTop: "0.75rem",
                    fontSize: "0.82rem",
                    color: "var(--c-ink)",
                    lineHeight: 1.5,
                    marginBottom: 0,
                    fontStyle: "italic",
                    background: "var(--c-surface-3, rgba(0,0,0,0.3))",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    borderLeft: "2px solid var(--c-gold, #3b82f6)",
                  }}
                >
                  &ldquo;{aiAdvice}&rdquo;
                </p>
              )}
            </div>
          )}

          <div
            style={{
              background: "var(--c-surface-2, #181e1c)",
              border: "1px solid var(--c-border-mid)",
              borderRadius: "14px",
              padding: "1rem 1.25rem",
            }}
          >
            <div className="pos-mix-summary-grid">
              <div className="pos-mix-summary-cell">
                <span style={{ color: "var(--pos-muted)" }}>Total Wadah</span>
                <strong style={{ color: "var(--c-ink)" }}>{totalCapacityMl} ml</strong>
              </div>
              <div className="pos-mix-summary-cell">
                <span style={{ color: "var(--pos-muted)" }}>Total Bibit</span>
                <strong style={{ color: "var(--pos-accent-text)" }}>
                  {totalBibitMl} ml ({bibitRatioPercent}%)
                </strong>
              </div>
              <div className="pos-mix-summary-cell">
                <span style={{ color: "var(--pos-muted)" }}>Pelarut (Absolute)</span>
                <strong style={{ color: "var(--pos-success)" }}>{totalSolventMl} ml (Gratis)</strong>
              </div>
              <div className="pos-mix-summary-cell">
                <span style={{ color: "var(--pos-muted)" }}>Biaya Botol</span>
                <strong style={{ color: "var(--c-ink)" }}>{formatRupiah(bottlePrice)}</strong>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid var(--c-border)",
                paddingTop: "0.75rem",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.9rem", color: "var(--pos-muted)" }}>Total Harga Racikan:</span>
              <span
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "var(--pos-accent-text)",
                  fontFamily: "var(--font-display, serif)",
                }}
              >
                {formatRupiah(totalPrice)}
              </span>
            </div>
          </div>
        </div>

        <div className="pos-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="pos-btn-secondary"
            style={{ fontSize: "0.875rem" }}
          >
            Batal
          </button>
          <button
            type="button"
            disabled={cannotAddWithoutBottle}
            onClick={handleAdd}
            className="pos-btn-primary"
            style={{
              padding: "0.65rem 1.35rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              opacity: cannotAddWithoutBottle ? 0.5 : 1,
              boxShadow: "0 6px 20px -4px rgba(37, 99, 235, 0.4)",
            }}
          >
            <span>Tambah ke Bill Kasir</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>

        {showBibit2Picker && (
          <div
            className="pos-modal-overlay"
            style={{ zIndex: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-bibit2-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeBibit2Picker();
            }}
          >
            <div ref={bibit2CardRef} tabIndex={-1} className="pos-modal-card pos-bibit2-modal-card">
              <div className="pos-modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Search size={18} aria-hidden="true" color="var(--pos-accent-text)" />
                  <h3
                    id="pos-bibit2-title"
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 600,
                      color: "var(--c-ink)",
                      margin: 0,
                      fontFamily: "var(--font-display, serif)",
                    }}
                  >
                    Pilih Bibit Campuran #2
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeBibit2Picker}
                  aria-label="Tutup pilihan bibit kedua"
                  className="pos-modal-close-btn"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <div
                style={{
                  padding: "0.9rem 1.25rem 0.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  flexShrink: 0,
                }}
              >
                <div className="pos-bibit2-tabs" role="group" aria-label="Filter koleksi bibit kedua">
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
                        aria-pressed={isActive}
                        className={`pos-bibit2-tab ${isActive ? "is-active" : ""}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <input
                  ref={bibit2SearchRef}
                  type="text"
                  aria-label="Ketik nama aroma bibit kedua"
                  placeholder="Ketik nama aroma bibit..."
                  value={bibit2Search}
                  onChange={(e) => setBibit2Search(e.target.value)}
                  className="pos-text-input"
                />
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  padding: "0.5rem 1.25rem 1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {filteredBibit2.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--pos-muted)", fontSize: "0.85rem" }}>
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
                      className="pos-card pos-card--bibit pos-bibit2-row"
                    >
                      <span style={{ minWidth: 0, display: "block", textAlign: "left" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600, display: "block", color: "var(--c-ink)" }}>
                          {b.name}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--pos-muted)", display: "block" }}>
                          {b.collection} • Stok:{" "}
                          <strong style={{ color: "var(--pos-success)" }}>
                            {b.stock_ml.toLocaleString("id-ID")} ml
                          </strong>
                        </span>
                      </span>
                      <span style={{ textAlign: "right", flexShrink: 0, display: "block" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--pos-accent-text)" }}>
                          {formatRupiah(b.price_per_ml)}/ml
                        </span>
                      </span>
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
