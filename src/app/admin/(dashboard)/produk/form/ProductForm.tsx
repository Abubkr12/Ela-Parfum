"use client";

import { useState, useRef, useCallback } from "react";
import { saveProduct } from "../actions";
import { Plus, Trash2, Image as ImageIcon, Save, Loader2, X, Check } from "lucide-react";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";
import { toast } from "sonner";

export default function ProductForm({ initialData, families }: { initialData: any, families: any[] }) {
  const [loading, setLoading] = useState(false);
  const [sizes, setSizes] = useState<any[]>(initialData?.sizes?.length > 0 ? initialData.sizes : [{ size_ml: 50, size_label: "50ml", price: 100000, is_active: true }]);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);
  const [moods, setMoods] = useState<string[]>(initialData?.mood ? initialData.mood.split(',').map((m:string)=>m.trim()).filter(Boolean) : []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PREDEFINED_MOODS = [
    "Romantis", "Elegan", "Segar", "Kasual", "Mewah", 
    "Maskulin", "Feminin", "Hangat", "Misterius", "Energik", 
    "Profesional", "Santai", "Sporty", "Klasik", "Modern",
    "Bold", "Clean", "Playful", "Seductive", "Calming"
  ].sort();

  const allMoods = Array.from(new Set([...PREDEFINED_MOODS, ...moods]));

  // Cropper states
  const [isCropping, setIsCropping] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropAspect, setCropAspect] = useState<number>(4 / 5);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleAddSize = () => {
    setSizes([...sizes, { size_ml: 50, size_label: "50ml", price: 100000, is_active: true }]);
  };

  const handleRemoveSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index));
  };

  const handleSizeChange = (index: number, field: string, value: any) => {
    const newSizes = [...sizes];
    newSizes[index][field] = value;
    setSizes(newSizes);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("File harus berupa gambar!");
        return;
      }
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setIsCropping(true);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return;
      
      const croppedFile = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        0,
        { horizontal: false, vertical: false },
        0.8,
        1000 // 1000px max for products
      );
      
      if (croppedFile) {
        const croppedUrl = URL.createObjectURL(croppedFile);
        setImagePreview(croppedUrl);
        
        if (fileInputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(croppedFile);
          fileInputRef.current.files = dataTransfer.files;
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memotong gambar produk");
    } finally {
      setIsCropping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      formData.append('sizes', JSON.stringify(sizes));
      
      await saveProduct(formData);
    } catch (error: any) {
      if (error.message === 'NEXT_REDIRECT' || (error.digest && error.digest.startsWith('NEXT_REDIRECT'))) {
        throw error;
      }
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 32, alignItems: "start" }}>
      {initialData && <input type="hidden" name="id" value={initialData.id} />}
      <input type="hidden" name="existing_image_url" value={initialData?.image_url || ''} />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Basic Info */}
        <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)" }}>Informasi Dasar</h2>
          
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Nama Parfum *</label>
            <input type="text" name="name" required defaultValue={initialData?.name} className="input-field" style={{ width: "100%", padding: "10px 16px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Koleksi *</label>
              <input type="text" name="collection" required defaultValue={initialData?.collection} className="input-field" placeholder="Cth: Signature Series" style={{ width: "100%", padding: "10px 16px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Keluarga Aroma (Bisa Pilih Lebih dari 1)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)" }}>
                {families.map(f => {
                  const isSelected = initialData?.family_ids?.includes(f.id) || false;
                  return (
                    <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--c-ink)", cursor: "pointer", background: "var(--c-surface-1)", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--c-border)" }}>
                      <input 
                        type="checkbox" 
                        name="family_ids" 
                        value={f.id} 
                        defaultChecked={isSelected}
                        style={{ accentColor: "var(--c-gold)" }}
                      />
                      {f.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Deskripsi Singkat</label>
            <textarea name="description" rows={3} defaultValue={initialData?.description} style={{ width: "100%", padding: "10px 16px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)", resize: "vertical" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Deskripsi Lengkap</label>
            <textarea name="full_description" rows={5} defaultValue={initialData?.full_description} style={{ width: "100%", padding: "10px 16px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)", resize: "vertical" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Karakter / Mood (Bisa Pilih Lebih dari 1)</label>
              <input type="hidden" name="mood" value={moods.join(', ')} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", maxHeight: 220, overflowY: "auto", alignContent: "flex-start" }}>
                {allMoods.map(m => {
                  const isSelected = moods.includes(m);
                  return (
                    <label key={m} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--c-ink)", cursor: "pointer", background: "var(--c-surface-1)", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--c-border)" }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) setMoods([...moods, m]);
                          else setMoods(moods.filter(x => x !== m));
                        }}
                        style={{ accentColor: "var(--c-gold)" }}
                      />
                      {m}
                    </label>
                  );
                })}
                <input type="text" placeholder="+ Tambah Custom (Enter)" onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val && !moods.includes(val)) setMoods([...moods, val]);
                    e.currentTarget.value = '';
                  }
                }} style={{ background: "transparent", border: "none", outline: "none", color: "var(--c-ink)", flex: 1, minWidth: 160, fontSize: "0.85rem" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Top Notes</label>
              <input type="text" name="top_notes" defaultValue={initialData?.notes?.top?.join(', ')} className="input-field" placeholder="Cth: Bergamot, Lemon, Orange" style={{ width: "100%", padding: "10px 16px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Middle Notes</label>
              <input type="text" name="middle_notes" defaultValue={initialData?.notes?.middle?.join(', ')} className="input-field" placeholder="Cth: Jasmine, Rose, Ylang Ylang" style={{ width: "100%", padding: "10px 16px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Base Notes</label>
              <input type="text" name="base_notes" defaultValue={initialData?.notes?.base?.join(', ')} className="input-field" placeholder="Cth: Vanilla, Musk, Sandalwood" style={{ width: "100%", padding: "10px 16px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Kekuatan (Strength)</label>
              <select name="strength" defaultValue={initialData?.strength || "Medium"} style={{ width: "100%", padding: "10px 16px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)", WebkitAppearance: "none", MozAppearance: "none" }}>
                <option value="Soft">Soft</option>
                <option value="Medium">Medium</option>
                <option value="Strong">Strong</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Ketahanan (Longevity)</label>
              <input type="text" name="longevity" defaultValue={initialData?.longevity} className="input-field" placeholder="Cth: 4-6 jam" style={{ width: "100%", padding: "10px 16px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)" }} />
            </div>
          </div>
        </div>

        {/* Sizes & Pricing */}
        <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)" }}>Varian & Harga</h2>
            <button type="button" onClick={handleAddSize} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--c-gold)", background: "rgba(201, 169, 108, 0.1)", padding: "6px 12px", borderRadius: 100, border: "none", cursor: "pointer", fontWeight: 500 }}>
              <Plus size={14} /> Tambah Varian
            </button>
          </div>

          {sizes.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--c-ink-dim)", fontSize: "0.9rem", background: "var(--bg-color)", borderRadius: "var(--r-md)", border: "1px dashed var(--c-border)" }}>
              Belum ada varian. Tambahkan ukuran seperti 30ml atau 50ml.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {sizes.map((size, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end", padding: 16, background: "var(--bg-color)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border)" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)" }}>Ukuran (ml)</label>
                    <input type="number" value={size.size_ml || ''} onChange={e => handleSizeChange(index, 'size_ml', e.target.value ? parseInt(e.target.value) : '')} style={{ width: "100%", padding: "8px 12px", background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", color: "var(--c-ink)", marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)" }}>Label (Cth: 50ml)</label>
                    <input type="text" value={size.size_label || ''} onChange={e => handleSizeChange(index, 'size_label', e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", color: "var(--c-ink)", marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)" }}>Harga (Rp)</label>
                    <input type="number" value={size.price || ''} onChange={e => handleSizeChange(index, 'price', e.target.value ? parseInt(e.target.value) : '')} style={{ width: "100%", padding: "8px 12px", background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", color: "var(--c-ink)", marginTop: 4 }} />
                  </div>
                  <button type="button" onClick={() => handleRemoveSize(index)} style={{ padding: "8px", background: "rgba(225, 29, 72, 0.1)", color: "#e11d48", border: "none", borderRadius: "var(--r-sm)", cursor: "pointer", height: 38 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column (Image & Settings) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 24 }}>
        <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: 24 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20 }}>Gambar Utama</h2>
          <div style={{ position: "relative", width: "100%", minHeight: 350, borderRadius: "var(--r-md)", border: "1px dashed var(--c-border)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-color)", marginBottom: 16 }}>
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain", background: "var(--c-surface-2)" }} />
            ) : (
              <div style={{ color: "var(--c-ink-muted)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <ImageIcon size={32} />
                <span style={{ fontSize: "0.85rem" }}>Pilih gambar</span>
              </div>
            )}
            {/* The hidden input read by the form */}
            <input 
              type="file" 
              name="image" 
              accept="image/*" 
              ref={fileInputRef}
              style={{ display: "none" }} 
            />
            {/* The interactive input for triggering selection */}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} 
            />
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", textAlign: "center" }}>Klik atau tarik gambar ke area ini. Anda bisa mengatur rasio crop (4:5 / 1:1).</p>
        </div>

        <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: 24 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20 }}>Visibilitas</h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <input type="checkbox" name="is_active" id="is_active" defaultChecked={initialData ? initialData.is_active : true} style={{ width: 18, height: 18, accentColor: "var(--c-gold)" }} />
            <div>
              <label htmlFor="is_active" style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--c-ink)", display: "block" }}>Tampilkan Produk</label>
              <span style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)" }}>Produk akan terlihat oleh pelanggan di katalog.</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="checkbox" name="is_featured" id="is_featured" defaultChecked={initialData?.is_featured} style={{ width: 18, height: 18, accentColor: "var(--c-gold)" }} />
            <div>
              <label htmlFor="is_featured" style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--c-ink)", display: "block" }}>Produk Unggulan</label>
              <span style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)" }}>Tampilkan di bagian atas halaman beranda.</span>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px", background: "var(--c-gold)", color: "#000", border: "none", borderRadius: "var(--r-md)", fontSize: "0.95rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
          ) : (
            <Save size={18} />
          )}
          {loading ? 'Menyimpan...' : 'Simpan Produk'}
        </button>
      </div>

      {/* Cropper Modal for Product Image */}
      {isCropping && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "var(--c-surface-1)", borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", width: "100%", maxWidth: "600px", maxHeight: "90vh", boxShadow: "0 20px 40px rgba(0,0,0,0.3)", border: "1px solid var(--c-border)" }}>
          <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--c-surface-1)", borderBottom: "1px solid var(--c-border)" }}>
            <h3 style={{ margin: 0, color: "var(--c-ink)", fontSize: "1.1rem" }}>Sesuaikan & Kompres Foto Produk</h3>
            <button type="button" onClick={() => setIsCropping(false)} style={{ background: "transparent", border: "none", color: "var(--c-ink)", cursor: "pointer", display: "flex" }}>
              <X size={24} />
            </button>
          </div>
          
          <div style={{ position: "relative", width: "100%", height: "50vh", minHeight: "350px", background: "#111" }}>
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={cropAspect}
                cropShape="rect"
                showGrid={true}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            )}
          </div>
          
          <div style={{ padding: "20px", background: "var(--c-surface-1)", borderTop: "1px solid var(--c-border)", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ color: "var(--c-ink-dim)", fontSize: "0.85rem", marginBottom: 8, display: "block" }}>Zoom (Perbesar)</label>
                <input 
                  type="range" 
                  value={zoom} 
                  min={1} 
                  max={3} 
                  step={0.1} 
                  onChange={(e) => setZoom(Number(e.target.value))} 
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ color: "var(--c-ink-dim)", fontSize: "0.85rem", marginBottom: 8, display: "block" }}>Rasio Ukuran (Frame)</label>
                <select 
                  value={cropAspect} 
                  onChange={(e) => setCropAspect(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)", WebkitAppearance: "none", MozAppearance: "none" }}
                >
                  <option value={4/5}>Portrait Botol (4:5) - Pas untuk Parfum</option>
                  <option value={3/4}>Portrait Tinggi (3:4)</option>
                  <option value={1}>Kotak / Square (1:1)</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button 
                type="button"
                onClick={() => setIsCropping(false)}
                style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-ink)", cursor: "pointer", fontWeight: 500 }}
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={showCroppedImage}
                style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "var(--c-gold)", color: "#000", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
              >
                <Check size={18} /> Terapkan & Kompres
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </form>
  );
}
