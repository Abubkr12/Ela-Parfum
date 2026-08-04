"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Loader2, Save, MapPin, Archive, Search, ChevronLeft, ChevronRight, Edit2, X, Plus, Minus } from "lucide-react";
import { 
  getStores, 
  getProductStocks, 
  getBibitStocks, 
  getBottleStocks,
  updateProductStock,
  updateBibitStock,
  updateBottleStock
} from "./actions";

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}


// Reusable Number Input Component
function NumberControl({ value, onChange, min = 0 }: { value: number, onChange: (v: number) => void, min?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--c-border)", borderRadius: "var(--r-full)", overflow: "hidden", width: "fit-content", background: "var(--c-surface-1)" }}>
      <button 
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{ padding: "6px 12px", background: "var(--c-surface-2)", border: "none", cursor: "pointer", color: "var(--c-ink)" }}
        title="Kurangi"
      ><Minus size={14} /></button>
      
      <input 
        type="number"
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => {
          if (e.target.value === "") {
            onChange(min);
            return;
          }
          const val = parseInt(e.target.value, 10);
          onChange(isNaN(val) ? min : Math.max(min, val));
        }}
        style={{ width: 50, textAlign: "center", border: "none", outline: "none", background: "transparent", color: "var(--c-ink)", fontSize: "0.9rem", fontWeight: 500 }}
      />
      
      <button 
        onClick={() => onChange(value + 1)}
        style={{ padding: "6px 12px", background: "var(--c-surface-2)", border: "none", cursor: "pointer", color: "var(--c-ink)" }}
        title="Tambah"
      ><Plus size={14} /></button>
    </div>
  );
}

