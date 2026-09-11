"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  Clock,
  Droplets,
  Grid3X3,
  Heart,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  Wind,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";
import { useCart } from "@/lib/cart-context";
import { getSupabase } from "@/lib/supabase";
import {
  formatRupiah,
  getMinPrice,
  getSizeStock,
  type Perfume,
  type PerfumeSize,
  type ScentFamily,
} from "@/lib/types";

// Fallback mock data when Supabase is empty
const MOCK_FAMILIES: ScentFamily[] = [
  { id: 1, name: "fresh" as const, label: "Fresh", description: null, color: "#4ade80", sort_order: 1 },
  { id: 2, name: "floral" as const, label: "Floral", description: null, color: "#f472b6", sort_order: 2 },
  { id: 3, name: "woody" as const, label: "Woody", description: null, color: "#a78bfa", sort_order: 3 },
  { id: 4, name: "citrus" as const, label: "Citrus", description: null, color: "#fbbf24", sort_order: 4 },
  { id: 5, name: "sweet" as const, label: "Sweet", description: null, color: "#fb923c", sort_order: 5 },
  { id: 6, name: "aquatic" as const, label: "Aquatic", description: null, color: "#38bdf8", sort_order: 6 },
  { id: 7, name: "spicy" as const, label: "Spicy", description: null, color: "#ef4444", sort_order: 7 },
  { id: 8, name: "musky" as const, label: "Musky", description: null, color: "#a855f7", sort_order: 8 },
];

