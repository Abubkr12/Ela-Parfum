import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — Ela Parfum",
  description:
    "Kebijakan privasi Ela Parfum menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda.",
};

const sections = [
  {
    title: "Data yang Dikumpulkan",
    content: `Kami mengumpulkan beberapa jenis data untuk memberikan layanan terbaik kepada Anda:

Informasi Identitas: Nama lengkap, alamat email, nomor telepon, dan alamat pengiriman yang Anda berikan saat melakukan pemesanan atau mendaftar akun.

Informasi Transaksi: Detail pesanan, riwayat pembelian, metode pembayaran yang dipilih, dan status pengiriman.

Data Interaksi: Riwayat percakapan dengan asisten AI kami, preferensi aroma, dan feedback yang Anda berikan untuk meningkatkan rekomendasi.

Data Teknis: Alamat IP, jenis peramban, sistem operasi, dan data analitik anonim untuk meningkatkan performa situs.`,
  },
  {
    title: "Penggunaan Data",
    content: `Data yang kami kumpulkan digunakan untuk:

Memproses dan mengirimkan pesanan Anda dengan akurat dan tepat waktu.

Memberikan rekomendasi parfum yang personal melalui sistem AI kami — semakin banyak preferensi yang Anda bagikan, semakin akurat rekomendasinya.

Menghubungi Anda terkait status pesanan, konfirmasi pembayaran, atau pertanyaan seputar permintaan custom Anda.

Meningkatkan kualitas produk dan layanan kami berdasarkan feedback dan pola penggunaan.

Mengirimkan informasi promosi atau penawaran khusus, hanya jika Anda telah memberikan persetujuan.`,
  },
  {
    title: "Perlindungan Data",
    content: `Keamanan data Anda adalah prioritas kami:

Seluruh transmisi data dilindungi oleh enkripsi SSL/TLS (HTTPS) untuk mencegah intersepsi oleh pihak ketiga.

Data pembayaran diproses oleh payment gateway bersertifikasi PCI-DSS. Kami tidak menyimpan informasi kartu kredit/debit di server kami.

Akses terhadap data pelanggan dibatasi hanya untuk personel yang membutuhkan dalam menjalankan tugas operasional.

Kami melakukan audit keamanan secara berkala dan menerapkan praktik terbaik industri dalam pengelolaan data.`,
  },
  {
    title: "Cookie",
    content: `Situs kami menggunakan cookie untuk:

Cookie Esensial: Diperlukan agar situs dapat berfungsi dengan baik, termasuk menyimpan sesi keranjang belanja dan preferensi tema tampilan.

Cookie Analitik: Membantu kami memahami bagaimana pengunjung berinteraksi dengan situs — halaman mana yang paling sering dikunjungi, berapa lama waktu kunjungan, dan lain-lain. Data ini anonim dan tidak dapat mengidentifikasi individu.

Anda dapat mengatur preferensi cookie melalui pengaturan peramban Anda. Namun, menonaktifkan cookie esensial dapat mengganggu fungsionalitas situs.`,
  },
  {
    title: "Hak Pengguna",
    content: `Anda memiliki hak penuh atas data pribadi Anda:

Hak Akses: Anda dapat meminta salinan data pribadi yang kami simpan tentang Anda.

Hak Perbaikan: Anda dapat memperbarui atau memperbaiki informasi pribadi yang tidak akurat kapan saja.

Hak Penghapusan: Anda dapat meminta penghapusan seluruh data pribadi Anda dari sistem kami. Perlu diperhatikan bahwa beberapa data transaksi mungkin perlu dipertahankan untuk keperluan legal dan akuntansi.

Hak Pembatasan: Anda dapat meminta pembatasan pemrosesan data Anda dalam kondisi tertentu.

Untuk mengajukan permintaan terkait hak-hak di atas, silakan hubungi kami melalui halaman Kontak.`,
  },
  {
    title: "Kontak",
    content: `Jika Anda memiliki pertanyaan atau kekhawatiran mengenai kebijakan privasi ini, silakan hubungi kami melalui:

Email: elaparfumid@gmail.com
Telepon: +62 813-8410-4147
Alamat: Jl. Raya Condet No.1, Cililitan, Jakarta Timur (PVP7+MW)

Kami berkomitmen untuk merespons setiap pertanyaan terkait privasi dalam waktu maksimal 3 hari kerja.`,
  },
];

export default function PrivacyPage() {
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
          }}
        >
          <div className="section" style={{ padding: "0" }}>
            <span className="eyebrow">Legal</span>
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
              Kebijakan{" "}
              <em style={{ fontStyle: "italic", color: "var(--c-gold-light)" }}>Privasi</em>
            </h1>
            <p
              style={{
                marginTop: "16px",
                fontSize: "0.88rem",
                color: "var(--c-ink-dim)",
              }}
            >
              Terakhir diperbarui: 7 Juni 2026
            </p>
          </div>
        </section>

        {/* ── Content ── */}
        <section className="section" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px 20px",
                borderRadius: "var(--r-md)",
                background: "var(--c-gold-dim)",
                border: "1px solid rgba(201,168,76,0.2)",
                marginBottom: "40px",
              }}
            >
              <Shield
                size={20}
                style={{ color: "var(--c-gold)", flexShrink: 0 }}
              />
              <p style={{ fontSize: "0.88rem", color: "var(--c-ink-muted)", lineHeight: 1.6 }}>
                Kami menghormati privasi Anda. Kebijakan ini menjelaskan secara transparan
                bagaimana data Anda dikelola ketika menggunakan layanan Ela Parfum.
              </p>
            </div>

            {sections.map((s, i) => (
              <article key={i} style={{ marginBottom: "36px" }}>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.4rem",
                    fontWeight: 500,
                    color: "var(--c-ink)",
                    marginBottom: "16px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid var(--c-border)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "var(--r-sm)",
                      background: "var(--c-gold-dim)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "var(--c-gold)",
                      fontFamily: "var(--font-body)",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  {s.title}
                </h2>
                <div
                  style={{
                    fontSize: "0.92rem",
                    color: "var(--c-ink-muted)",
                    lineHeight: 1.78,
                    whiteSpace: "pre-line",
                    paddingLeft: "36px",
                  }}
                >
                  {s.content}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
