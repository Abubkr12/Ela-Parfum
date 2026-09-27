"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { 
  Search, 
  X, 
  Sparkles, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingBag, 
  FlaskConical, 
  Info, 
  ArrowUpDown,
  Check
} from "lucide-react";
import { BibitData, BottleData } from "@/components/refill/types";
import { formatRupiah } from "@/lib/types";
import { BibitVariantModal } from "./BibitVariantModal";

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

const ITEMS_PER_PAGE = 24;

export function BibitCatalogGrid() {
  const [bibits, setBibits] = useState<BibitData[]>([]);
  const [bottles, setBottles] = useState<BottleData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [selectedIntensity, setSelectedIntensity] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Quick-buy Modal state
  const [selectedBibitForModal, setSelectedBibitForModal] = useState<BibitData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const gridTopRef = useRef<HTMLDivElement>(null);

  // Fetch bibits and bottles data from lightweight endpoint
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/bibits");
        const data = await res.json();
        if (data.bibits) setBibits(data.bibits);
        if (data.bottles) setBottles(data.bottles);
      } catch (err) {
        console.error("Gagal memuat katalog bibit:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered and Sorted Bibits
  const filteredBibits = useMemo(() => {
    let result = [...bibits];

    // Filter Collection
    if (selectedCollection !== "all") {
      result = result.filter((b) => b.collection === selectedCollection);
    }

    // Filter Intensity
    if (selectedIntensity !== "all") {
      result = result.filter((b) => b.intensity?.toLowerCase() === selectedIntensity.toLowerCase());
    }

    // Search Query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((b) => {
        const text = [
          b.name,
          b.collection,
          b.main_accord,
          b.intensity,
          ...(Array.isArray(b.top_notes) ? b.top_notes : []),
          ...(Array.isArray(b.middle_notes) ? b.middle_notes : []),
          ...(Array.isArray(b.base_notes) ? b.base_notes : []),
        ].join(" ").toLowerCase();
        return text.includes(q);
      });
    }

    // Sorting
    switch (sortOption) {
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        result.sort((a, b) => (a.price_per_ml || 0) - (b.price_per_ml || 0));
        break;
      case "price-desc":
        result.sort((a, b) => (b.price_per_ml || 0) - (a.price_per_ml || 0));
        break;
    }

    return result;
  }, [bibits, selectedCollection, selectedIntensity, searchQuery, sortOption]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCollection, selectedIntensity, sortOption]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBibits.length / ITEMS_PER_PAGE) || 1;
  const paginatedBibits = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBibits.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBibits, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (gridTopRef.current) {
      gridTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openVariantModal = (b: BibitData) => {
    setSelectedBibitForModal(b);
    setIsModalOpen(true);
  };

  return (
    <div ref={gridTopRef} style={{ width: "100%" }}>
      {/* Controls Bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
        
        {/* Search & Sort */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label className="search-wrapper" style={{ flex: 1, minWidth: 260 }}>
            <Search size={16} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari bibit, aroma, accords (contoh: Vanilla, Baccarat, Amber)..."
              aria-label="Cari bibit parfum"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="btn-icon btn-icon-sm" aria-label="Hapus pencarian">
                <X size={14} />
              </button>
            )}
          </label>

          {/* Sorter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", padding: "6px 12px" }}>
            <ArrowUpDown size={15} style={{ color: "var(--c-gold)" }} />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--c-ink)",
                fontSize: "0.85rem",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="name-asc" style={{ background: "var(--c-surface-1)" }}>Nama: A ke Z</option>
              <option value="name-desc" style={{ background: "var(--c-surface-1)" }}>Nama: Z ke A</option>
              <option value="price-asc" style={{ background: "var(--c-surface-1)" }}>Harga: Terendah</option>
              <option value="price-desc" style={{ background: "var(--c-surface-1)" }}>Harga: Tertinggi</option>
            </select>
          </div>
        </div>

        {/* Filter Badges: Koleksi & Intensitas */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {/* Koleksi */}
          <div className="aroma-filters" role="tablist" aria-label="Filter koleksi bibit" style={{ margin: 0 }}>
            <button
              role="tab"
              aria-selected={selectedCollection === "all"}
              className={`aroma-tab ${selectedCollection === "all" ? "active" : ""}`}
              onClick={() => setSelectedCollection("all")}
            >
              <Sparkles size={13} />
              Semua Koleksi
            </button>
            <button
              role="tab"
              aria-selected={selectedCollection === "Global Parfume"}
              className={`aroma-tab ${selectedCollection === "Global Parfume" ? "active" : ""}`}
              onClick={() => setSelectedCollection("Global Parfume")}
            >
              Global Parfume
            </button>
            <button
              role="tab"
              aria-selected={selectedCollection === "Arabian Parfume"}
              className={`aroma-tab ${selectedCollection === "Arabian Parfume" ? "active" : ""}`}
              onClick={() => setSelectedCollection("Arabian Parfume")}
            >
              Arabian Parfume
            </button>
          </div>

          {/* Intensitas */}
          <div className="aroma-filters" role="tablist" aria-label="Filter intensitas bibit" style={{ margin: 0 }}>
            <button
              role="tab"
              aria-selected={selectedIntensity === "all"}
              className={`aroma-tab ${selectedIntensity === "all" ? "active" : ""}`}
              onClick={() => setSelectedIntensity("all")}
            >
              Semua Intensitas
            </button>
            {["Strong", "Medium", "Soft"].map((st) => (
              <button
                key={st}
                role="tab"
                aria-selected={selectedIntensity === st}
                className={`aroma-tab ${selectedIntensity === st ? "active" : ""}`}
                onClick={() => setSelectedIntensity(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Counter Info */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>
          <span>
            {loading ? "Memuat koleksi bibit..." : `Menampilkan ${paginatedBibits.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredBibits.length)} dari ${filteredBibits.length} varian bibit`}
          </span>
          {totalPages > 1 && (
            <span>Halaman {currentPage} dari {totalPages}</span>
          )}
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="perfume-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div 
              key={i} 
              className="perfume-card" 
              style={{ 
                opacity: 0.35, 
                animation: "pulse 1.5s infinite", 
                padding: "20px", 
                display: "flex", 
                flexDirection: "column", 
                justifyContent: "space-between",
                minHeight: 280,
                background: "var(--c-surface-1)",
                border: "1px solid var(--c-border)",
                borderRadius: "var(--r-lg)"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ height: 16, width: "40%", background: "var(--c-surface-3)", borderRadius: 100 }} />
                  <div style={{ height: 16, width: "25%", background: "var(--c-surface-3)", borderRadius: 100 }} />
                </div>
                <div style={{ height: 12, width: "35%", background: "var(--c-surface-3)", borderRadius: 4, marginBottom: 10 }} />
                <div style={{ height: 24, width: "80%", background: "var(--c-surface-3)", borderRadius: 4, marginBottom: 16 }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ height: 18, width: 60, background: "var(--c-surface-3)", borderRadius: 4 }} />
                  <div style={{ height: 18, width: 70, background: "var(--c-surface-3)", borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <div style={{ height: 16, width: "50%", background: "var(--c-surface-3)", borderRadius: 4, marginBottom: 12 }} />
                <div style={{ height: 42, width: "100%", background: "var(--c-surface-3)", borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredBibits.length === 0 ? (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <FlaskConical size={48} style={{ color: "var(--c-ink-dim)", opacity: 0.4, marginBottom: 16 }} />
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, color: "var(--c-ink)", marginBottom: 8 }}>
            Tidak ada aroma bibit yang cocok
          </h3>
          <p style={{ color: "var(--c-ink-dim)", fontSize: "0.9rem", maxWidth: 440, margin: "0 auto 20px" }}>
            Coba gunakan kata kunci lain atau reset filter koleksi & intensitas Anda.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCollection("all");
              setSelectedIntensity("all");
            }}
            className="btn btn-secondary"
            style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="perfume-grid">
          {paginatedBibits.map((b) => (
            <article 
              key={b.id} 
              className="perfume-card" 
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                justifyContent: "space-between",
                background: "var(--c-surface-1)",
                border: "1px solid var(--c-border)",
                borderRadius: "var(--r-lg)",
                padding: "20px",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Top ambient color accent line */}
              <div 
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: b.collection === "Arabian Parfume"
                    ? "linear-gradient(90deg, #d97706, #fbbf24)"
                    : "linear-gradient(90deg, var(--c-gold), #60a5fa)",
                }}
              />

              {/* Upper Card: Badges, Accord, Name, Notes */}
              <div>
                {/* Header Badges */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{
                    fontSize: "0.72rem",
                    padding: "3px 10px",
                    borderRadius: 100,
                    background: b.collection === "Arabian Parfume" ? "rgba(217, 119, 6, 0.15)" : "rgba(255, 255, 255, 0.08)",
                    color: b.collection === "Arabian Parfume" ? "#f59e0b" : "var(--c-gold)",
                    fontWeight: 600,
                    border: "1px solid rgba(217, 119, 6, 0.25)",
                    letterSpacing: "0.3px",
                  }}>
                    {b.collection || "Global Parfume"}
                  </span>

                  <span style={{
                    fontSize: "0.72rem",
                    padding: "2px 8px",
                    borderRadius: 100,
                    background: b.intensity === "Strong" ? "rgba(239, 68, 68, 0.12)" : b.intensity === "Medium" ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
                    color: b.intensity === "Strong" ? "#ef4444" : b.intensity === "Medium" ? "#f59e0b" : "#10b981",
                    border: "1px solid currentColor",
                    fontWeight: 600,
                  }}>
                    {b.intensity || "Medium"}
                  </span>
                </div>

                {/* Main Accord */}
                <div style={{ 
                  fontSize: "0.72rem", 
                  color: "var(--c-gold)", 
                  fontWeight: 700, 
                  marginBottom: 6, 
                  textTransform: "uppercase", 
                  letterSpacing: "0.8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                  <Sparkles size={12} />
                  <span>{b.main_accord || "Signature Aroma"}</span>
                </div>

                {/* Name */}
                <Link href={`/bibit/${b.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <h3 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: "var(--c-ink)",
                    margin: "0 0 10px",
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {b.name}
                  </h3>
                </Link>

                {/* Fragrance Notes preview chips */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 20 }}>
                  {Array.isArray(b.top_notes) && b.top_notes.slice(0, 3).map((note: any, nIdx: number) => (
                    <span 
                      key={nIdx} 
                      style={{ 
                        fontSize: "0.72rem", 
                        padding: "3px 8px", 
                        borderRadius: "var(--r-sm, 6px)", 
                        background: "var(--c-surface-2)", 
                        color: "var(--c-ink-dim)",
                        border: "1px solid var(--c-border)" 
                      }}
                    >
                      {typeof note === "string" ? note : note.name || ""}
                    </span>
                  ))}
                </div>
              </div>

              {/* Lower Card: Price, Detail Link & Buy Action */}
              <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 14, marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "var(--c-ink-dim)", display: "block" }}>Harga Bibit</span>
                    <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--c-gold)" }}>
                      {formatRupiah(b.price_per_ml || 1500)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)" }}> /ml</span>
                  </div>
                  
                  <Link 
                    href={`/bibit/${b.slug}`}
                    style={{ 
                      fontSize: "0.82rem", 
                      color: "var(--c-ink-dim)", 
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: 600
                    }}
                  >
                    <span>Detail Aroma</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={() => openVariantModal(b)}
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    borderRadius: "var(--r-md)",
                  }}
                >
                  <ShoppingBag size={16} />
                  <span>+ Keranjang</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 40, flexWrap: "wrap" }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--c-border)",
              background: "var(--c-surface-1)",
              color: currentPage <= 1 ? "var(--c-ink-dim)" : "var(--c-ink)",
              cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            <ChevronLeft size={16} /> Prev
          </button>

          {/* Page numbers */}
          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            // Show only window around current page
            if (
              pageNum === 1 ||
              pageNum === totalPages ||
              (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
            ) {
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--r-md)",
                    border: isActive ? "1.5px solid var(--c-gold)" : "1px solid var(--c-border)",
                    background: isActive ? "var(--c-gold)" : "var(--c-surface-1)",
                    color: isActive ? "#ffffff" : "var(--c-ink)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  {pageNum}
                </button>
              );
            } else if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
              return <span key={pageNum} style={{ color: "var(--c-ink-dim)" }}>...</span>;
            }
            return null;
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--c-border)",
              background: "var(--c-surface-1)",
              color: currentPage >= totalPages ? "var(--c-ink-dim)" : "var(--c-ink)",
              cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Quick-buy Modal */}
      <BibitVariantModal
        bibit={selectedBibitForModal}
        bottles={bottles}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBibitForModal(null);
        }}
      />
    </div>
  );
}