const MOCK_PERFUMES: (Perfume & { sizes: PerfumeSize[] })[] = [
  {
    id: 1, name: "Velvet Rose Musk", slug: "velvet-rose-musk", collection: "Signature Mix",
    family_id: 2, mood: "Romantis, bersih, feminin", description: "Perpaduan rose dan white musk yang elegan.",
    full_description: null, notes: ["Rose", "White musk", "Lychee", "Soft amber"],
    strength: "Medium", longevity: "6-8 jam", usage_guide: null, image_url: null, images: [],
    is_active: true, is_featured: true, created_at: "", updated_at: "",
    sizes: [
      { id: 1, perfume_id: 1, size_ml: 10, size_label: "10ml", price: 15000, stock: 20, is_active: true },
      { id: 2, perfume_id: 1, size_ml: 30, size_label: "30ml", price: 35000, stock: 42, is_active: true },
      { id: 3, perfume_id: 1, size_ml: 50, size_label: "50ml", price: 52000, stock: 15, is_active: true },
    ],
  },
  {
    id: 2, name: "Citrus Neroli Clean", slug: "citrus-neroli-clean", collection: "Fresh Daily",
    family_id: 4, mood: "Segar, rapi, ringan", description: "Kesegaran neroli dan bergamot untuk daily wear.",
    full_description: null, notes: ["Bergamot", "Neroli", "Green tea", "Clean musk"],
    strength: "Soft", longevity: "4-6 jam", usage_guide: null, image_url: null, images: [],
    is_active: true, is_featured: true, created_at: "", updated_at: "",
    sizes: [
      { id: 4, perfume_id: 2, size_ml: 10, size_label: "10ml", price: 14000, stock: 18, is_active: true },
      { id: 5, perfume_id: 2, size_ml: 30, size_label: "30ml", price: 32000, stock: 35, is_active: true },
      { id: 6, perfume_id: 2, size_ml: 50, size_label: "50ml", price: 48000, stock: 12, is_active: true },
    ],
  },
  {
    id: 3, name: "Noir Oud Reserve", slug: "noir-oud-reserve", collection: "Premium Blend",
    family_id: 3, mood: "Mewah, bold, dewasa", description: "Karakter oud yang dalam dan patchouli yang kaya.",
    full_description: null, notes: ["Oud", "Saffron", "Patchouli", "Dark vanilla"],
    strength: "Strong", longevity: "8-10 jam", usage_guide: null, image_url: null, images: [],
    is_active: true, is_featured: false, created_at: "", updated_at: "",
    sizes: [
      { id: 7, perfume_id: 3, size_ml: 10, size_label: "10ml", price: 22000, stock: 10, is_active: true },
      { id: 8, perfume_id: 3, size_ml: 30, size_label: "30ml", price: 58000, stock: 18, is_active: true },
      { id: 9, perfume_id: 3, size_ml: 50, size_label: "50ml", price: 85000, stock: 8, is_active: true },
    ],
  },
  {
    id: 4, name: "Ocean Linen Mist", slug: "ocean-linen-mist", collection: "Clean Fresh",
    family_id: 6, mood: "Sejuk, bersih, effortless", description: "Aroma linen segar dengan sentuhan laut.",
    full_description: null, notes: ["Sea salt", "Linen", "Lavender", "Soft woods"],
    strength: "Medium", longevity: "5-7 jam", usage_guide: null, image_url: null, images: [],
    is_active: true, is_featured: true, created_at: "", updated_at: "",
    sizes: [
      { id: 10, perfume_id: 4, size_ml: 10, size_label: "10ml", price: 14000, stock: 15, is_active: true },
      { id: 11, perfume_id: 4, size_ml: 30, size_label: "30ml", price: 34000, stock: 28, is_active: true },
      { id: 12, perfume_id: 4, size_ml: 50, size_label: "50ml", price: 50000, stock: 10, is_active: true },
    ],
  },
  {
    id: 5, name: "Vanilla Skin Glow", slug: "vanilla-skin-glow", collection: "Comfort Mix",
    family_id: 5, mood: "Manis, hangat, dekat di kulit", description: "Vanilla gourmand yang warm dan nyaman.",
    full_description: null, notes: ["Vanilla", "Caramel", "Milk accord", "Skin musk"],
    strength: "Medium", longevity: "6-8 jam", usage_guide: null, image_url: null, images: [],
    is_active: true, is_featured: false, created_at: "", updated_at: "",
    sizes: [
      { id: 13, perfume_id: 5, size_ml: 10, size_label: "10ml", price: 16000, stock: 14, is_active: true },
      { id: 14, perfume_id: 5, size_ml: 30, size_label: "30ml", price: 37000, stock: 31, is_active: true },
      { id: 15, perfume_id: 5, size_ml: 50, size_label: "50ml", price: 55000, stock: 9, is_active: true },
    ],
  },
  {
    id: 6, name: "Spiced Amber Club", slug: "spiced-amber-club", collection: "Evening Mix",
    family_id: 7, mood: "Hangat, percaya diri, maskulin", description: "Rempah hangat untuk malam yang berkesan.",
    full_description: null, notes: ["Cardamom", "Amber", "Tonka", "Cedar"],
    strength: "Strong", longevity: "7-9 jam", usage_guide: null, image_url: null, images: [],
    is_active: true, is_featured: false, created_at: "", updated_at: "",
    sizes: [
      { id: 16, perfume_id: 6, size_ml: 10, size_label: "10ml", price: 18000, stock: 12, is_active: true },
      { id: 17, perfume_id: 6, size_ml: 30, size_label: "30ml", price: 45000, stock: 22, is_active: true },
      { id: 18, perfume_id: 6, size_ml: 50, size_label: "50ml", price: 68000, stock: 7, is_active: true },
    ],
  },
];

