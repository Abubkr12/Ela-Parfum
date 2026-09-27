"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Sliders,
  Store,
  Check,
  Plus,
  Minus,
  FlaskConical,
  Droplets,
  Wind,
  Clock,
  ShieldCheck,
  Truck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";
import { useCart } from "@/lib/cart-context";
import { BibitData, BottleData } from "@/components/refill/types";
import { CartItem, formatRupiah } from "@/lib/types";

const GALLERY_IMAGES = [
  { url: "/images/bottles/preview/bottle-1.jpg", label: "Botol Casa — Silinder Amber Mewah" },
  { url: "/images/bottles/preview/bottle-2.jpg", label: "Botol Lacoste — Elegan Matte Black" },
  { url: "/images/bottles/preview/bottle-3.jpg", label: "Botol Dhermes — Kristal Kaca Tebal" },
  { url: "/images/bottles/preview/bottle-4.jpg", label: "Botol POT — Silinder Klasik Premium" },
  { url: "/images/bottles/preview/bottle-5.jpg", label: "Aplikasi Semprotan — Fine Mist Sprayer" },
];

const RATIOS: { id: "30/70" | "50/50" | "70/30" | "100/0"; name: string; desc: string; percent: number }[] = [
  { id: "30/70", name: "Eau De Toilette (3:7)", desc: "Aroma ringan & segar (3-4 jam)", percent: 0.3 },
  { id: "50/50", name: "Eau De Parfum (1:1)", desc: "Keseimbangan ideal ketahanan & tebaran (6-8 jam)", percent: 0.5 },
  { id: "70/30", name: "Extrait De Parfum (1:3)", desc: "Konsentrasi pekat & tahan lama (8-12 jam)", percent: 0.7 },
  { id: "100/0", name: "Elixir (Murni)", desc: "100% konsentrat murni tanpa pelarut (12+ jam)", percent: 1.0 },
];

