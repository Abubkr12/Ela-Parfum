"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bot,
  ChevronRight,
  ClipboardList,
  Filter,
  ImageUp,
  MessageCircle,
  Package,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  X,
  Check,
  Beaker
} from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";
import { FadeIn } from "@/components/fade-in";
import { InteractiveCarousel } from "@/components/interactive-carousel";
import { useCart } from "@/lib/cart-context";
import { getMinPrice, formatRupiah } from "@/lib/types";
import { motion } from "framer-motion";
import { toast } from "sonner";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    text: "Selamat datang. Saya siap bantu temukan aroma yang cocok untuk Anda — cukup ceritakan suasana, aktivitas, atau parfum yang pernah Anda suka."
  }
];

import type { User } from "@supabase/supabase-js";

export function CustomerExperience({ user, serverPerfumes = [], serverFamilies = [] }: { user?: User | null, serverPerfumes?: any[], serverFamilies?: any[] }) {
  const { totalItems: cartCount } = useCart();
  const [activeFamily, setActiveFamily] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [requestText, setRequestText] = useState("");
  const [selectedSize, setSelectedSize] = useState("30ml");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [resultAI, setResultAI] = useState<any>(null);
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const heroImages = useMemo(() => [
    "/images/perfume-hero.png",
    "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&q=80&w=2000"
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const filteredPerfumes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return serverPerfumes.filter((p) => {
      const familyName = p.family?.label || "Uncategorized";
      const matchFamily = activeFamily === "All" || familyName === activeFamily;
      const notes = Array.isArray(p.notes) ? p.notes : [];
      const searchable = [p.name, p.collection, familyName, p.mood, ...notes].join(" ").toLowerCase();
      return matchFamily && (!q || searchable.includes(q));
    });
  }, [activeFamily, query, serverPerfumes]);

  const selectedPerfume = filteredPerfumes[0] ?? serverPerfumes[0] ?? null;

  // Auto-scroll chat log
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  async function handleChatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = chatInput.trim();
    if (!clean || isTyping) return;

    const userMsg: ChatMessage = { role: "user", text: clean };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.text },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Maaf, ada kendala teknis. Silakan coba lagi." },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  async function handleRequestSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = requestText.trim();
    if (!clean && !uploadedFile) {
      toast.error("Mohon isi deskripsi atau unggah gambar referensi.");
      return;
    }

    setLoadingAI(true);
    setResultAI(null);

    try {
      const res = await fetch("/api/refill-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          baseNote: "Bebas (Pilihkan untuk saya)", 
          description: clean, 
          ratio: "auto",
          imageBase64 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendapatkan rekomendasi");

      setResultAI(data);
      toast.success("Rekomendasi racikan berhasil dibuat!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingAI(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        setImageBase64(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="customer-page">
      {/* TOPBAR */}
      <PageHeader />

      {/* HERO */}
      <section className="hero" aria-label="Hero section">
        <div className="hero__bg">
          {heroImages.map((src, idx) => (
            <Image
              key={src}
              src={src}
              alt="Koleksi parfum isi ulang premium"
              fill
              priority={idx === 0}
              className="hero__bg-image"
              sizes="100vw"
              style={{
                opacity: idx === heroIndex ? 1 : 0,
                transition: "opacity 1.5s ease-in-out"
              }}
            />
          ))}
          <div className="hero__overlay" />
          <div className="hero__ambient" />
        </div>

        <div className="hero__content">
          <div className="hero__copy animate-fade-up">            
            <div className="hero__kicker">
              <span className="hero__kicker-line" />
              <span className="hero__kicker-text" style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", color: "var(--c-blue)", textTransform: "uppercase" }}>
                Spesialis Parfum Refill Custom
              </span>
              <span className="hero__kicker-line hero__kicker-line-right" />
            </div>

            <h1 className="hero__title">
              Ciptakan <br />
              <em>Aroma</em> <br />
              Khasmu
            </h1>

            <p className="hero__desc">
              Pilih dari ratusan bibit unggul kami atau biarkan AI Master Perfumer meracik formula refill khusus berdasarkan kepribadian dan referensi favoritmu.
            </p>

            <div className="hero__actions">
              <Link href="/refill" className="btn btn-primary hero-btn">
                <Sparkles size={24} style={{ marginBottom: "2px" }} />
                <div className="hero-btn-content">
                  <span className="hero-btn-title">Racik Refill Custom</span>
                  <span className="hero-btn-desc">Bebas kreasikan aroma sesuai seleramu</span>
                </div>
              </Link>
              <a href="#catalog" className="btn btn-ghost hero-btn">
                <Package size={24} style={{ marginBottom: "2px" }} />
                <div className="hero-btn-content">
                  <span className="hero-btn-title">Katalog Reguler</span>
                  <span className="hero-btn-desc">Pilih dari koleksi parfum siap pakai</span>
                </div>
              </a>
            </div>
          </div>

          <FadeIn delay={0.2}>
            <div className="hero__metrics" aria-label="Statistik toko">
              <div className="hero__metric">
              <span className="hero__metric-value">740+</span>
              <span className="hero__metric-label">Racikan tersedia</span>
            </div>
            <div className="hero__metric">
              <span className="hero__metric-value">{serverFamilies.length}</span>
              <span className="hero__metric-label">Keluarga aroma</span>
            </div>
            <div className="hero__metric">
              <span className="hero__metric-value">30ml</span>
              <span className="hero__metric-label">Ukuran favorit</span>
            </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <InteractiveCarousel featuredPerfumes={serverPerfumes.filter((p) => p.is_featured)} />

      {/* CATALOG + SIDEBAR */}
      <div className="workspace" id="catalog">
        <div className="workspace-grid">

          {/* LEFT: Catalog */}
          <div className="catalog-col">
            <FadeIn delay={0.1}>
            {/* Search + filter bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
              <label className="search-wrapper" style={{ flex: 1 }}>
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari rose, oud, vanilla, fresh..."
                  aria-label="Cari parfum"
                />
              </label>
              <button className="btn btn-ghost btn-sm">
                <Filter size={15} />
                Filter
              </button>
            </div>

            {/* Aroma tabs */}
            <div className="aroma-filters" role="tablist" aria-label="Filter keluarga aroma">
              <button
                role="tab"
                aria-selected={activeFamily === "All"}
                className={`aroma-tab ${activeFamily === "All" ? "active" : ""}`}
                onClick={() => setActiveFamily("All")}
              >
                <Sparkles size={13} />
                Semua
              </button>
              {serverFamilies.map((fam) => (
                <button
                  key={fam.id}
                  role="tab"
                  aria-selected={activeFamily === fam.label}
                  className={`aroma-tab ${activeFamily === fam.label ? "active" : ""}`}
                  onClick={() => setActiveFamily(fam.label)}
                >
                  {fam.label}
                </button>
              ))}
            </div>

            {/* Section heading */}
            <div style={{ marginBottom: 16 }}>
              <span className="eyebrow">Katalog</span>
              <h2 style={{
                fontFamily: "var(--font-display)", fontSize: "1.8rem",
                fontWeight: 400, color: "var(--c-ink)", marginTop: 4
              }}>
                Pilih arah wanginya
              </h2>
            </div>

            {/* Perfume grid */}
            {filteredPerfumes.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: "var(--c-ink-muted)" }}>
                Tidak ada parfum yang cocok. Coba kata kunci lain.
              </div>
            ) : (
              <div className="perfume-grid">
                {filteredPerfumes.map((p) => {
                  const familyName = p.family?.name || "fresh";
                  return (
                  <article className={`perfume-card ${familyName}`} key={p.id}>
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
                        {(Array.isArray(p.notes) ? p.notes : []).slice(0, 3).map((n: any) => (
                          <span className="note-pill" key={n}>{n}</span>
                        ))}
                      </div>
                      <div className="perfume-card__footer">
                        <span className="perfume-card__price">{formatRupiah(getMinPrice(p.sizes))}</span>
                        <Link
                          href={`/parfum/${p.slug || p.name.toLowerCase().replace(/\s+/g, "-")}`}
                          className="btn btn-primary btn-sm"
                          aria-label={`Pilih ${p.name}`}
                        >
                          <Sparkles size={14} />
                          Pilih
                        </Link>
                      </div>
                    </div>
                  </article>
                )})}
              </div>
            )}
            </FadeIn>
          </div>

          {/* RIGHT: AI + Request */}
          <aside className="sidebar-col" id="assistant" aria-label="Panel asisten dan request">
            <FadeIn delay={0.3}>
            {/* AI Assistant */}
            <div className="assistant-card">
              <div className="assistant-header">
                <div>
                  <div className="eyebrow" style={{ marginBottom: 2 }}>AI Assistant</div>
                  <div className="assistant-title">Scent Advisor</div>
                </div>
                <div className="ai-status">
                  <span className="ai-status-dot" />
                  Online
                </div>
              </div>

              <div className="match-preview">
                <div className="match-preview__kicker">Rekomendasi aktif</div>
                <div className="match-preview__name">{selectedPerfume?.name || "Belum ada produk"}</div>
                <div className="match-preview__desc">{selectedPerfume?.match || "AI akan menyesuaikan dengan preferensi Anda"}</div>
                <div className="match-chips">
                  <span className="chip chip-active">{selectedPerfume?.family?.label || "Uncategorized"}</span>
                  <span className="chip">{selectedPerfume?.longevity || "Ketahanan"}</span>
                  <span className="chip">Stok {selectedPerfume?.stock || 0}</span>
                </div>
              </div>

              <div className="chat-log" ref={chatLogRef} aria-live="polite" aria-label="Riwayat percakapan">
                {messages.map((msg, i) => (
                  <div
                    key={`${msg.role}-${i}`}
                    className={msg.role === "assistant" ? "bubble bubble-ai" : "bubble bubble-user"}
                  >
                    {msg.text}
                  </div>
                ))}
                {isTyping && (
                  <div className="bubble bubble-ai" style={{ color: "var(--c-ink-muted)", fontSize: "0.8rem" }}>
                    Mengetik...
                  </div>
                )}
              </div>

              <form className="chat-input-row" onSubmit={handleChatSubmit}>
                <input
                  className="chat-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Contoh: suka aroma manis untuk sehari-hari..."
                  aria-label="Tulis pesan ke AI"
                />
                <button type="submit" className="btn-icon btn-icon-sm" aria-label="Kirim pesan">
                  <Send size={16} />
                </button>
              </form>
            </div>

            {/* Custom Request */}
            {isRequestSubmitted ? (
              <motion.div 
                className="request-card" id="request"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "3rem 1.5rem" }}
              >
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--c-gold-dim)", color: "var(--c-gold)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <Check size={28} />
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 8 }}>Request Diterima!</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 24, lineHeight: 1.5 }}>
                  Brief racikan Anda telah kami terima. Tim expert kami akan segera memproses dan menghubungi Anda.
                </p>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => {
                    setIsRequestSubmitted(false);
                    setResultAI(null);
                    setRequestText("");
                    setUploadedFile(null);
                    setImageBase64(null);
                  }}
                  style={{ width: "100%" }}
                >
                  Buat Request Baru
                </button>
              </motion.div>
            ) : resultAI ? (
              <motion.div 
                className="request-card" id="request"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--c-gold-dim)", color: "var(--c-gold)", borderRadius: "var(--r-pill)", fontSize: "0.8rem", fontWeight: 600, alignSelf: "flex-start" }}>
                  <Sparkles size={14} /> AI Master Perfumer
                </div>
                <h3 style={{ fontSize: "1.4rem", fontFamily: "var(--font-display)", color: "var(--c-ink)", margin: "8px 0" }}>
                  {resultAI.name_suggestion}
                </h3>
                <div style={{ background: "var(--c-surface-1)", padding: "16px", borderRadius: "var(--r-md)", border: "1px solid var(--c-border)" }}>
                  <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--c-ink-dim)", marginBottom: 8, fontWeight: 600 }}>Gambaran Aroma</h4>
                  <p style={{ fontSize: "0.95rem", color: "var(--c-ink)", fontStyle: "italic", margin: 0, lineHeight: 1.5 }}>"{resultAI.customer_description}"</p>
                </div>
                <div style={{ padding: 16, background: "rgba(0,0,0,0.2)", borderRadius: "var(--r-md)", border: "1px dashed var(--c-border)", marginTop: 12 }}>
                  <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--c-ink-muted)", marginBottom: 8, fontWeight: 600 }}>Technical Recipe</h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--c-ink-muted)", fontFamily: "monospace", margin: 0, lineHeight: 1.5 }}>
                    {resultAI.admin_recipe}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setResultAI(null)}>Coba Lagi</button>
                  <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => setIsRequestSubmitted(true)}>Konfirmasi & Pesan</button>
                </div>
              </motion.div>
            ) : (
            <form className="request-card" onSubmit={handleRequestSubmit} id="request">
              <div className="request-card__header">
                <div>
                  <span className="eyebrow">Custom Request</span>
                  <div className="request-card__title">Brief Racikan</div>
                </div>
                <button
                  type="button"
                  className="btn-icon btn-icon-sm"
                  aria-label="Upload gambar referensi"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageUp size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                  aria-label="Upload gambar parfum referensi"
                />
              </div>

              {uploadedFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", background: "var(--c-gold-dim)",
                    border: "1px solid rgba(201,168,76,0.25)", borderRadius: "var(--r-sm)",
                    fontSize: "0.8rem", color: "var(--c-gold-light)",
                    width: "100%", gap: "8px"
                  }}
                >
                  <span style={{ 
                    overflow: "hidden", 
                    textOverflow: "ellipsis", 
                    whiteSpace: "nowrap",
                    flex: 1
                  }}>
                    {uploadedFile}
                  </span>
                  <button type="button" onClick={() => setUploadedFile(null)} aria-label="Hapus file" style={{ flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                </motion.div>
              )}

              {!uploadedFile && (
                <button
                  type="button"
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload gambar parfum referensi"
                >
                  <ImageUp size={20} style={{ color: "var(--c-gold)", opacity: 0.7 }} />
                  <span style={{ fontWeight: 500, color: "var(--c-ink-muted)" }}>Upload foto parfum referensi</span>
                  <span style={{ fontSize: "0.74rem", color: "var(--c-ink-dim)" }}>
                    JPG, PNG — kami akan mencoba mencocokan aromanya
                  </span>
                </button>
              )}

              <div>
                <div style={{ fontSize: "0.78rem", color: "var(--c-ink-muted)", marginBottom: 8, fontWeight: 500 }}>
                  Ukuran botol
                </div>
                <div className="size-tabs">
                  {["10ml", "30ml", "50ml", "100ml"].map((s) => (
                    <button
                      type="button"
                      key={s}
                      className={`size-tab ${selectedSize === s ? "active" : ""}`}
                      onClick={() => setSelectedSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="textarea-field"
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                placeholder="Tulis brief: karakter aroma, referensi parfum, acara, seberapa manis/kuat yang Anda inginkan..."
                rows={4}
                aria-label="Deskripsi request racikan"
              />

              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loadingAI}>
                {loadingAI ? "Menganalisis..." : (
                  <><Sparkles size={17} /> Minta Rekomendasi AI</>
                )}
              </button>
            </form>
            )}
            </FadeIn>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
