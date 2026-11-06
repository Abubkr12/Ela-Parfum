"use client";

import { useState, type FormEvent } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  Send,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";

const contactInfo = [
  {
    icon: MapPin,
    label: "Alamat",
    value: "Cililitan, Jakarta Timur",
    sub: "Jl. Raya Condet No.1 (PVP7+MW)",
  },
  {
    icon: Phone,
    label: "Telepon",
    value: "+62 813-8410-4147",
    sub: "Setiap Hari",
  },
  {
    icon: Mail,
    label: "Email",
    value: "elaparfumid@gmail.com",
    sub: "Respon dalam 24 jam",
  },
  {
    icon: Clock,
    label: "Jam Operasional",
    value: "08:00 — 22:00 WIB",
    sub: "Setiap Hari",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    nama: "",
    email: "",
    telepon: "",
    subjek: "",
    pesan: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      alert("Pesan Anda berhasil dikirim! Kami akan segera menghubungi Anda.");
      setForm({ nama: "", email: "", telepon: "", subjek: "", pesan: "" });
    } catch {
      alert("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader />

      <main style={{ paddingTop: "64px" }}>
        {/* ── Hero ── */}
        <section
          style={{
            padding: "80px 0 56px",
            background:
              "linear-gradient(180deg, rgba(201,168,76,0.04) 0%, transparent 100%)",
            borderBottom: "1px solid var(--c-border)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-20%",
              left: "-10%",
              width: "50%",
              height: "100%",
              background:
                "radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div className="section" style={{ padding: "0", position: "relative", zIndex: 1 }}>
            <span className="eyebrow">Hubungi Kami</span>
            <div className="gold-line" />
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
                fontWeight: 300,
                lineHeight: 1.08,
                marginTop: "12px",
                color: "var(--c-ink)",
              }}
            >
              Kami Siap{" "}
              <em style={{ fontStyle: "italic", color: "var(--c-gold-light)" }}>Membantu</em>
            </h1>
            <p
              style={{
                marginTop: "20px",
                fontSize: "1.05rem",
                color: "var(--c-ink-muted)",
                lineHeight: 1.72,
                maxWidth: "520px",
              }}
            >
              Punya pertanyaan tentang produk, ingin konsultasi aroma, atau butuh bantuan
              dengan pesanan? Jangan ragu untuk menghubungi kami.
            </p>
          </div>
        </section>

        {/* ── Form + Info ── */}
        <section className="section" style={{ paddingTop: "56px", paddingBottom: "80px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 380px",
              gap: "32px",
              alignItems: "start",
            }}
          >
            {/* Left: form */}
            <div
              className="card"
              style={{ padding: "32px 28px" }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.4rem",
                  fontWeight: 500,
                  color: "var(--c-ink)",
                  marginBottom: "24px",
                }}
              >
                Kirim Pesan
              </h2>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label
                      htmlFor="nama"
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "var(--c-ink-muted)",
                        marginBottom: "6px",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Nama Lengkap
                    </label>
                    <input
                      id="nama"
                      name="nama"
                      type="text"
                      required
                      className="input-field"
                      placeholder="Masukkan nama Anda"
                      value={form.nama}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "var(--c-ink-muted)",
                        marginBottom: "6px",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="input-field"
                      placeholder="email@contoh.com"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label
                      htmlFor="telepon"
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "var(--c-ink-muted)",
                        marginBottom: "6px",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Telepon
                    </label>
                    <input
                      id="telepon"
                      name="telepon"
                      type="tel"
                      className="input-field"
                      placeholder="+62 8xx-xxxx-xxxx"
                      value={form.telepon}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="subjek"
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "var(--c-ink-muted)",
                        marginBottom: "6px",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Subjek
                    </label>
                    <select
                      id="subjek"
                      name="subjek"
                      required
                      className="input-field"
                      value={form.subjek}
                      onChange={handleChange}
                      style={{ cursor: "pointer" }}
                    >
                      <option value="">Pilih subjek</option>
                      <option value="produk">Pertanyaan Produk</option>
                      <option value="pesanan">Status Pesanan</option>
                      <option value="custom">Custom Request</option>
                      <option value="kerjasama">Kerja Sama</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="pesan"
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--c-ink-muted)",
                      marginBottom: "6px",
                      letterSpacing: "0.02em",
                    }}
                  >
                    Pesan
                  </label>
                  <textarea
                    id="pesan"
                    name="pesan"
                    required
                    className="textarea-field"
                    placeholder="Tuliskan pesan Anda di sini..."
                    value={form.pesan}
                    onChange={handleChange}
                    rows={5}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    alignSelf: "flex-start",
                    marginTop: "4px",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  <Send size={16} />
                  {submitting ? "Mengirim..." : "Kirim Pesan"}
                </button>
              </form>
            </div>

            {/* Right: info cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {contactInfo.map((c) => (
                <div
                  key={c.label}
                  className="card"
                  style={{
                    padding: "20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    transition: "transform 200ms var(--ease-out), border-color 200ms",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "var(--r-md)",
                      background: "var(--c-gold-dim)",
                      border: "1px solid rgba(201,168,76,0.2)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <c.icon size={18} style={{ color: "var(--c-gold)" }} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--c-gold)",
                        marginBottom: "4px",
                      }}
                    >
                      {c.label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        color: "var(--c-ink)",
                      }}
                    >
                      {c.value}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--c-ink-muted)",
                        marginTop: "2px",
                      }}
                    >
                      {c.sub}
                    </div>
                  </div>
                </div>
              ))}

              {/* WhatsApp CTA */}
              <a
                href="https://wa.me/6281384104147"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  width: "100%",
                  marginTop: "4px",
                  height: "48px",
                  borderRadius: "var(--r-md)",
                  justifyContent: "center",
                }}
              >
                <MessageCircle size={18} />
                Chat via WhatsApp
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        @media (max-width: 880px) {
          .section > div[style*="grid-template-columns: 1fr 380px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