export default function BibitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string) || "";
  const slug = decodeURIComponent(rawSlug).trim();

  const { addItem } = useCart();

  const [bibit, setBibit] = useState<BibitData | null>(null);
  const [bottles, setBottles] = useState<BottleData[]>([]);
  const [relatedBibits, setRelatedBibits] = useState<BibitData[]>([]);
  const [loading, setLoading] = useState(true);

  // Gallery Active Image
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Configuration States
  const [ratio, setRatio] = useState<"30/70" | "50/50" | "70/30" | "100/0">("50/50");
  const [useOwnBottle, setUseOwnBottle] = useState(false);
  const [ownBottleVolumeMl, setOwnBottleVolumeMl] = useState(30);
  const [selectedBottle, setSelectedBottle] = useState<BottleData | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submittingDirect, setSubmittingDirect] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/bibits");
        const data = await res.json();
        const allBibits: BibitData[] = data.bibits || [];
        const allBottles: BottleData[] = data.bottles || [];

        setBottles(allBottles);
        if (allBottles.length > 0) {
          setSelectedBottle(allBottles[0]);
        }

        // Find current bibit by slug or id
        const found = allBibits.find(
          (b) => b.slug === slug || b.id.toString() === slug || b.name.toLowerCase() === slug.toLowerCase()
        );

        if (found) {
          setBibit(found);
          // Pick related bibits in same collection
          const related = allBibits
            .filter((b) => b.id !== found.id && b.collection === found.collection)
            .slice(0, 4);
          setRelatedBibits(related);
        } else {
          setBibit(null);
        }
      } catch (err) {
        console.error("Gagal memuat detail bibit:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  // Calculations
  const ratioInfo = useMemo(() => RATIOS.find((r) => r.id === ratio) || RATIOS[1], [ratio]);
  const capacityMl = useOwnBottle ? ownBottleVolumeMl : (selectedBottle?.capacity_ml || 30);
  const bibitVolume = capacityMl * ratioInfo.percent;
  const solventVolume = ratio === "100/0" ? 0 : Math.max(0, capacityMl - bibitVolume);

  const pricePerMl = bibit?.price_per_ml || 1500;
  const bibitPrice = Math.round(bibitVolume * pricePerMl);
  const bottlePrice = useOwnBottle ? 0 : (selectedBottle?.price || 0);
  const unitPrice = bibitPrice + bottlePrice;
  const totalPrice = unitPrice * quantity;

  const buildCartItem = (): CartItem | null => {
    if (!bibit) return null;
    const ratioName =
      ratio === "100/0"
        ? "Elixir (Murni)"
        : ratio === "70/30"
        ? "Extrait de Parfum (1:3)"
        : ratio === "50/50"
        ? "Eau De Parfum (1:1)"
        : "Eau De Toilette (3:7)";
    const uniqueId = `refill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const adminRecipe = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRACIKAN PARFUM — ${capacityMl}ml (${ratioName})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nBibit ${bibit.name} (100%) : ${bibitVolume.toFixed(1)} ml\nPelarut Absolute : ${solventVolume.toFixed(1)} ml\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal Volume : ${capacityMl.toFixed(1)} ml`;

    return {
      id: uniqueId,
      itemType: "refill",
      perfumeName: `Refill ${bibit.name}`,
      sizeLabel: `${capacityMl}ml · ${ratioName}`,
      price: unitPrice,
      quantity: quantity,
      imageUrl: useOwnBottle
        ? GALLERY_IMAGES[0].url
        : selectedBottle?.image_url || GALLERY_IMAGES[0].url,
      familyName: bibit.collection || "Refill Bibit",
      refillData: {
        mode: "manual",
        customName: `Refill ${bibit.name}`,
        ratio: ratio,
        volumeMl: capacityMl,
        bottle: {
          id: useOwnBottle ? null : selectedBottle?.id,
          name: useOwnBottle
            ? `Botol Sendiri (${ownBottleVolumeMl}ml)`
            : selectedBottle?.name || "Botol Ela",
          capacity_ml: capacityMl,
          price: bottlePrice,
          image_url: selectedBottle?.image_url,
        },
        useOwnBottle: useOwnBottle,
        ownBottleVolumeMl: useOwnBottle ? ownBottleVolumeMl : undefined,
        bibits: [
          {
            id: bibit.id,
            name: bibit.name,
            volumeMl: bibitVolume,
            pricePerMl: pricePerMl,
          },
        ],
        adminRecipe: adminRecipe,
        intensity: bibit.intensity,
      },
    };
  };

  const handleAddToCart = () => {
    const item = buildCartItem();
    if (!item) return;

    addItem(item);
    toast.success("Berhasil ditambahkan ke keranjang!", {
      description: `${item.perfumeName} (${item.sizeLabel}) x${quantity}`,
      action: {
        label: "Lihat Keranjang",
        onClick: () => router.push("/keranjang"),
      },
    });
  };

  const handleDirectBuy = async () => {
    const item = buildCartItem();
    if (!item) return;

    setSubmittingDirect(true);
    try {
      addItem(item);
      router.push("/checkout");
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses checkout");
      setSubmittingDirect(false);
    }
  };

  if (loading) {
    return (
      <div className="customer-page" style={{ minHeight: "100vh" }}>
        <PageHeader />
        <div style={{ maxWidth: 1200, margin: "120px auto 60px", padding: "0 16px", textAlign: "center" }}>
          <div style={{ height: 32, width: 240, background: "var(--c-surface-2)", borderRadius: 8, margin: "0 auto 20px" }} />
          <div style={{ height: 400, background: "var(--c-surface-2)", borderRadius: 16 }} />
        </div>
        <Footer />
      </div>
    );
  }

  if (!bibit) {
    return (
      <div className="customer-page" style={{ minHeight: "100vh" }}>
        <PageHeader />
        <div style={{ maxWidth: 600, margin: "140px auto 80px", padding: "0 16px", textAlign: "center" }}>
          <FlaskConical size={64} style={{ color: "var(--c-ink-dim)", opacity: 0.4, marginBottom: 20 }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--c-ink)", marginBottom: 12 }}>
            Bibit Parfum Tidak Ditemukan
          </h1>
          <p style={{ color: "var(--c-ink-dim)", marginBottom: 24 }}>
            Varian bibit yang Anda cari mungkin telah dinonaktifkan atau tautan yang dimasukkan keliru.
          </p>
          <Link href="/katalog" className="btn btn-primary">
            Kembali ke Katalog Bibit
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="customer-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PageHeader />

      <main style={{ flex: 1, padding: "100px 0 64px" }}>
        <div style={{ width: "min(1240px, calc(100% - 32px))", margin: "0 auto" }}>
          
          {/* Breadcrumbs */}
          <nav style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 24, flexWrap: "wrap" }}>
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Beranda</Link>
            <ChevronRight size={14} />
            <Link href="/katalog" style={{ color: "inherit", textDecoration: "none" }}>Katalog Bibit</Link>
            <ChevronRight size={14} />
            <span style={{ color: "var(--c-gold)", fontWeight: 600 }}>{bibit.name}</span>
          </nav>

          {/* Product Detail Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 40, alignItems: "start", marginBottom: 64 }}>
            
            {/* Left: 5-Bottle Mockup Gallery */}
            <div>
              {/* Main Preview Image */}
              <div style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1/1",
                background: "#FFFFFF",
                borderRadius: "var(--r-xl, 20px)",
                border: "1px solid var(--c-border)",
                overflow: "hidden",
                boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
                marginBottom: 16,
              }}>
                <Image
                  src={GALLERY_IMAGES[activeImageIdx].url}
                  alt={GALLERY_IMAGES[activeImageIdx].label}
                  fill
                  style={{ objectFit: "contain", padding: 24 }}
                  priority
                />
                
                {/* Badge Overlay */}
                <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", padding: "8px 14px", borderRadius: "var(--r-md)", color: "#FFFFFF", fontSize: "0.8rem", fontWeight: 500, textAlign: "center" }}>
                  {GALLERY_IMAGES[activeImageIdx].label}
                </div>
              </div>

              {/* Thumbnails Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {GALLERY_IMAGES.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    style={{
                      aspectRatio: "1/1",
                      borderRadius: "var(--r-md)",
                      border: activeImageIdx === idx ? "2px solid var(--c-gold)" : "1px solid var(--c-border)",
                      background: "#FFFFFF",
                      overflow: "hidden",
                      padding: 4,
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.2s ease",
                      transform: activeImageIdx === idx ? "scale(1.04)" : "scale(1)",
                    }}
                  >
                    <Image
                      src={img.url}
                      alt={img.label}
                      fill
                      style={{ objectFit: "contain" }}
                    />
                  </button>
                ))}
              </div>

              {/* Feature Highlights */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: "var(--r-md)", background: "var(--c-surface-1)", border: "1px solid var(--c-border)" }}>
                  <ShieldCheck size={20} style={{ color: "var(--c-teal)", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.8rem", color: "var(--c-ink)" }}>100% Bibit Murni Tanpa Campuran</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: "var(--r-md)", background: "var(--c-surface-1)", border: "1px solid var(--c-border)" }}>
                  <Truck size={20} style={{ color: "var(--c-gold)", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.8rem", color: "var(--c-ink)" }}>Pengiriman Aman Seluruh Indonesia</span>
                </div>
              </div>
            </div>

            {/* Right: Info & Variant Selection */}
            <div>
              {/* Title & Badges */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: 100, background: "rgba(217, 119, 6, 0.15)", color: "var(--c-gold)", fontWeight: 700 }}>
                    {bibit.collection || "Bibit Parfum"}
                  </span>
                  <span style={{
                    fontSize: "0.8rem",
                    padding: "3px 10px",
                    borderRadius: 100,
                    background: bibit.intensity === "Strong" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                    color: bibit.intensity === "Strong" ? "#ef4444" : "#10b981",
                    fontWeight: 600,
                    border: "1px solid currentColor",
                  }}>
                    Intensitas: {bibit.intensity}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>
                    Accord: <strong>{bibit.main_accord}</strong>
                  </span>
                </div>

                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 2.6rem)", color: "var(--c-ink)", fontWeight: 700, margin: "0 0 12px" }}>
                  {bibit.name}
                </h1>

                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--c-gold)" }}>
                    {formatRupiah(pricePerMl)}
                  </span>
                  <span style={{ fontSize: "0.95rem", color: "var(--c-ink-dim)" }}>/ml bibit murni</span>
                </div>

                <p style={{ color: "var(--c-ink-muted)", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
                  Bibit konsentrat parfum berkualitas tinggi dengan karakter aroma {bibit.main_accord?.toLowerCase() || "istimewa"}. Dapat diracik dengan botol kemasan khas Ela Parfum atau botol Anda sendiri.
                </p>
              </div>

              {/* Fragrance Pyramid (Piramida Aroma) */}
              <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: 20, marginBottom: 28 }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Droplets size={16} style={{ color: "var(--c-gold)" }} />
                  Piramida Aroma (Fragrance Notes)
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Top Notes */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: "0.8rem", width: 75, fontWeight: 600, color: "var(--c-gold)", flexShrink: 0 }}>
                      Top Notes:
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Array.isArray(bibit.top_notes) && bibit.top_notes.length > 0 ? (
                        bibit.top_notes.map((n: any, idx: number) => (
                          <span key={idx} style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4, background: "var(--c-surface-2)", color: "var(--c-ink)" }}>
                            {typeof n === "string" ? n : n.name || ""}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>Fresh Opening Accord</span>
                      )}
                    </div>
                  </div>

                  {/* Middle Notes */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: "0.8rem", width: 75, fontWeight: 600, color: "var(--c-gold)", flexShrink: 0 }}>
                      Heart Notes:
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Array.isArray(bibit.middle_notes) && bibit.middle_notes.length > 0 ? (
                        bibit.middle_notes.map((n: any, idx: number) => (
                          <span key={idx} style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4, background: "var(--c-surface-2)", color: "var(--c-ink)" }}>
                            {typeof n === "string" ? n : n.name || ""}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>{bibit.main_accord}</span>
                      )}
                    </div>
                  </div>

                  {/* Base Notes */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: "0.8rem", width: 75, fontWeight: 600, color: "var(--c-gold)", flexShrink: 0 }}>
                      Base Notes:
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Array.isArray(bibit.base_notes) && bibit.base_notes.length > 0 ? (
                        bibit.base_notes.map((n: any, idx: number) => (
                          <span key={idx} style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4, background: "var(--c-surface-2)", color: "var(--c-ink)" }}>
                            {typeof n === "string" ? n : n.name || ""}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>Deep Musk & Amber Trails</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. Selector Rasio */}
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
                          background: isSelected ? "var(--glass-bg)" : "var(--c-surface-1)",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: isSelected ? "var(--c-gold)" : "var(--c-ink)" }}>
                            {r.id === "50/50" ? "EDP (1:1)" : r.id === "70/30" ? "Extrait (1:3)" : r.id === "100/0" ? "Elixir (Murni)" : "EDT (3:7)"}
                          </span>
                          {isSelected && <Check size={14} style={{ color: "var(--c-gold)" }} />}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)" }}>
                          {r.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Selector Botol */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--c-ink)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                  2. Pilihan Kemasan Botol
                </label>
                
                {/* Switcher Ours vs Own */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={() => setUseOwnBottle(false)}
                    style={{
                      padding: "10px",
                      borderRadius: "var(--r-md)",
                      border: !useOwnBottle ? "1.5px solid var(--c-gold)" : "1px solid var(--c-border)",
                      background: !useOwnBottle ? "var(--glass-bg)" : "var(--c-surface-1)",
                      color: !useOwnBottle ? "var(--c-gold)" : "var(--c-ink-dim)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Botol Ela Parfum
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseOwnBottle(true)}
                    style={{
                      padding: "10px",
                      borderRadius: "var(--r-md)",
                      border: useOwnBottle ? "1.5px solid #a855f7" : "1px solid var(--c-border)",
                      background: useOwnBottle ? "rgba(168, 85, 247, 0.1)" : "var(--c-surface-1)",
                      color: useOwnBottle ? "#a855f7" : "var(--c-ink-dim)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Bawa Botol Sendiri
                  </button>
                </div>

                {!useOwnBottle ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                    {bottles.map((b) => {
                      const isSelected = selectedBottle?.id === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBottle(b)}
                          style={{
                            padding: "10px 8px",
                            borderRadius: "var(--r-md)",
                            border: isSelected ? "1.5px solid var(--c-gold)" : "1px solid var(--c-border)",
                            background: isSelected ? "var(--glass-bg)" : "var(--c-surface-1)",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: isSelected ? "var(--c-gold)" : "var(--c-ink)" }}>
                            {b.capacity_ml}ml
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", margin: "2px 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {b.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--c-ink)" }}>
                            {formatRupiah(b.price)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Slider Botol Sendiri */
                  <div style={{ background: "rgba(168, 85, 247, 0.05)", border: "1px solid rgba(168, 85, 247, 0.25)", padding: "16px", borderRadius: "var(--r-md)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 700, color: "#a855f7" }}>
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

              {/* Rincian Harga Satuan */}
              <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", padding: "16px", borderRadius: "var(--r-md)", marginBottom: 24 }}>
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
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-ink)" }}>Harga Satuan</span>
                  <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--c-gold)" }}>{formatRupiah(unitPrice)}</span>
                </div>
              </div>

              {/* Actions & Quantity */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {/* Stepper */}
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", background: "var(--c-surface-1)", padding: 6 }}>
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
                    <span style={{ width: 44, textAlign: "center", fontWeight: 700, fontSize: "1rem", color: "var(--c-ink)" }}>
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

                  {/* Tambah ke Keranjang */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="btn btn-secondary"
                    style={{
                      flex: 1,
                      padding: "16px 20px",
                      borderRadius: "var(--r-md)",
                      fontWeight: 700,
                      fontSize: "1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      border: "1.5px solid var(--c-gold)",
                      color: "var(--c-gold)",
                    }}
                  >
                    <ShoppingBag size={18} />
                    <span>+ Tambah ke Keranjang</span>
                  </button>
                </div>

                {/* Beli Sekarang (Direct Checkout) */}
                <button
                  type="button"
                  onClick={handleDirectBuy}
                  disabled={submittingDirect}
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    padding: "16px 24px",
                    borderRadius: "var(--r-md)",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <span>Beli Sekarang ({formatRupiah(totalPrice)})</span>
                  <ArrowRight size={18} />
                </button>
              </div>

            </div>

          </div>

          {/* Related Bibits Section */}
          {relatedBibits.length > 0 && (
            <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 48, marginTop: 48 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>Koleksi Serupa</div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--c-ink)", margin: 0 }}>
                    Aroma Lain di {bibit.collection}
                  </h2>
                </div>
                <Link href="/katalog" style={{ color: "var(--c-gold)", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}>
                  Lihat Semua Bibit &rarr;
                </Link>
              </div>

              <div className="perfume-grid">
                {relatedBibits.map((rb) => {
                  const previewImg = GALLERY_IMAGES[Math.abs((rb.id - 1) % GALLERY_IMAGES.length)].url;
                  return (
                    <Link href={`/bibit/${rb.slug}`} key={rb.id} style={{ textDecoration: "none", color: "inherit" }}>
                      <article className="perfume-card">
                        <div className="perfume-card__thumb" style={{ background: "#FFFFFF", position: "relative", overflow: "hidden" }}>
                          <Image
                            src={previewImg}
                            alt={rb.name}
                            fill
                            style={{ objectFit: "contain", padding: 16 }}
                          />
                        </div>
                        <div className="perfume-card__body">
                          <div style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", marginBottom: 4 }}>
                            {rb.main_accord}
                          </div>
                          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-ink)", margin: "0 0 6px" }}>
                            {rb.name}
                          </h3>
                          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--c-gold)" }}>
                            {formatRupiah(rb.price_per_ml || 1500)} /ml
                          </div>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