export default function PerfumeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawParam = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "";
  const decodedParam = decodeURIComponent(rawParam).trim();
  const { addItem, totalItems } = useCart();

  const [perfume, setPerfume] = useState<Perfume | null>(null);
  const [sizes, setSizes] = useState<PerfumeSize[]>([]);
  const [family, setFamily] = useState<ScentFamily | null>(null);
  const [selectedSize, setSelectedSize] = useState<PerfumeSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(false);
  const [relatedPerfumes, setRelatedPerfumes] = useState<(Perfume & { sizes: PerfumeSize[] })[]>([]);

  useEffect(() => {
    function loadFromMock() {
      const mockPerfume = MOCK_PERFUMES.find(
        (p) => p.slug === decodedParam || p.slug === decodedParam.replace(/_/g, "-")
      );
      if (mockPerfume) {
        setPerfume(mockPerfume);
        setSizes(mockPerfume.sizes);
        const default30 = mockPerfume.sizes.find((s) => s.size_ml === 30 && getSizeStock(s) > 0);
        setSelectedSize(default30 ?? mockPerfume.sizes[0]);
        const mockFamily = MOCK_FAMILIES.find((f) => f.id === mockPerfume.family_id);
        if (mockFamily) setFamily(mockFamily);
        const related = MOCK_PERFUMES.filter(
          (p) => p.family_id === mockPerfume.family_id && p.id !== mockPerfume.id
        ).slice(0, 4);
        setRelatedPerfumes(related);
      }
      setLoading(false);
    }

    async function fetchPerfume() {
      try {
        const sb = getSupabase();

        const isNumeric = !isNaN(Number(decodedParam)) && Number(decodedParam) > 0;
        const normalizedDash = decodedParam.replace(/_/g, "-");
        const normalizedUnderscore = decodedParam.replace(/-/g, "_");

        let perfumeQuery = sb
          .from("perfumes")
          .select("*")
          .eq("is_active", true);

        if (isNumeric) {
          perfumeQuery = perfumeQuery.or(
            `id.eq.${Number(decodedParam)},slug.eq.${decodedParam},slug.eq.${normalizedDash}`
          );
        } else {
          perfumeQuery = perfumeQuery.or(
            `slug.eq.${decodedParam},slug.eq.${normalizedDash},slug.eq.${normalizedUnderscore}`
          );
        }

        const { data: perfumeData } = await perfumeQuery.limit(1).maybeSingle();

        if (!perfumeData) {
          loadFromMock();
          return;
        }

        const p = perfumeData as Perfume;
        setPerfume(p);

        // Fetch sizes with product_stocks via API route to bypass RLS and aggregate multi-branch stock
        let s: PerfumeSize[] = [];
        try {
          const res = await fetch(`/api/product-stocks?perfume_id=${p.id}`, { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.data) && json.data.length > 0) {
              s = json.data as PerfumeSize[];
            }
          }
        } catch {
          // fallback
        }

        if (s.length === 0) {
          const { data: sizeData } = await sb
            .from("perfume_sizes")
            .select("*, product_stocks(store_id, stock_qty)")
            .eq("perfume_id", p.id)
            .eq("is_active", true)
            .order("size_ml");
          s = (sizeData ?? []) as PerfumeSize[];
        }

        setSizes(s);
        if (s.length > 0) {
          // Default to 30ml with stock, else first size with stock, else 30ml, else first
          const default30InStock = s.find((sz) => sz.size_ml === 30 && getSizeStock(sz) > 0);
          const firstInStock = s.find((sz) => getSizeStock(sz) > 0);
          const default30 = s.find((sz) => sz.size_ml === 30);
          setSelectedSize(default30InStock ?? firstInStock ?? default30 ?? s[0]);
        }

        // Fetch family
        if (p.family_id) {
          const { data: famData } = await sb
            .from("scent_families")
            .select("*")
            .eq("id", p.family_id)
            .single();
          if (famData) setFamily(famData as ScentFamily);
        }

        // Fetch related perfumes (same family)
        if (p.family_id) {
          const { data: relatedData } = await sb
            .from("perfumes")
            .select("*")
            .eq("family_id", p.family_id)
            .eq("is_active", true)
            .neq("id", p.id)
            .limit(4);

          if (relatedData) {
            const { data: relSizes } = await sb
              .from("perfume_sizes")
              .select("*")
              .in("perfume_id", relatedData.map((r: Perfume) => r.id))
              .eq("is_active", true);

            const related = (relatedData as Perfume[]).map((r) => ({
              ...r,
              sizes: ((relSizes ?? []) as PerfumeSize[]).filter((s) => s.perfume_id === r.id),
            }));
            setRelatedPerfumes(related);
          }
        }

        setLoading(false);
      } catch {
        // Supabase unreachable — use mock data
        loadFromMock();
      }
    }

    if (decodedParam) fetchPerfume();
  }, [decodedParam]);

  function handleAddToCart() {
    if (!perfume || !selectedSize) return;

    addItem({
      perfumeId: perfume.id,
      sizeId: selectedSize.id,
      perfumeName: perfume.name,
      perfumeSlug: perfume.slug,
      sizeLabel: selectedSize.size_label,
      price: selectedSize.price,
      imageUrl: perfume.image_url,
      familyName: family?.name ?? "fresh",
    }, quantity);

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  }

  const topNotes = Array.isArray(perfume?.top_notes) ? perfume.top_notes : [];
  const middleNotes = Array.isArray(perfume?.middle_notes) ? perfume.middle_notes : [];
  const baseNotes = Array.isArray(perfume?.base_notes) ? perfume.base_notes : [];
  const familyName = family?.name ?? "fresh";

  if (loading) {
    return (
      <div className="customer-page">
        <PageHeader />
        <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "var(--c-ink-dim)" }}>Memuat...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!perfume) {
    return (
      <div className="customer-page">
        <PageHeader />
        <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
          <Package size={56} style={{ color: "var(--c-ink-dim)", opacity: 0.3 }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, color: "var(--c-ink-muted)" }}>Parfum tidak ditemukan</h2>
          <Link href="/katalog" className="btn btn-primary"><ArrowLeft size={16} /> Kembali ke Katalog</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="customer-page">
      {/* Topbar */}
      <PageHeader />

      {/* Breadcrumb */}
      <div style={{ padding: "80px 0 0", width: "min(1200px, calc(100% - 32px))", margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.8rem", color: "var(--c-ink-dim)", padding: "16px 0" }}>
          <Link href="/" style={{ color: "var(--c-ink-dim)" }}>Beranda</Link>
          <ChevronRight size={12} />
          <Link href="/katalog" style={{ color: "var(--c-ink-dim)" }}>Katalog</Link>
          <ChevronRight size={12} />
          <span style={{ color: "var(--c-gold)" }}>{perfume.name}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ width: "min(1200px, calc(100% - 32px))", margin: "0 auto", padding: "24px 0 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
          {/* Left — Visual */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className={`perfume-card ${familyName}`} style={{ pointerEvents: "none", borderRadius: "var(--r-lg)", overflow: "hidden", width: "100%", maxWidth: 440 }}>
              <div className="perfume-card__thumb" style={{ borderRadius: 0, overflow: "hidden", background: "var(--c-surface-2)" }}>
                {perfume.image_url ? (
                  <img src={perfume.image_url} alt={perfume.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <>
                    <div className="perfume-card__bottle" style={{ width: 120, height: 180 }} />
                    <div className="perfume-card__glow" />
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Right — Info + Actions */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{perfume.collection}</div>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 4vw, 2.8rem)",
              fontWeight: 400,
              color: "var(--c-ink)",
              marginBottom: 8,
              lineHeight: 1.1,
            }}>
              {perfume.name}
            </h1>

            <p style={{ fontSize: "1rem", color: "var(--c-ink-muted)", lineHeight: 1.7, marginBottom: 24 }}>
              {perfume.description}
            </p>

            {/* Info chips */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
              {family && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--c-ink-muted)" }}>
                  <Droplets size={14} style={{ color: family.color ?? "var(--c-gold)" }} />
                  {family.label}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--c-ink-muted)" }}>
                <Wind size={14} style={{ color: "var(--c-gold)" }} />
                {perfume.strength}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--c-ink-muted)" }}>
                <Clock size={14} style={{ color: "var(--c-gold)" }} />
                {perfume.longevity}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "var(--c-border)", marginBottom: 28 }} />

            {/* Size selector */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 12 }}>
                Pilih Ukuran
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {sizes.map((s) => {
                  const isSelected = selectedSize?.id === s.id;
                  const currentStock = getSizeStock(s);
                  const outOfStock = currentStock <= 0;

                  return (
                    <button
                      key={s.id}
                      disabled={outOfStock}
                      onClick={() => { setSelectedSize(s); setQuantity(1); }}
                      style={{
                        padding: "12px 20px",
                        borderRadius: "var(--r-md)",
                        border: `1.5px solid ${isSelected ? "var(--c-gold)" : "var(--c-border)"}`,
                        background: isSelected ? "var(--c-gold-dim)" : "var(--c-surface-2)",
                        color: outOfStock ? "var(--c-ink-dim)" : isSelected ? "var(--c-gold)" : "var(--c-ink)",
                        cursor: outOfStock ? "not-allowed" : "pointer",
                        opacity: outOfStock ? 0.5 : 1,
                        transition: "all 150ms",
                        textAlign: "left",
                        minWidth: 130,
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 2 }}>{s.size_label}</div>
                      <div style={{ fontSize: "0.8rem", color: isSelected ? "var(--c-gold-light)" : "var(--c-ink-muted)" }}>
                        {formatRupiah(s.price)}
                      </div>
                      {outOfStock && (
                        <div style={{ fontSize: "0.72rem", color: "var(--c-rose)", fontWeight: 600, marginTop: 2 }}>Habis</div>
                      )}
                      {!outOfStock && (
                        <div style={{ fontSize: "0.7rem", color: "var(--c-ink-dim)", marginTop: 2 }}>
                          Stok: {currentStock}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price display */}
            {selectedSize && (
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  fontSize: "clamp(1.6rem, 3vw, 2rem)",
                  fontWeight: 700,
                  color: "var(--c-gold)",
                  fontFamily: "var(--font-body)",
                }}>
                  {formatRupiah(selectedSize.price * quantity)}
                </div>
                {quantity > 1 && (
                  <div style={{ fontSize: "0.78rem", color: "var(--c-ink-dim)", marginTop: 2 }}>
                    {formatRupiah(selectedSize.price)} × {quantity}
                  </div>
                )}
              </div>
            )}

            {/* Quantity + Add to cart */}
            {(() => {
              const currentAvailableStock = selectedSize ? getSizeStock(selectedSize) : 0;
              const isOutOfStock = currentAvailableStock <= 0;

              return (
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 32 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 0,
                    border: "1px solid var(--c-border)", borderRadius: "var(--r-md)",
                    overflow: "hidden",
                    opacity: isOutOfStock ? 0.5 : 1,
                  }}>
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="btn-icon"
                      style={{ borderRadius: 0, width: 42, height: 42 }}
                      disabled={isOutOfStock || quantity <= 1}
                    >
                      <Minus size={16} />
                    </button>
                    <div style={{
                      width: 48, height: 42, display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 600, color: "var(--c-ink)", fontSize: "0.95rem",
                      borderLeft: "1px solid var(--c-border)", borderRight: "1px solid var(--c-border)",
                    }}>
                      {isOutOfStock ? 0 : quantity}
                    </div>
                    <button
                      onClick={() => setQuantity(Math.min(currentAvailableStock, quantity + 1))}
                      className="btn-icon"
                      style={{ borderRadius: 0, width: 42, height: 42 }}
                      disabled={isOutOfStock || quantity >= currentAvailableStock}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, height: 42, fontSize: "0.9rem" }}
                    onClick={handleAddToCart}
                    disabled={!selectedSize || isOutOfStock}
                  >
                    {addedToCart ? (
                      <><Check size={17} /> Ditambahkan</>
                    ) : (
                      <><ShoppingBag size={17} /> Tambah ke Keranjang</>
                    )}
                  </button>
                </div>
              );
            })()}

            {/* Full description */}
            {perfume.full_description && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.4rem",
                  fontWeight: 400,
                  color: "var(--c-ink)",
                  marginBottom: 16,
                  letterSpacing: "0.5px"
                }}>
                  Tentang Aroma Ini
                </h3>
                <div style={{
                  fontSize: "0.95rem",
                  color: "var(--c-ink-muted)",
                  lineHeight: 1.8,
                  fontFamily: "var(--font-body)",
                  whiteSpace: "pre-wrap",
                }}>
                  {perfume.full_description}
                </div>
              </div>
            )}

            {/* Notes Pyramid */}
            {(topNotes.length > 0 || middleNotes.length > 0 || baseNotes.length > 0) && (
              <div style={{ 
                marginBottom: 32, 
                padding: "24px", 
                background: "var(--c-surface-1)", 
                border: "1px solid var(--c-border)", 
                borderRadius: "var(--r-lg)",
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, height: 4,
                  background: "linear-gradient(90deg, transparent, var(--c-gold), transparent)",
                  opacity: 0.3
                }} />
                
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.2rem",
                  color: "var(--c-ink)",
                  marginBottom: 20,
                  textAlign: "center",
                  letterSpacing: "1px"
                }}>
                  Piramida Aroma
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {topNotes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--c-gold)", fontWeight: 600 }}>Top Notes</span>
                      <span style={{ fontSize: "0.9rem", color: "var(--c-ink)", textAlign: "center", fontWeight: 500 }}>{topNotes.join(" • ")}</span>
                    </div>
                  )}
                  {middleNotes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--c-gold)", fontWeight: 600 }}>Heart Notes</span>
                      <span style={{ fontSize: "0.9rem", color: "var(--c-ink)", textAlign: "center", fontWeight: 500 }}>{middleNotes.join(" • ")}</span>
                    </div>
                  )}
                  {baseNotes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--c-gold)", fontWeight: 600 }}>Base Notes</span>
                      <span style={{ fontSize: "0.9rem", color: "var(--c-ink)", textAlign: "center", fontWeight: 500 }}>{baseNotes.join(" • ")}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mood */}
            {perfume.mood && (
              <div style={{
                padding: "16px 20px",
                background: "var(--c-gold-dim)",
                border: "1px solid rgba(201,168,76,0.2)",
                borderRadius: "var(--r-md)",
                fontSize: "0.88rem",
                color: "var(--c-gold-light)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <Sparkles size={16} style={{ flexShrink: 0 }} />
                <em style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>{perfume.mood}</em>
              </div>
            )}
          </div>
        </div>

        {/* Related perfumes */}
        {relatedPerfumes.length > 0 && (
          <div style={{ marginTop: 80 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Aroma Serupa</div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.8rem",
              fontWeight: 400,
              color: "var(--c-ink)",
              marginBottom: 28,
            }}>
              Mungkin Anda juga suka
            </h2>
            <div className="perfume-grid">
              {relatedPerfumes.map((p) => {
                const fName = familyName;
                const minP = getMinPrice(p.sizes);
                return (
                  <Link href={`/parfum/${p.slug}`} key={p.id} style={{ textDecoration: "none" }}>
                    <article className={`perfume-card ${fName}`}>
                      <div className="perfume-card__thumb" style={{ overflow: "hidden", background: "var(--c-surface-2)" }}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                          <div className="perfume-card__bottle" />
                        )}
                      </div>
                      <div className="perfume-card__body">
                        <div className="perfume-card__meta">
                          <span className="perfume-card__collection">{p.collection}</span>
                        </div>
                        <h3 className="perfume-card__name">{p.name}</h3>
                        <p className="perfume-card__mood">{p.mood}</p>
                        <div className="perfume-card__footer">
                          <span className="perfume-card__price">{formatRupiah(minP)}</span>
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

      <Footer />
    </div>
  );
}