export default function StokPage() {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  
  const [activeTab, setActiveTab] = useState<"produk" | "bibit" | "botol">("produk");

  const [productStocks, setProductStocks] = useState<any[]>([]);
  const [bibitStocks, setBibitStocks] = useState<any[]>([]);
  const [bottleStocks, setBottleStocks] = useState<any[]>([]);
  
  const [saving, setSaving] = useState<number | null>(null);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [stockFilter, setStockFilter] = useState("all");
  const [bibitCollectionFilter, setBibitCollectionFilter] = useState("all");

  useEffect(() => {
    async function init() {
      try {
        const storeData = await getStores();
        setStores(storeData);
        if (storeData.length > 0) {
          setSelectedStore(storeData[0].id);
        }
      } catch (err) {
        console.error("Gagal memuat cabang:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadStocks(selectedStore);
    }
    setCurrentPage(1);
    setSearchQuery("");
    setStockFilter("all");
    setEditingRowId(null);
  }, [selectedStore, activeTab]);

  const loadStocks = async (storeId: number) => {
    try {
      setLoading(true);
      if (activeTab === "produk") {
        const data = await getProductStocks(storeId);
        setProductStocks(data?.map(d => ({ ...d, _temp_qty: d.stock_qty })) || []);
      } else if (activeTab === "bibit") {
        const data = await getBibitStocks(storeId);
        setBibitStocks(data?.map(d => ({ 
          ...d, 
          _temp_sealed_500: d.sealed_500ml ?? 2, 
          _temp_sealed_1000: d.sealed_1000ml ?? 2,
          _temp_opened_500: d.opened_500ml_left ?? 500,
          _temp_opened_1000: d.opened_1000ml_left ?? 1000
        })) || []);
      } else if (activeTab === "botol") {
        const data = await getBottleStocks(storeId);
        setBottleStocks(data?.map(d => ({ ...d, _temp_qty: d.stock_qty })) || []);
      }
    } catch (err) {
      console.error("Gagal memuat data stok:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (id: number) => {
    const stock = productStocks.find(s => s.id === id);
    if (!stock) return;
    
    setSaving(id);
    try {
      await updateProductStock(id, stock._temp_qty);
      setProductStocks(prev => prev.map(s => s.id === id ? { ...s, stock_qty: s._temp_qty } : s));
      setEditingRowId(null);
    } catch (err) {
      alert("Gagal update stok produk.");
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateBottle = async (id: number) => {
    const stock = bottleStocks.find(s => s.id === id);
    if (!stock) return;

    setSaving(id);
    try {
      await updateBottleStock(id, stock._temp_qty);
      setBottleStocks(prev => prev.map(s => s.id === id ? { ...s, stock_qty: s._temp_qty } : s));
      setEditingRowId(null);
    } catch (err) {
      alert("Gagal update stok botol.");
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateBibit = async (id: number) => {
    const stock = bibitStocks.find(s => s.id === id);
    if (!stock) return;

    setSaving(id);
    try {
      await updateBibitStock(id, stock._temp_sealed_500, stock._temp_sealed_1000, stock._temp_opened_500, stock._temp_opened_1000);
      setBibitStocks(prev => prev.map(s => s.id === id ? { 
        ...s, 
        sealed_500ml: s._temp_sealed_500,
        sealed_1000ml: s._temp_sealed_1000,
        opened_500ml_left: s._temp_opened_500,
        opened_1000ml_left: s._temp_opened_1000 
      } : s));
      setEditingRowId(null);
    } catch (err) {
      alert("Gagal update stok bibit.");
    } finally {
      setSaving(null);
    }
  };

  const handleCancelEdit = (id: number) => {
    // Reset temp values
    if (activeTab === "produk") {
      setProductStocks(prev => prev.map(s => s.id === id ? { ...s, _temp_qty: s.stock_qty } : s));
    } else if (activeTab === "bibit") {
      setBibitStocks(prev => prev.map(s => s.id === id ? { 
        ...s, 
        _temp_sealed_500: s.sealed_500ml,
        _temp_sealed_1000: s.sealed_1000ml,
        _temp_opened_500: s.opened_500ml_left,
        _temp_opened_1000: s.opened_1000ml_left
      } : s));
    } else if (activeTab === "botol") {
      setBottleStocks(prev => prev.map(s => s.id === id ? { ...s, _temp_qty: s.stock_qty } : s));
    }
    setEditingRowId(null);
  };

  // -------------------------
  // Filtering & Search Logic
  // -------------------------
  const filteredData = useMemo(() => {
    let rawData: any[] = [];
    if (activeTab === "produk") rawData = productStocks;
    if (activeTab === "bibit") rawData = bibitStocks;
    if (activeTab === "botol") rawData = bottleStocks;

    const filtered = rawData.filter(item => {
      let matchesSearch = true;
      let matchesFilter = true;
      
      const q = searchQuery.toLowerCase();

      // Search matching
      if (q) {
        if (activeTab === "produk") {
          matchesSearch = item.perfume_sizes?.perfumes?.name?.toLowerCase().includes(q) || false;
        } else if (activeTab === "bibit") {
          matchesSearch = item.bibit?.name?.toLowerCase().includes(q) || item.bibit?.collection?.toLowerCase().includes(q) || false;
        } else if (activeTab === "botol") {
          matchesSearch = item.bottles?.name?.toLowerCase().includes(q) || false;
        }
      }

      // Stock condition filtering
      if (stockFilter === "low") {
        if (activeTab === "bibit") {
          matchesFilter = (item.sealed_500ml + item.sealed_1000ml) > 0 && (item.sealed_500ml + item.sealed_1000ml) <= 5;
        } else {
          matchesFilter = item.stock_qty > 0 && item.stock_qty <= 5;
        }
      } else if (stockFilter === "empty") {
        if (activeTab === "bibit") {
          matchesFilter = (item.sealed_500ml === 0 && item.sealed_1000ml === 0);
        } else {
          matchesFilter = item.stock_qty === 0;
        }
      }

      // Collection filtering (for bibit)
      if (activeTab === "bibit" && bibitCollectionFilter !== "all") {
        matchesFilter = matchesFilter && item.bibit?.collection === bibitCollectionFilter;
      }

      return matchesSearch && matchesFilter;
    });

    // Sort by name alphabetically
    return filtered.sort((a, b) => {
      let nameA = "";
      let nameB = "";
      if (activeTab === "produk") {
        nameA = a.perfume_sizes?.perfumes?.name || "";
        nameB = b.perfume_sizes?.perfumes?.name || "";
      } else if (activeTab === "bibit") {
        nameA = a.bibit?.name || "";
        nameB = b.bibit?.name || "";
      } else if (activeTab === "botol") {
        nameA = a.bottles?.name || "";
        nameB = b.bottles?.name || "";
      }
      return nameA.localeCompare(nameB);
    });
  }, [productStocks, bibitStocks, bottleStocks, activeTab, searchQuery, stockFilter, bibitCollectionFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && stores.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--c-gold)" }} />
      </div>
    );
  }

  return (
    <div className="stok-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 400, color: "var(--c-ink)" }}>
            Manajemen Stok
          </h1>
          <p style={{ color: "var(--c-ink-dim)" }}>Kelola inventaris untuk seluruh cabang toko.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexDirection: "column" }}>
        
        {/* CABANG SELECTOR */}
        <div style={{ background: "var(--c-surface-1)", padding: 20, borderRadius: "var(--r-md)", border: "1px solid var(--c-border)", display: "flex", gap: 20, alignItems: "center" }}>
          <MapPin size={24} style={{ color: "var(--c-gold)" }} />
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 4 }}>Pilih Cabang Toko</div>
            <select 
              className="input-field"
              value={selectedStore || ""}
              onChange={(e) => setSelectedStore(Number(e.target.value))}
              style={{ padding: "8px 12px", minWidth: 200 }}
            >
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* TABS & TOOLS */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <button 
              onClick={() => setActiveTab("produk")}
              style={{ 
                padding: "10px 20px", 
                borderRadius: "var(--r-md)", 
                border: "none", 
                fontWeight: 600,
                cursor: "pointer",
                background: activeTab === "produk" ? "var(--c-gold)" : "var(--c-surface-2)",
                color: activeTab === "produk" ? "#fff" : "var(--c-ink)",
                transition: "all 0.2s"
              }}
            >
              Stok Produk
            </button>
            <button 
              onClick={() => setActiveTab("bibit")}
              style={{ 
                padding: "10px 20px", 
                borderRadius: "var(--r-md)", 
                border: "none", 
                fontWeight: 600,
                cursor: "pointer",
                background: activeTab === "bibit" ? "var(--c-gold)" : "var(--c-surface-2)",
                color: activeTab === "bibit" ? "#fff" : "var(--c-ink)",
                transition: "all 0.2s"
              }}
            >
              Stok Bibit
            </button>
            <button 
              onClick={() => setActiveTab("botol")}
              style={{ 
                padding: "10px 20px", 
                borderRadius: "var(--r-md)", 
                border: "none", 
                fontWeight: 600,
                cursor: "pointer",
                background: activeTab === "botol" ? "var(--c-gold)" : "var(--c-surface-2)",
                color: activeTab === "botol" ? "#fff" : "var(--c-ink)",
                transition: "all 0.2s"
              }}
            >
              Stok Botol
            </button>
          </div>
          
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-dim)" }} />
              <input 
                type="text" 
                placeholder="Cari item..." 
                className="input-field"
                style={{ paddingLeft: 38, width: 250 }}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            {activeTab === "bibit" && (
              <select 
                className="input-field" 
                value={bibitCollectionFilter}
                onChange={(e) => {
                  setBibitCollectionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: 140 }}
              >
                <option value="all">Semua Koleksi</option>
                <option value="Global Parfume">Global Parfume</option>
                <option value="Arabian Parfume">Arabic Parfume</option>
              </select>
            )}
            <select 
              className="input-field" 
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: 140 }}
            >
              <option value="all">Semua Stok</option>
              <option value="low">Stok Menipis</option>
              <option value="empty">Stok Habis</option>
            </select>
            <select 
              className="input-field" 
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ width: 100 }}
            >
              <option value={10}>10 Baris</option>
              <option value={20}>20 Baris</option>
              <option value={50}>50 Baris</option>
              <option value={100}>100 Baris</option>
            </select>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ background: "var(--c-surface-1)", borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)", overflow: "hidden" }}>
          {loading && stores.length > 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--c-ink-dim)" }}>
              <Loader2 className="animate-spin inline" size={24} style={{ color: "var(--c-gold)", marginRight: 8 }} />
              Memuat data...
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--c-surface-2)", color: "var(--c-ink-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "16px 24px", fontWeight: 600 }}>Nama Item</th>
                    
                    {activeTab === "bibit" ? (
                      <>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Segel 500ml</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Segel 1000ml</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Sisa 500ml (ml)</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Sisa 1000ml (ml)</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Total 500ml (ml)</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Total 1000ml (ml)</th>
                      </>
                    ) : (
                      <th style={{ padding: "16px 24px", fontWeight: 600 }}>Kuantitas Stok</th>
                    )}
                    
                    <th style={{ padding: "16px 24px", fontWeight: 600, width: 180 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length === 0 && (
                    <tr><td colSpan={activeTab === "bibit" ? 7 : 3} style={{ padding: 40, textAlign: "center", color: "var(--c-ink-dim)" }}>Tidak ada data yang sesuai pencarian/filter.</td></tr>
                  )}
                  
                  {activeTab === "produk" && currentData.map(stock => (
                    <tr key={stock.id} style={{ borderBottom: "1px solid var(--c-border)" }}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {stock.perfume_sizes?.perfumes?.image_url ? (
                            <img src={stock.perfume_sizes.perfumes.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--c-surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Archive size={16} color="var(--c-ink-dim)" />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 500, color: "var(--c-ink)" }}>{stock.perfume_sizes?.perfumes?.name || "Produk"}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>Ukuran: {stock.perfume_sizes?.size_label}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        {editingRowId === stock.id ? (
                          <NumberControl 
                            value={stock._temp_qty} 
                            onChange={(v) => setProductStocks(prev => prev.map(s => s.id === stock.id ? { ...s, _temp_qty: v } : s))} 
                          />
                        ) : (
                          <span style={{ fontWeight: 500 }}>{stock.stock_qty} pcs</span>
                        )}
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        {editingRowId === stock.id ? (
                           <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                             <button 
                               onClick={() => handleUpdateProduct(stock.id)}
                               disabled={saving === stock.id}
                               style={{ background: "none", color: "#10B981", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                               title="Simpan"
                             >
                               {saving === stock.id ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                             </button>
                             <button 
                               onClick={() => handleCancelEdit(stock.id)}
                               disabled={saving === stock.id}
                               style={{ background: "none", color: "#EF4444", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                               title="Batal"
                             >
                               <X size={16} />
                             </button>
                           </div>
                        ) : (
                           <button 
                             onClick={() => setEditingRowId(stock.id)}
                             style={{ background: "none", color: "var(--c-ink-dim)", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                             title="Edit"
                           >
                             <Edit2 size={16} />
                           </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {activeTab === "botol" && currentData.map(stock => (
                    <tr key={stock.id} style={{ borderBottom: "1px solid var(--c-border)" }}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontWeight: 500, color: "var(--c-ink)" }}>{stock.bottles?.name || "Botol"}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>Kapasitas: {stock.bottles?.capacity_ml}ml</div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        {editingRowId === stock.id ? (
                          <NumberControl 
                            value={stock._temp_qty} 
                            onChange={(v) => setBottleStocks(prev => prev.map(s => s.id === stock.id ? { ...s, _temp_qty: v } : s))} 
                          />
                        ) : (
                          <span style={{ fontWeight: 500 }}>{stock.stock_qty} pcs</span>
                        )}
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        {editingRowId === stock.id ? (
                           <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                             <button 
                               onClick={() => handleUpdateBottle(stock.id)}
                               disabled={saving === stock.id}
                               style={{ background: "none", color: "#10B981", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                               title="Simpan"
                             >
                               {saving === stock.id ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                             </button>
                             <button 
                               onClick={() => handleCancelEdit(stock.id)}
                               disabled={saving === stock.id}
                               style={{ background: "none", color: "#EF4444", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                               title="Batal"
                             >
                               <X size={16} />
                             </button>
                           </div>
                        ) : (
                           <button 
                             onClick={() => setEditingRowId(stock.id)}
                             style={{ background: "none", color: "var(--c-ink-dim)", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                             title="Edit"
                           >
                             <Edit2 size={16} />
                           </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {activeTab === "bibit" && currentData.map(stock => {
                    // Compute totals
                    const s500 = stock.sealed_500ml ?? 0;
                    const s1000 = stock.sealed_1000ml ?? 0;
                    const o500 = stock.opened_500ml_left ?? 0;
                    const o1000 = stock.opened_1000ml_left ?? 0;
                    const total500 = (s500 > 0 ? (s500 - 1) * 500 : 0) + o500;
                    const total1000 = (s1000 > 0 ? (s1000 - 1) * 1000 : 0) + o1000;
                    
                    return (
                      <tr key={stock.id} style={{ borderBottom: "1px solid var(--c-border)" }}>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ fontWeight: 500, color: "var(--c-ink)" }}>{stock.bibit?.name || "Bibit"}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>
                            {stock.bibit?.collection || "-"}
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          {editingRowId === stock.id ? (
                            <NumberControl value={stock._temp_sealed_500} onChange={v => setBibitStocks(prev => prev.map(s => s.id === stock.id ? { ...s, _temp_sealed_500: v } : s))} />
                          ) : (
                            <span style={{ fontWeight: 500 }}>{s500} botol</span>
                          )}
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          {editingRowId === stock.id ? (
                            <NumberControl value={stock._temp_sealed_1000} onChange={v => setBibitStocks(prev => prev.map(s => s.id === stock.id ? { ...s, _temp_sealed_1000: v } : s))} />
                          ) : (
                            <span style={{ fontWeight: 500 }}>{s1000} botol</span>
                          )}
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          {editingRowId === stock.id ? (
                            <NumberControl value={stock._temp_opened_500} onChange={v => setBibitStocks(prev => prev.map(s => s.id === stock.id ? { ...s, _temp_opened_500: v } : s))} />
                          ) : (
                            <span style={{ fontWeight: 500, color: "var(--c-ink-dim)" }}>{o500} ml</span>
                          )}
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          {editingRowId === stock.id ? (
                            <NumberControl value={stock._temp_opened_1000} onChange={v => setBibitStocks(prev => prev.map(s => s.id === stock.id ? { ...s, _temp_opened_1000: v } : s))} />
                          ) : (
                            <span style={{ fontWeight: 500, color: "var(--c-ink-dim)" }}>{o1000} ml</span>
                          )}
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <span style={{ 
                            padding: "6px 12px", 
                            background: "rgba(52, 211, 153, 0.1)", 
                            color: "#059669", 
                            borderRadius: "var(--r-full)", 
                            fontSize: "0.85rem", 
                            fontWeight: 600 
                          }}>
                            {total500.toLocaleString()} ml
                          </span>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <span style={{ 
                            padding: "6px 12px", 
                            background: "rgba(59, 130, 246, 0.1)", 
                            color: "#2563eb", 
                            borderRadius: "var(--r-full)", 
                            fontSize: "0.85rem", 
                            fontWeight: 600 
                          }}>
                            {total1000.toLocaleString()} ml
                          </span>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          {editingRowId === stock.id ? (
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                              <button 
                                onClick={() => handleUpdateBibit(stock.id)}
                                disabled={saving === stock.id}
                                style={{ background: "none", color: "#10B981", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                                title="Simpan"
                              >
                                {saving === stock.id ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                              </button>
                              <button 
                                onClick={() => handleCancelEdit(stock.id)}
                                disabled={saving === stock.id}
                                style={{ background: "none", color: "#EF4444", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                                title="Batal"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setEditingRowId(stock.id)}
                              style={{ background: "none", color: "var(--c-ink-dim)", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid var(--c-border)", background: "var(--c-surface-2)" }}>
                  <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>
                    Menampilkan {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} item
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button 
                      style={{ 
                        padding: "8px 12px", 
                        borderRadius: "var(--r-sm)", 
                        border: "1px solid var(--c-border)", 
                        background: currentPage === 1 ? "var(--c-surface-2)" : "#fff", 
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        color: currentPage === 1 ? "var(--c-ink-muted)" : "var(--c-ink)",
                        display: "flex", alignItems: "center"
                      }}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <div style={{ display: "flex", gap: 4, margin: "0 8px" }}>
                      {getPaginationItems(currentPage, totalPages).map((item, idx) => (
                        item === '...' ? (
                          <span key={`dots-${idx}`} style={{ padding: "6px 4px", color: "var(--c-ink-dim)" }}>...</span>
                        ) : (
                          <button
                            key={idx}
                            onClick={() => setCurrentPage(item as number)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "var(--r-sm)",
                              border: currentPage === item ? "none" : "none",
                              background: currentPage === item ? "var(--c-gold)" : "transparent",
                              color: currentPage === item ? "#fff" : "var(--c-ink)",
                              fontWeight: currentPage === item ? 600 : 400,
                              cursor: "pointer",
                              minWidth: 32
                            }}
                          >
                            {item}
                          </button>
                        )
                      ))}
                    </div>

                    <button 
                      style={{ 
                        padding: "8px 12px", 
                        borderRadius: "var(--r-sm)", 
                        border: "1px solid var(--c-border)", 
                        background: currentPage === totalPages ? "var(--c-surface-2)" : "#fff", 
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        color: currentPage === totalPages ? "var(--c-ink-muted)" : "var(--c-ink)",
                        display: "flex", alignItems: "center"
                      }}
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
