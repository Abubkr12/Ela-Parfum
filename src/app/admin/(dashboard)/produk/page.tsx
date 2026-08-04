import { createClient } from "@/lib/supabase/server";
import { formatRupiah, getMinPrice, getTotalStock } from "@/lib/types";
import Link from "next/link";
import { Plus, Edit2, Trash2, Box, EyeOff, Search } from "lucide-react";
import Image from "next/image";

import { DeleteProductButton } from "./DeleteProductButton";

export default async function AdminProductsPage() {
  const supabase = await createClient(true);

  const { data: perfumes } = await supabase
    .from("perfumes")
    .select("*, sizes:perfume_sizes(*, product_stocks(stock_qty))")
    .order('created_at', { ascending: false });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--c-ink)", fontWeight: 400, marginBottom: 8 }}>
            Katalog Produk
          </h1>
          <p style={{ color: "var(--c-ink-dim)" }}>Atur daftar parfum, stok, harga, dan gambar produk.</p>
        </div>
        
        <Link href="/admin/produk/form" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--c-gold)", color: "#000", fontWeight: 600, borderRadius: "var(--r-md)", transition: "all 0.2s" }}>
          <Plus size={18} /> Tambah Produk
        </Link>
      </div>

      <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
        {/* Search Bar (Visual Only for now) */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--c-border)", display: "flex", gap: 16 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
            <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-muted)" }} />
            <input type="text" placeholder="Cari nama parfum..." style={{ width: "100%", padding: "10px 16px 10px 42px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)", fontSize: "0.9rem" }} />
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--glass-bg)", borderBottom: "1px solid var(--c-border)", textAlign: "left", fontSize: "0.85rem", color: "var(--c-ink-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <th style={{ padding: "16px 24px", fontWeight: 600, width: 60 }}></th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Produk</th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Harga Mulai</th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Stok Total</th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "16px 24px", fontWeight: 600, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {perfumes?.map((perfume) => (
              <tr key={perfume.id} style={{ borderBottom: "1px solid var(--c-border)", transition: "background 0.2s" }} className="hover:bg-black/5 dark:hover:bg-white/5">
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "var(--r-md)", background: "var(--c-border)", overflow: "hidden", position: "relative" }}>
                    {perfume.image_url ? (
                      <img src={perfume.image_url} alt={perfume.name} style={{ width: "100%", height: "100%", objectFit: "contain", background: "var(--c-surface-2)" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-ink-muted)" }}>
                        <Box size={20} />
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: "16px 24px", fontSize: "0.9rem", color: "var(--c-ink)" }}>
                  <div style={{ fontWeight: 600 }}>{perfume.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>{perfume.collection}</div>
                </td>
                <td style={{ padding: "16px 24px", fontSize: "0.9rem", color: "var(--c-gold)", fontWeight: 500 }}>
                  {formatRupiah(getMinPrice(perfume.sizes))}
                </td>
                <td style={{ padding: "16px 24px", fontSize: "0.9rem", color: "var(--c-ink)" }}>
                  {getTotalStock(perfume.sizes)} pcs
                </td>
                <td style={{ padding: "16px 24px" }}>
                  {perfume.is_active ? (
                    <span style={{ fontSize: "0.8rem", padding: "4px 10px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: 100 }}>Aktif</span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, width: "fit-content", fontSize: "0.8rem", padding: "4px 10px", background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", borderRadius: 100 }}>
                      <EyeOff size={12} /> Disembunyikan
                    </span>
                  )}
                </td>
                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link href={`/admin/produk/form?id=${perfume.id}`} style={{ padding: "8px", background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)", transition: "all 0.2s" }} title="Edit Produk">
                      <Edit2 size={16} />
                    </Link>
                    <DeleteProductButton id={perfume.id} name={perfume.name} />
                  </div>
                </td>
              </tr>
            ))}
            {(!perfumes || perfumes.length === 0) && (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--c-ink-dim)", fontSize: "0.9rem" }}>
                  Belum ada produk di katalog.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
