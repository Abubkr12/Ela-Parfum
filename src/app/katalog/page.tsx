"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Bot,
  ChevronDown,
  Filter,
  FlaskConical,
  Grid3X3,
  List,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";

const BibitCatalogGrid = dynamic(
  () => import("@/components/katalog/BibitCatalogGrid").then((mod) => mod.BibitCatalogGrid),
  { ssr: false }
);
import { ThemeToggle } from "@/components/theme-toggle";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";
import { useCart } from "@/lib/cart-context";
import { getSupabase } from "@/lib/supabase";
import {
  formatRupiah,
  getMinPrice,
  getTotalStock,
  type Perfume,
  type PerfumeSize,
  type ScentFamily,
} from "@/lib/types";

type SortOption = "newest" | "cheapest" | "expensive" | "name";

const sortLabels: Record<SortOption, string> = {
  newest: "Terbaru",
  cheapest: "Termurah",
  expensive: "Termahal",
  name: "Nama A-Z",
};

// Fallback scent families in case network fails
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

export default function KatalogPage() {
  const { totalItems } = useCart();
  const [perfumes, setPerfumes] = useState<(Perfume & { sizes: PerfumeSize[] })[]>([]);
  const [families, setFamilies] = useState<ScentFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"parfum" | "bibit">("bibit");
  const [query, setQuery] = useState("");
  const [activeFamily, setActiveFamily] = useState<string>("all");
  const [activeStrength, setActiveStrength] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [showSort, setShowSort] = useState(false);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const sb = getSupabase();

        const [perfumeRes, familyRes, sizesRes] = await Promise.all([
          sb.from("perfumes").select("*").eq("is_active", true).order("created_at", { ascending: false }),
          sb.from("scent_families").select("*").order("sort_order"),
          fetch("/api/product-stocks", { cache: "no-store" }).then((res) => res.json()).catch(() => ({ data: [] })),
        ]);

        const perfumeData = (perfumeRes.data ?? []) as Perfume[];
        const familyData = (familyRes.data ?? []) as ScentFamily[];
        const sizeData = (sizesRes.data ?? []) as PerfumeSize[];

        const merged = perfumeData.map((p) => ({
          ...p,
          sizes: sizeData.filter((s) => s.perfume_id === p.id),
          family: familyData.find((f) => f.id === p.family_id),
        }));

        setPerfumes(merged);
        setFamilies(familyData.length > 0 ? familyData : MOCK_FAMILIES);
        if (merged.length > 0) {
          setActiveTab("parfum");
        } else {
          setActiveTab("bibit");
        }
      } catch (err) {
        console.error("Gagal memuat katalog:", err);
        setPerfumes([]);
        setFamilies(MOCK_FAMILIES);
        setActiveTab("bibit");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter + Sort
  const filtered = useMemo(() => {
    let result = [...perfumes];

    // Family filter
    if (activeFamily !== "all") {
      const fam = families.find((f) => f.name === activeFamily);
      if (fam) result = result.filter((p) => p.family_id === fam.id);
    }

    // Strength filter
    if (activeStrength !== "all") {
      result = result.filter((p) => p.strength === activeStrength);
    }

    // Search
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((p) => {
        const searchable = [
          p.name,
          p.collection,
          p.mood,
          ...(Array.isArray(p.notes) ? p.notes : []),
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(q);
      });
    }

    // Sort
    switch (sort) {
      case "cheapest":
        result.sort((a, b) => getMinPrice(a.sizes) - getMinPrice(b.sizes));
        break;
      case "expensive":
        result.sort((a, b) => getMinPrice(b.sizes) - getMinPrice(a.sizes));
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // newest — already sorted by created_at desc
        break;
    }

    return result;
  }, [perfumes, families, activeFamily, activeStrength, query, sort]);

  return (
    <div className="customer-page">
      {/* Topbar */}
      <PageHeader />

      {/* Page Hero */}
      <section style={{
        padding: "100px 0 36px",
        background: "linear-gradient(180deg, var(--c-surface-1) 0%, var(--c-bg) 100%)",
        textAlign: "center",
      }}>
        <div style={{ width: "min(900px, calc(100% - 32px))", margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            {activeTab === "bibit" ? "740+ Varian Premium" : "Koleksi Lengkap"}
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.4rem, 6vw, 3.4rem)",
            fontWeight: 400,
            color: "var(--c-ink)",
            marginBottom: 12,
          }}>
            {activeTab === "bibit" ? (
              <>Katalog <em>Bibit Parfum</em></>
            ) : (
              <>Katalog <em>Parfum Jadi</em></>
            )}
          </h1>
          <p style={{ color: "var(--c-ink-muted)", fontSize: "1rem", maxWidth: 540, margin: "0 auto 24px" }}>
            {activeTab === "bibit"
              ? "Jelajahi lebih dari 740 pilihan bibit parfum artisan. Racik langsung dengan botol pilihan Anda atau botol sendiri."
              : "Jelajahi seluruh koleksi parfum siap pakai kami — filter berdasarkan aroma, urutkan sesuai selera."}
          </p>

          {/* Tab Switcher - only show if perfumes exist */}
          {perfumes.length > 0 && (
            <div style={{ display: "inline-flex", background: "var(--c-surface-2)", padding: 6, borderRadius: "var(--r-xl, 100px)", border: "1px solid var(--c-border)", gap: 6 }}>
              <button
                type="button"
                onClick={() => setActiveTab("parfum")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 20px",
                  borderRadius: "var(--r-lg, 100px)",
                  border: "none",
                  background: activeTab === "parfum" ? "var(--c-gold)" : "transparent",
                  color: activeTab === "parfum" ? "#ffffff" : "var(--c-ink-dim)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <Package size={16} />
                Katalog Parfum ({perfumes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bibit")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 20px",
                  borderRadius: "var(--r-lg, 100px)",
                  border: "none",
                  background: activeTab === "bibit" ? "var(--c-gold)" : "transparent",
                  color: activeTab === "bibit" ? "#ffffff" : "var(--c-ink-dim)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <FlaskConical size={16} />
                Katalog Bibit (740+)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Filters + Grid */}
      <div style={{ width: "min(1200px, calc(100% - 32px))", margin: "0 auto", padding: "24px 0 64px" }}>
        {activeTab === "bibit" ? (
          <BibitCatalogGrid />
        ) : (
          <>
            {/* Search + Controls */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <label className="search-wrapper" style={{ flex: 1, minWidth: 240 }}>
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari parfum, aroma, mood..."
              aria-label="Cari parfum"
            />
            {query && (
              <button onClick={() => setQuery("")} className="btn-icon btn-icon-sm" aria-label="Hapus pencarian">
                <X size={14} />
              </button>
            )}
          </label>

          {/* Sort dropdown */}
          <div style={{ position: "relative" }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowSort(!showSort)}
            >
              <ArrowUpDown size={14} />
              {sortLabels[sort]}
              <ChevronDown size={14} />
            </button>
            {showSort && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                background: "var(--c-surface-2)",
                border: "1px solid var(--c-border)",
                borderRadius: "var(--r-md)",
                padding: 4,
                minWidth: 160,
                zIndex: 20,
                boxShadow: "var(--shadow-float)",
              }}>
                {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: "0.84rem",
                      color: sort === key ? "var(--c-gold)" : "var(--c-ink-muted)",
                      fontWeight: sort === key ? 600 : 400,
                      background: sort === key ? "var(--c-gold-dim)" : "transparent",
                      border: "none",
                      borderRadius: "var(--r-sm)",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setSort(key);
                      setShowSort(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Family filters */}
        <div className="aroma-filters" role="tablist" aria-label="Filter keluarga aroma" style={{ marginBottom: 32 }}>
          <button
            role="tab"
            aria-selected={activeFamily === "all"}
            className={`aroma-tab ${activeFamily === "all" ? "active" : ""}`}
            onClick={() => setActiveFamily("all")}
          >
            <Sparkles size={13} />
            Semua
          </button>
          {families.map((f) => (
            <button
              key={f.name}
              role="tab"
              aria-selected={activeFamily === f.name}
              className={`aroma-tab ${activeFamily === f.name ? "active" : ""}`}
              onClick={() => setActiveFamily(f.name)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Strength filters */}
        <div className="aroma-filters" role="tablist" aria-label="Filter intensitas parfum" style={{ marginBottom: 32 }}>
          <button
            role="tab"
            aria-selected={activeStrength === "all"}
            className={`aroma-tab ${activeStrength === "all" ? "active" : ""}`}
            onClick={() => setActiveStrength("all")}
          >
            Semua Intensitas
          </button>
          {["Strong", "Medium", "Soft"].map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={activeStrength === s}
              className={`aroma-tab ${activeStrength === s ? "active" : ""}`}
              onClick={() => setActiveStrength(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div style={{ marginBottom: 20, fontSize: "0.84rem", color: "var(--c-ink-dim)" }}>
          {loading ? "Memuat..." : `${filtered.length} parfum ditemukan`}
          {activeFamily !== "all" && ` dalam ${families.find((f) => f.name === activeFamily)?.label}`}
          {activeStrength !== "all" && ` (Intensitas ${activeStrength})`}
          {query && ` untuk "${query}"`}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="perfume-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="perfume-card" style={{ opacity: 0.4 }}>
                <div className="perfume-card__thumb" style={{ background: "var(--c-surface-2)" }} />
                <div className="perfume-card__body">
                  <div style={{ height: 14, width: "60%", background: "var(--c-surface-3)", borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 20, width: "80%", background: "var(--c-surface-3)", borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 12, width: "50%", background: "var(--c-surface-3)", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            {perfumes.length === 0 ? (
              <Package size={48} style={{ color: "var(--c-ink-dim)", opacity: 0.4, marginBottom: 16 }} />
            ) : (
              <Search size={48} style={{ color: "var(--c-ink-dim)", opacity: 0.4, marginBottom: 16 }} />
            )}
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, color: "var(--c-ink-muted)", marginBottom: 8 }}>
              {perfumes.length === 0 ? "Belum ada produk di katalog" : "Tidak ada parfum yang cocok"}
            </h3>
            <p style={{ color: "var(--c-ink-dim)", fontSize: "0.9rem", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.6 }}>
              {perfumes.length === 0
                ? "Produk siap pakai saat ini sedang disiapkan. Anda tetap dapat memesan aroma favorit melalui layanan Racik Custom atau Refill."
                : "Coba kata kunci atau filter lain."}
            </p>
            {perfumes.length === 0 && (
              <Link href="/refill" className="btn btn-primary" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <Sparkles size={16} /> Pesan Racik / Refill Sekarang
              </Link>
            )}
          </div>
        ) : (
          <div className="perfume-grid">
            {filtered.map((p) => {
              const familyName = families.find((f) => f.id === p.family_id)?.name ?? "fresh";
              const minPrice = getMinPrice(p.sizes);
              const totalStock = getTotalStock(p.sizes);

              return (
                <Link href={`/parfum/${p.slug}`} key={p.id} style={{ textDecoration: "none" }}>
                  <article className={`perfume-card ${familyName}`}>
                    <div className="perfume-card__thumb" style={{ overflow: "hidden" }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", background: "var(--c-surface-2)" }} />
                      ) : (
                        <>
                          <div className="perfume-card__bottle" />
                          <div className="perfume-card__glow" />
                        </>
                      )}
                    </div>
                    <div className="perfume-card__body">
                      <div className="perfume-card__meta">
                        <span className="perfume-card__collection">{p.collection}</span>
                        <span className="perfume-card__strength">{p.strength}</span>
                      </div>
                      <h3 className="perfume-card__name">{p.name}</h3>
                      <p className="perfume-card__mood">{p.mood}</p>
                      <div className="note-pills">
                        {(Array.isArray(p.notes) ? p.notes : []).slice(0, 3).map((n) => (
                          <span className="note-pill" key={n}>{n}</span>
                        ))}
                      </div>
                      <div className="perfume-card__footer">
                        <span className="perfume-card__price">
                          {minPrice > 0 ? formatRupiah(minPrice) : "Harga belum tersedia"}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--c-ink-dim)" }}>
                          Stok: {totalStock}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
