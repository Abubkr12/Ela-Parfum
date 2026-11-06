"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";

const faqItems = [
  {
    q: "Apa itu parfum isi ulang?",
    a: "Parfum isi ulang adalah wewangian yang dijual dalam kemasan refill — Anda membawa botol sendiri atau menggunakan botol dari kami, lalu kami mengisi ulang dengan aroma pilihan Anda. Kualitas bahan yang kami gunakan setara dengan merek-merek ternama, namun dengan harga yang jauh lebih terjangkau karena Anda tidak membayar biaya branding dan kemasan mewah.",
  },
  {
    q: "Bagaimana cara request racikan custom?",
    a: "Anda bisa mengajukan racikan custom melalui fitur Custom Request di halaman utama kami. Cukup jelaskan preferensi aroma yang Anda inginkan — bisa berupa deskripsi suasana (segar, hangat, maskulin, feminin), referensi parfum merek tertentu, atau kombinasi notes yang Anda sukai. Tim peracik kami akan membuat formulasi khusus berdasarkan permintaan Anda.",
  },
  {
    q: "Berapa lama daya tahan parfum isi ulang?",
    a: "Daya tahan parfum isi ulang kami bervariasi tergantung konsentrasi yang dipilih. Untuk Eau de Parfum (EDP), daya tahan rata-rata 6-8 jam. Untuk Eau de Toilette (EDT), sekitar 4-6 jam. Faktor lain seperti jenis kulit, aktivitas, dan cuaca juga mempengaruhi daya tahan. Kami menyediakan panduan penggunaan untuk memaksimalkan longevity setiap parfum.",
  },
  {
    q: "Apakah bisa replika parfum merek terkenal?",
    a: "Ya, kami menyediakan layanan replika aroma dari parfum merek ternama. Kami meracik ulang profil aroma yang mirip menggunakan bahan-bahan berkualitas tinggi. Perlu diingat bahwa ini adalah \"inspired by\" — bukan produk palsu. Hasilnya adalah aroma yang sangat mirip dengan harga yang jauh lebih terjangkau.",
  },
  {
    q: "Metode pembayaran apa saja yang tersedia?",
    a: "Kami menerima berbagai metode pembayaran untuk kemudahan Anda: Transfer Bank (BCA, BNI, BRI, Mandiri), E-Wallet (GoPay, OVO, Dana, ShopeePay), QRIS (scan dari aplikasi apapun), dan COD (Cash on Delivery) untuk area tertentu. Pembayaran online diproses melalui payment gateway yang aman dan terenkripsi.",
  },
  {
    q: "Berapa lama pengiriman?",
    a: "Untuk area Jabodetabek, pengiriman dilakukan dalam 1-2 hari kerja. Untuk luar kota, kami menggunakan ekspedisi JNE, J&T, dan SiCepat dengan estimasi 2-5 hari kerja tergantung lokasi tujuan. Setiap pengiriman dilengkapi dengan bubble wrap dan packaging khusus untuk memastikan parfum Anda tiba dengan aman.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIndex(openIndex === i ? null : i);
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
              top: "-30%",
              right: "10%",
              width: "40%",
              height: "100%",
              background:
                "radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div className="section" style={{ padding: "0", position: "relative", zIndex: 1 }}>
            <span className="eyebrow">FAQ</span>
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
              Pertanyaan{" "}
              <em style={{ fontStyle: "italic", color: "var(--c-gold-light)" }}>Umum</em>
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
              Temukan jawaban dari pertanyaan yang paling sering ditanyakan oleh pelanggan kami.
              Tidak menemukan jawaban? Hubungi kami langsung.
            </p>
          </div>
        </section>

        {/* ── Accordion ── */}
        <section className="section" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            {faqItems.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--c-border)",
                    transition: "background 200ms",
                  }}
                >
                  <button
                    onClick={() => toggle(i)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "20px 4px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "var(--c-ink)",
                    }}
                    aria-expanded={isOpen}
                  >
                    <HelpCircle
                      size={20}
                      style={{
                        color: isOpen ? "var(--c-gold)" : "var(--c-ink-dim)",
                        flexShrink: 0,
                        transition: "color 200ms",
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontFamily: "var(--font-display)",
                        fontSize: "1.1rem",
                        fontWeight: 500,
                        lineHeight: 1.3,
                        color: isOpen ? "var(--c-gold-light)" : "var(--c-ink)",
                        transition: "color 200ms",
                      }}
                    >
                      {item.q}
                    </span>
                    <ChevronDown
                      size={18}
                      style={{
                        flexShrink: 0,
                        color: "var(--c-ink-muted)",
                        transition: "transform 300ms var(--ease-out)",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>
                  <div
                    style={{
                      overflow: "hidden",
                      maxHeight: isOpen ? "400px" : "0",
                      opacity: isOpen ? 1 : 0,
                      transition: "max-height 400ms var(--ease-out), opacity 300ms",
                    }}
                  >
                    <div
                      style={{
                        padding: "0 4px 20px 38px",
                        fontSize: "0.92rem",
                        color: "var(--c-ink-muted)",
                        lineHeight: 1.72,
                      }}
                    >
                      {item.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div
            style={{
              textAlign: "center",
              marginTop: "48px",
              padding: "32px",
              borderRadius: "var(--r-lg)",
              background: "var(--c-surface-1)",
              border: "1px solid var(--c-border)",
              maxWidth: "760px",
              margin: "48px auto 0",
            }}
          >
            <p
              style={{
                fontSize: "0.95rem",
                color: "var(--c-ink-muted)",
                marginBottom: "16px",
              }}
            >
              Masih punya pertanyaan lain?
            </p>
            <a href="/kontak" className="btn btn-primary">
              Hubungi Kami
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
