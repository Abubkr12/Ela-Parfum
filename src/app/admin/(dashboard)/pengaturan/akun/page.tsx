"use client";

import { useState, useEffect, useRef } from "react";
import { User, Mail, Camera, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AccountSettingsPage() {
  const supabase = createClient(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: "", type: "" });
    
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        avatar_url: avatarUrl,
        phone: user?.user_metadata?.phone || ""
      }
    });

    if (error) {
      setMessage({ text: "Gagal menyimpan profil: " + error.message, type: "error" });
    } else {
      setMessage({ text: "Profil berhasil diperbarui.", type: "success" });
    }
    setSaving(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Auto-compress image logic (simple client-side compression to ~300px)
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const fileName = `${user.id}-${Date.now()}.jpg`;
          
          // Upload to Supabase Storage
          const { data, error } = await supabase.storage
            .from('products')
            .upload(`avatars/${fileName}`, blob, { contentType: 'image/jpeg' });
            
          if (error) {
            setMessage({ text: "Gagal mengunggah foto: " + error.message, type: "error" });
            return;
          }
          
          const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(`avatars/${fileName}`);
          setAvatarUrl(publicUrl);
        }, 'image/jpeg', 0.8);
      };
    };
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--c-gold)" }} size={32} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--c-ink)", marginBottom: 8 }}>
          Akun Saya
        </h1>
        <p style={{ color: "var(--c-ink-dim)" }}>
          Kelola informasi profil pribadi dan kredensial akses dasbor.
        </p>
      </div>

      <div style={{ background: "var(--c-surface-1)", borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)", padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--glass-bg)", border: "1px solid var(--c-border)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={40} style={{ color: "var(--c-ink-dim)" }} />
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: "50%", background: "var(--c-gold)", border: "none", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
            >
              <Camera size={16} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 4 }}>Foto Profil</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", lineHeight: 1.5 }}>
              Foto ini akan ditampilkan di Virtual Chat saat Anda melayani pelanggan.<br/>
              Otomatis dikompres & dipotong. Format: JPG/PNG.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--c-ink)" }}>Email (Read-Only)</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-dim)" }}>
                <Mail size={16} />
              </div>
              <input
                type="text"
                value={user?.email || ""}
                disabled
                className="input-field"
                style={{ paddingLeft: 40, background: "var(--glass-bg)", color: "var(--c-ink-dim)", opacity: 0.7 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--c-ink)" }}>Nama Lengkap</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-dim)" }}>
                <User size={16} />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Misal: Budi Santoso"
                className="input-field"
                style={{ paddingLeft: 40 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--c-ink)" }}>Nomor Telepon</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-dim)" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>+62</span>
              </div>
              <input
                type="tel"
                value={user?.user_metadata?.phone || ""}
                onChange={(e) => setUser({...user, user_metadata: {...user.user_metadata, phone: e.target.value}})}
                placeholder="Misal: 81234567890"
                className="input-field"
                style={{ paddingLeft: 45 }}
              />
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)" }}>Gunakan format angka tanpa 0 atau +62 di awal.</p>
          </div>
          
          {message.text && (
            <div style={{ 
              padding: 12, 
              borderRadius: "var(--r-md)", 
              fontSize: "0.85rem",
              display: "flex", alignItems: "center", gap: 8,
              background: message.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(225, 29, 72, 0.1)",
              color: message.type === "success" ? "#22c55e" : "#e11d48"
            }}>
              {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}

          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="btn btn-primary" 
              style={{ padding: "10px 24px" }}
            >
              {saving ? (
                <><Loader2 className="animate-spin" size={16} /> Menyimpan...</>
              ) : (
                <><Save size={16} /> Simpan Profil</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
