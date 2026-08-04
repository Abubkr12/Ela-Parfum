import type { Metadata } from "next";
import Image from "next/image";
import {
  Gem,
  Target,
  Award,
  MapPin,
  Clock,
  HeartHandshake,
  CheckCircle2,
  ExternalLink,
  Eye
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Tentang Kami — Ela Parfum",
  description:
    "Mengenal Ela Parfum, destinasi utama bagi masyarakat dalam menemukan parfum berkualitas sejak tahun 2006.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader />

      <main style={{ paddingTop: "64px" }}>
        {/* ── Hero / Intro ── */}
        <section
          style={{
            padding: "80px 0 80px",
            background:
              "linear-gradient(180deg, rgba(201,168,76,0.04) 0%, transparent 100%)",
            borderBottom: "1px solid var(--c-border)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ambient glow */}
          <div
            style={{
              position: "absolute",
              top: "-30%",
              right: "-10%",
              width: "50%",
              height: "100%",
              background:
                "radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div className="section" style={{ padding: "0", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <span className="eyebrow">Tentang Kami</span>
              <div className="gold-line" style={{ margin: "8px auto 24px" }} />
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
                  fontWeight: 300,
                  lineHeight: 1.08,
                  color: "var(--c-ink)",
                  marginBottom: "24px",
                }}
              >
                Mengenal <em style={{ fontStyle: "italic", color: "var(--c-gold-light)" }}>Ela Parfum</em>
              </h1>
              <div
                style={{
                  fontSize: "1.05rem",
                  color: "var(--c-ink-muted)",
                  lineHeight: 1.8,
                  maxWidth: "760px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px"
                }}
              >
                <p>
                  Didirikan pada tahun 2006, Ela Parfum merupakan toko parfum yang telah menjadi pilihan masyarakat dalam memenuhi kebutuhan wewangian berkualitas. Berawal dari satu toko di kawasan Condet, Jakarta Timur, Ela Parfum terus berkembang dengan mengedepankan kualitas produk, pelayanan yang profesional, serta kepuasan pelanggan sebagai prioritas utama.
                </p>
                <p>
                  Dengan pengalaman lebih dari dua dekade, kami menyediakan berbagai pilihan parfum dengan beragam karakter aroma, mulai dari wewangian untuk aktivitas sehari-hari hingga parfum premium untuk momen istimewa. Kepercayaan pelanggan yang terus tumbuh menjadi motivasi kami untuk terus berinovasi dan memperluas jangkauan layanan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Visi & Misi ── */}
        <section
          style={{
            background: "var(--c-surface-1)",
            borderBottom: "1px solid var(--c-border)",
          }}
        >
          <div
            className="section"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "64px",
              paddingTop: "80px",
              paddingBottom: "80px",
            }}
          >
            {/* Visi */}
            <div style={{
              background: "var(--c-bg)",
              padding: "40px",
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--c-border)",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ position: "absolute", top: 0, right: 0, padding: "32px", opacity: 0.05 }}>
                <Eye size={120} />
              </div>
              <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye size={16} color="var(--c-gold)" /> Visi Kami
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.8rem",
                  fontWeight: 400,
                  lineHeight: 1.2,
                  marginTop: "16px",
                  color: "var(--c-ink)",
                  position: "relative",
                  zIndex: 1
                }}
              >
                Destinasi Utama Parfum Anda
              </h2>
              <p
                style={{
                  marginTop: "20px",
                  fontSize: "1rem",
                  color: "var(--c-ink-muted)",
                  lineHeight: 1.7,
                  position: "relative",
                  zIndex: 1
                }}
              >
                Menjadi toko parfum terpercaya yang menyediakan produk berkualitas, pelayanan terbaik, serta menjadi destinasi utama bagi masyarakat dalam menemukan parfum yang sesuai dengan karakter dan kebutuhannya.
              </p>
            </div>

            {/* Misi */}
            <div style={{
              background: "var(--c-bg)",
              padding: "40px",
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--c-border)",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ position: "absolute", top: 0, right: 0, padding: "32px", opacity: 0.05 }}>
                <Target size={120} />
              </div>
              <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Target size={16} color="var(--c-gold)" /> Misi Kami
              </span>
              <ul
                style={{
                  marginTop: "24px",
                  paddingLeft: "0",
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  position: "relative",
                  zIndex: 1
                }}
              >
                {[
                  "Menyediakan berbagai pilihan parfum berkualitas dengan harga yang kompetitif.",
                  "Memberikan pelayanan yang ramah, profesional, dan berorientasi pada kepuasan pelanggan.",
                  "Mengikuti perkembangan tren parfum untuk menghadirkan koleksi yang selalu relevan.",
                  "Menjalin hubungan jangka panjang dengan pelanggan melalui kepercayaan dan konsistensi kualitas."
                ].map((item, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      fontSize: "0.95rem",
                      color: "var(--c-ink-muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    <CheckCircle2
                      size={18}
                      style={{
                        color: "var(--c-gold)",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Perjalanan Ela Parfum ── */}
        <section className="section" style={{ paddingTop: "80px", paddingBottom: "80px" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <span className="eyebrow">Perjalanan Ela Parfum</span>
            <div className="gold-line" style={{ margin: "8px auto" }} />
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 400,
                color: "var(--c-ink)",
                marginTop: "12px",
              }}
            >
              Jejak Cabang Kami
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "64px" }}>
            {/* Cabang 1 */}
            <div className="branch-card" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "40px",
              alignItems: "center",
            }}>
              <div style={{ position: "relative", aspectRatio: "4/3", borderRadius: "var(--r-lg)", overflow: "hidden", border: "1px solid var(--c-border)" }}>
                <Image 
                  src="/assets/about_images/Ela Parfum Pusat.jpg" 
                  alt="Cabang Utama Condet" 
                  fill 
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--c-gold-dim)", padding: "6px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--c-gold)", marginBottom: "16px" }}>
                  <Clock size={14} /> Berdiri 2006
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--c-ink)", marginBottom: "16px" }}>
                  Cabang Utama Condet
                </h3>
                <p style={{ color: "var(--c-ink-muted)", lineHeight: 1.7, marginBottom: "24px" }}>
                  Cabang pertama Ela Parfum didirikan pada tahun 2006 di kawasan Condet, Jakarta Timur. Cabang ini menjadi pusat operasional sekaligus awal perjalanan Ela Parfum dalam melayani pelanggan dengan produk parfum berkualitas.
                </p>
                <div style={{ padding: "20px", background: "var(--c-surface-1)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "var(--c-ink)", fontWeight: 500 }}>
                    <MapPin size={16} color="var(--c-gold)" /> Alamat Lengkap
                  </div>
                  <p style={{ color: "var(--c-ink-muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "16px" }}>
                    Jl. Raya Condet No. 1<br />
                    RT.001/RW.015, Kelurahan Cililitan<br />
                    Kecamatan Kramat Jati<br />
                    Kota Jakarta Timur<br />
                    Daerah Khusus Ibukota Jakarta 13640
                  </p>
                  <a href="https://maps.app.goo.gl/Bh6C5s1AHX323pkD9" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--c-gold)", fontWeight: 500, textDecoration: "none" }}>
                    Buka di Google Maps <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>

            {/* Cabang 2 */}
            <div className="branch-card" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "40px",
              alignItems: "center",
            }}>
              <div style={{ order: 2, position: "relative", aspectRatio: "4/3", borderRadius: "var(--r-lg)", overflow: "hidden", border: "1px solid var(--c-border)" }}>
                <Image 
                  src="/assets/about_images/Cabang Rawa Belong.jpg" 
                  alt="Cabang Rawa Belong" 
                  fill 
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div style={{ order: 1 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--c-gold-dim)", padding: "6px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--c-gold)", marginBottom: "16px" }}>
                  <Clock size={14} /> Berdiri 2008
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--c-ink)", marginBottom: "16px" }}>
                  Cabang Rawa Belong
                </h3>
                <p style={{ color: "var(--c-ink-muted)", lineHeight: 1.7, marginBottom: "24px" }}>
                  Sebagai bentuk pengembangan bisnis dan meningkatnya kepercayaan pelanggan, Ela Parfum membuka cabang kedua di kawasan Rawa Belong, Jakarta Barat pada tahun 2008.
                </p>
                <div style={{ padding: "20px", background: "var(--c-surface-1)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "var(--c-ink)", fontWeight: 500 }}>
                    <MapPin size={16} color="var(--c-gold)" /> Alamat Lengkap
                  </div>
                  <p style={{ color: "var(--c-ink-muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "16px" }}>
                    Jl. Raya Kb. Jeruk No.57B, <br />
                    RT.8/RW.15, Palmerah, <br />
                    Kec. Palmerah, <br />
                    Kota Jakarta Barat, <br />
                    Daerah Khusus Ibukota Jakarta 11530
                  </p>
                  <a href="https://maps.app.goo.gl/veGH1voHWsWeDwqh9" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--c-gold)", fontWeight: 500, textDecoration: "none" }}>
                    Buka di Google Maps <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>

            {/* Cabang 3 */}
            <div className="branch-card" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "40px",
              alignItems: "center",
            }}>
              <div style={{ position: "relative", aspectRatio: "4/3", borderRadius: "var(--r-lg)", overflow: "hidden", border: "1px solid var(--c-border)" }}>
                <Image 
                  src="/assets/about_images/Cabang Tangerang.jpg" 
                  alt="Cabang Tangerang" 
                  fill 
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--c-gold-dim)", padding: "6px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--c-gold)", marginBottom: "16px" }}>
                  <Clock size={14} /> Berdiri 2024
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--c-ink)", marginBottom: "16px" }}>
                  Cabang Tangerang
                </h3>
                <p style={{ color: "var(--c-ink-muted)", lineHeight: 1.7, marginBottom: "24px" }}>
                  Untuk memperluas jangkauan pelayanan, Ela Parfum membuka cabang ketiga di Tangerang pada tahun 2024 sehingga pelanggan di wilayah Tangerang dan sekitarnya dapat memperoleh produk dengan lebih mudah.
                </p>
                <div style={{ padding: "20px", background: "var(--c-surface-1)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "var(--c-ink)", fontWeight: 500 }}>
                    <MapPin size={16} color="var(--c-gold)" /> Alamat Lengkap
                  </div>
                  <p style={{ color: "var(--c-ink-muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "16px" }}>
                    Jl. Pondok Kacang No. 36<br />
                    RT.002/RW.005, Kelurahan Parung Serab<br />
                    Kecamatan Ciledug<br />
                    Kota Tangerang<br />
                    Provinsi Banten 15226
                  </p>
                  <a href="https://maps.app.goo.gl/MCoq2B19TdRbqfpK8" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--c-gold)", fontWeight: 500, textDecoration: "none" }}>
                    Buka di Google Maps <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Mengapa & Saat Ini ── */}
        <section
          style={{
            background: "var(--c-surface-1)",
            borderTop: "1px solid var(--c-border)",
            borderBottom: "1px solid var(--c-border)",
            padding: "80px 0",
          }}
        >
          <div className="section" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "64px", alignItems: "start" }}>
            
            {/* Mengapa Memilih */}
            <div>
              <span className="eyebrow">Keunggulan</span>
              <div className="gold-line" />
              <h2 className="about-benefits-title" style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                  fontWeight: 400,
                  color: "var(--c-ink)",
                  marginTop: "12px",
                  marginBottom: "24px",
                }}>
                Mengapa Memilih Toko Kami?
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {[
                  { icon: Award, text: "Berpengalaman sejak 2006 dalam industri parfum." },
                  { icon: Gem, text: "Menyediakan berbagai pilihan aroma untuk pria dan wanita." },
                  { icon: HeartHandshake, text: "Mengutamakan kualitas produk dan kepuasan pelanggan." }
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", background: "var(--c-bg)", padding: "16px 20px", borderRadius: "var(--r-md)", border: "1px solid var(--c-border)" }}>
                    <div style={{ background: "var(--c-gold-dim)", padding: "10px", borderRadius: "50%" }}>
                      <item.icon size={20} color="var(--c-gold)" />
                    </div>
                    <span style={{ color: "var(--c-ink)", fontWeight: 500, fontSize: "0.95rem" }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Saat Ini */}
            <div style={{ background: "var(--c-bg)", padding: "48px", borderRadius: "var(--r-xl)", border: "1px solid var(--c-border)", boxShadow: "0 20px 40px -20px rgba(0,0,0,0.05)" }}>
              <span className="eyebrow">Dedikasi Berlanjut</span>
              <div className="gold-line" />
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                  fontWeight: 400,
                  color: "var(--c-ink)",
                  marginTop: "12px",
                  marginBottom: "24px",
                }}
              >
                Ela Parfum Saat Ini
              </h2>
              <p style={{ color: "var(--c-ink-muted)", lineHeight: 1.8, fontSize: "1.05rem" }}>
                Kini Ela Parfum telah melayani pelanggan melalui tiga cabang yang tersebar di wilayah Jakarta dan Tangerang. Dengan pengalaman lebih dari 20 tahun, kami berkomitmen untuk terus memberikan produk parfum berkualitas, mengikuti perkembangan tren wewangian, serta menghadirkan pelayanan terbaik bagi setiap pelanggan yang mempercayakan pilihan parfumnya kepada Ela Parfum.
              </p>
            </div>

          </div>
        </section>

      </main>

      <Footer />

      <style>{`
        @media (max-width: 992px) {
          section .section[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          section .section[style*="grid-template-columns: 1fr 1.5fr"] {
            grid-template-columns: 1fr !important;
          }
          .branch-card {
            grid-template-columns: 1fr !important;
          }
          .branch-card > div:nth-child(1) {
            order: 1 !important;
          }
          .branch-card > div:nth-child(2) {
            order: 2 !important;
          }
        }
      `}</style>
    </>
  );
}
