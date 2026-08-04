"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Package, Search, Plus, Edit, Trash2, Loader2, Sparkles, Droplets, ChevronLeft, ChevronRight } from 'lucide-react';
import { saveBibit, deleteBibit } from './actions';

export default function KatalogBibit() {
  const supabase = createClient(true);
  const [bibits, setBibits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('global');
  const [filterIntensity, setFilterIntensity] = useState('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<any>({
    id: null,
    name: '',
    collection: 'Global Parfume',
    top_notes: '',
    middle_notes: '',
    base_notes: '',
    intensity: 'Medium',
    price_per_ml: 1500
  });

  useEffect(() => {
    fetchBibit();
  }, []);

  async function fetchBibit() {
    setLoading(true);
    const { data, error } = await supabase
      .from('bibit')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) {
      console.error(error);
    } else {
      setBibits(data || []);
    }
    setLoading(false);
  }

  const globalParfume = bibits.filter((b: any) => 
    b.collection === 'Global Parfume' && 
    b.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterIntensity === 'all' || b.intensity === filterIntensity)
  );
  const arabianParfume = bibits.filter((b: any) => 
    b.collection === 'Arabian Parfume' && 
    b.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterIntensity === 'all' || b.intensity === filterIntensity)
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab, filterIntensity]);

  const activeData = activeTab === 'global' ? globalParfume : arabianParfume;
  const totalPages = Math.max(1, Math.ceil(activeData.length / itemsPerPage));
  const paginatedData = activeData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      id: null,
      name: '',
      collection: activeTab === 'global' ? 'Global Parfume' : 'Arabian Parfume',
      top_notes: '',
      middle_notes: '',
      base_notes: '',
      intensity: 'Medium',
      price_per_ml: 1500
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setModalMode('edit');
    setFormData({
      id: item.id,
      name: item.name || '',
      collection: item.collection || 'Global Parfume',
      top_notes: Array.isArray(item.top_notes) ? item.top_notes.map((n:any) => `${n.name} (${n.intensity || 'Medium'})`).join(', ') : '',
      middle_notes: Array.isArray(item.middle_notes) ? item.middle_notes.map((n:any) => `${n.name} (${n.intensity || 'Medium'})`).join(', ') : '',
      base_notes: Array.isArray(item.base_notes) ? item.base_notes.map((n:any) => `${n.name} (${n.intensity || 'Medium'})`).join(', ') : '',
      intensity: item.intensity || 'Medium',
      price_per_ml: item.price_per_ml || 1500
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus bibit ini?')) {
      const res = await deleteBibit(id);
      if (!res.success) {
        alert('Gagal menghapus bibit: ' + res.error);
      }
      fetchBibit();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse notes with intensity e.g., "Citrus (Strong), Rose (Soft)"
    const parseNotes = (str: string) => {
      if (!str) return [];
      return str.split(',').map(n => {
        let text = n.trim();
        let intensity = 'Medium';
        const match = text.match(/\((.*?)\)$/);
        if (match) {
          intensity = match[1].trim();
          text = text.replace(/\((.*?)\)$/, '').trim();
        }
        return { name: text, intensity };
      }).filter(n => n.name);
    };
    
    const payload = {
      name: formData.name,
      slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      collection: formData.collection,
      description: formData.description,
      top_notes: parseNotes(formData.top_notes),
      middle_notes: parseNotes(formData.middle_notes),
      base_notes: parseNotes(formData.base_notes),
      intensity: formData.intensity,
      price_per_ml: formData.price_per_ml
    };

    let res;
    if (modalMode === 'add') {
      res = await saveBibit(payload);
    } else {
      res = await saveBibit(payload, formData.id);
    }
    
    if (!res.success) {
      alert('Gagal menyimpan bibit: ' + res.error);
      return;
    }
    
    setIsModalOpen(false);
    fetchBibit();
  };

  const renderBibitTable = (data: any[]) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead style={{ background: 'var(--c-surface-hover)', borderBottom: '1px solid var(--c-border)' }}>
          <tr>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Nama Bibit</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Intensitas</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Top Notes</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Middle Notes</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Base Notes</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Harga (ML)</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--c-ink-dim)', fontSize: '0.85rem', textAlign: 'right' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--c-ink-dim)' }}>
                Belum ada data bibit parfum.
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--c-ink)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Droplets size={16} color="var(--c-gold)" />
                  {item.name}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  {item.intensity ? (
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: 'var(--r-sm)', 
                      fontSize: '0.8rem', 
                      fontWeight: 600,
                      background: item.intensity === 'Strong' ? 'rgba(239, 68, 68, 0.1)' : item.intensity === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                      color: item.intensity === 'Strong' ? '#ef4444' : item.intensity === 'Medium' ? '#f59e0b' : '#3b82f6'
                    }}>
                      {item.intensity}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--c-ink-dim)', fontSize: '0.8rem' }}>Diproses AI...</span>
                  )}
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--c-ink-dim)', fontSize: '0.9rem' }}>
                  {item.top_notes?.map((n: any, i: number) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      {n.name} <span style={{ opacity: 0.7 }}>({n.intensity})</span>
                    </div>
                  ))}
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--c-ink-dim)', fontSize: '0.9rem' }}>
                  {item.middle_notes?.map((n: any, i: number) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      {n.name} <span style={{ opacity: 0.7 }}>({n.intensity})</span>
                    </div>
                  ))}
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--c-ink-dim)', fontSize: '0.9rem' }}>
                  {item.base_notes?.map((n: any, i: number) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      {n.name} <span style={{ opacity: 0.7 }}>({n.intensity})</span>
                    </div>
                  ))}
                </td>
                <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--c-ink)' }}>
                  Rp{item.price_per_ml ? item.price_per_ml.toLocaleString('id-ID') : 1500}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => openEditModal(item)} style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--c-ink-dim)' }}>
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'red' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--c-ink)", fontWeight: 400, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Droplets color="var(--c-gold)" size={28}/> Katalog Bibit Parfum
          </h1>
          <p style={{ color: "var(--c-ink-dim)" }}>Kelola data stok dan detail fragrance oil (bibit).</p>
        </div>
        <button onClick={openAddModal} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--c-gold)", color: "#000", fontWeight: 600, borderRadius: "var(--r-md)", transition: "all 0.2s", border: 'none', cursor: 'pointer' }}>
          <Plus size={18} /> Tambah Bibit
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--c-border)', paddingBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 300, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-ink-dim)' }} />
          <input 
            placeholder="Cari bibit parfum..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 16px 10px 36px', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)', background: 'var(--c-surface-1)', color: 'var(--c-ink)' }}
          />
        </div>
        
        <select 
          value={filterIntensity} 
          onChange={(e) => setFilterIntensity(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)', background: 'var(--c-surface-1)', color: 'var(--c-ink)', outline: 'none' }}
        >
          <option value="all" style={{ background: 'var(--c-surface-1)', color: 'var(--c-ink)' }}>Semua Intensitas</option>
          <option value="Strong" style={{ background: 'var(--c-surface-1)', color: 'var(--c-ink)' }}>Strong (Fresh/Calm)</option>
          <option value="Medium" style={{ background: 'var(--c-surface-1)', color: 'var(--c-ink)' }}>Medium (Floral/Romantic)</option>
          <option value="Soft" style={{ background: 'var(--c-surface-1)', color: 'var(--c-ink)' }}>Soft (Woody/Earthy)</option>
        </select>

        <div style={{ display: 'flex', gap: 8, background: 'var(--c-surface-hover)', padding: 4, borderRadius: 'var(--r-md)' }}>
          <button 
            onClick={() => setActiveTab('global')}
            style={{ padding: '8px 16px', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontWeight: 500, background: activeTab === 'global' ? 'var(--c-gold)' : 'transparent', color: activeTab === 'global' ? '#000' : 'var(--c-ink-dim)' }}>
            Global Parfume ({globalParfume.length})
          </button>
          <button 
            onClick={() => setActiveTab('arabian')}
            style={{ padding: '8px 16px', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontWeight: 500, background: activeTab === 'arabian' ? 'var(--c-gold)' : 'transparent', color: activeTab === 'arabian' ? '#000' : 'var(--c-ink-dim)' }}>
            Arabian Parfume ({arabianParfume.length})
          </button>
        </div>
      </div>

      <div>
        {loading ? (
          <div style={{ padding: 64, display: 'flex', justifyContent: 'center', color: 'var(--c-gold)' }}>
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : (
          <div style={{ background: 'var(--c-surface-1)', borderRadius: 'var(--r-lg)', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
            {renderBibitTable(paginatedData)}
            
            {activeData.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--c-border)', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--c-ink-dim)', fontSize: '0.9rem' }}>
                  Tampilkan 
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    style={{ padding: '6px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--c-border)', background: 'var(--c-surface-1)', color: 'var(--c-ink)', outline: 'none' }}
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  data dari total {activeData.length}
                </div>

                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', border: 'none', background: 'transparent', color: currentPage === 1 ? 'var(--c-ink-dim)' : 'var(--c-gold)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 500 }}
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {getPageNumbers().map((num, i) => (
                      <button
                        key={i}
                        disabled={num === '...'}
                        onClick={() => typeof num === 'number' && setCurrentPage(num)}
                        style={{
                          minWidth: 32,
                          height: 32,
                          padding: '0 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--r-sm)',
                          border: 'none',
                          background: num === currentPage ? 'var(--c-gold)' : num === '...' ? 'transparent' : 'var(--c-surface-hover)',
                          color: num === currentPage ? '#000' : 'var(--c-ink)',
                          fontWeight: num === currentPage ? 600 : 400,
                          cursor: num === '...' ? 'default' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', border: 'none', background: 'transparent', color: currentPage === totalPages ? 'var(--c-ink-dim)' : 'var(--c-gold)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 500 }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
                
                {/* Empty div to balance the grid and keep the center aligned */}
                <div></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: 500, padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 24, color: 'var(--c-ink)', fontFamily: 'var(--font-display)' }}>
              {modalMode === 'add' ? 'Tambah Bibit Baru' : 'Edit Bibit'}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Nama Bibit</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', color: 'var(--c-ink)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Koleksi</label>
                <select value={formData.collection} onChange={e => setFormData({...formData, collection: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', color: 'var(--c-ink)', outline: 'none' }}>
                  <option value="Global Parfume" style={{ background: 'var(--c-surface-1)', color: 'var(--c-ink)' }}>Global Parfume</option>
                  <option value="Arabian Parfume" style={{ background: 'var(--c-surface-1)', color: 'var(--c-ink)' }}>Arabian Parfume</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Intensitas</label>
                <select value={formData.intensity} onChange={e => setFormData({...formData, intensity: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', color: 'var(--c-ink)', outline: 'none' }}>
                  <option value="Strong" style={{ background: 'var(--c-surface-1)', color: 'var(--c-ink)' }}>Strong</option>
                  <option value="Medium" style={{ background: 'var(--c-surface-1)', color: 'var(--c-ink)' }}>Medium</option>
                  <option value="Soft" style={{ background: 'var(--c-surface-1)', color: 'var(--c-ink)' }}>Soft</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Top Notes (Contoh: Vanilla (Strong), Rose (Soft))</label>
                <input value={formData.top_notes} onChange={e => setFormData({...formData, top_notes: e.target.value})} placeholder="Vanilla (Strong), Rose (Soft)" style={{ width: '100%', padding: '10px', background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', color: 'var(--c-ink)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Middle Notes</label>
                <input value={formData.middle_notes} onChange={e => setFormData({...formData, middle_notes: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', color: 'var(--c-ink)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, color: 'var(--c-ink-dim)', fontSize: '0.85rem' }}>Base Notes</label>
                <input value={formData.base_notes} onChange={e => setFormData({...formData, base_notes: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', color: 'var(--c-ink)' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 500, color: 'var(--c-ink-dim)' }}>Harga per ML</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-ink-dim)' }}>Rp</span>
                  <input type="number" required value={formData.price_per_ml} onChange={e => setFormData({...formData, price_per_ml: e.target.value})} style={{ width: '100%', padding: '12px 16px', paddingLeft: 44, borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)', background: 'var(--c-surface-1)', color: 'var(--c-ink)', fontSize: '1rem' }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', color: 'var(--c-ink)', cursor: 'pointer' }}>Batal</button>
                <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--c-gold)', border: 'none', borderRadius: 'var(--r-md)', color: '#000', fontWeight: 600, cursor: 'pointer' }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
