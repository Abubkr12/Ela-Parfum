import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — Ela Parfum",
  description:
    "Syarat dan ketentuan yang berlaku untuk penggunaan layanan dan pembelian di Ela Parfum.",
};

const sections = [
  {
    title: "Ketentuan Umum",
    content: `Dengan mengakses dan menggunakan situs web Ela Parfum serta melakukan transaksi, Anda dianggap telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan yang berlaku.

Ela Parfum berhak mengubah, memperbarui, atau menghapus bagian dari syarat dan ketentuan ini kapan saja tanpa pemberitahuan sebelumnya. Perubahan akan berlaku efektif sejak dipublikasikan di halaman ini.

Pengguna wajib berusia minimal 17 tahun atau memiliki izin dari orang tua/wali untuk melakukan transaksi di situs kami.`,
  },
  {
    title: "Pemesanan",
    content: `Pemesanan dapat dilakukan melalui situs web kami dengan memilih produk, menentukan ukuran, dan menyelesaikan proses checkout.

Setelah pemesanan berhasil, Anda akan menerima konfirmasi melalui email dan/atau WhatsApp yang berisi detail pesanan dan instruksi pembayaran.

Kami berhak menolak atau membatalkan pesanan jika terdapat indikasi penipuan, informasi yang tidak valid, atau stok yang tidak tersedia. Dalam hal pembatalan oleh kami, dana yang telah dibayarkan akan dikembalikan secara penuh.

Harga yang tercantum di situs sudah termasuk pajak yang berlaku. Biaya pengiriman dihitung terpisah berdasarkan lokasi tujuan dan akan ditampilkan sebelum Anda menyelesaikan pembayaran.`,
  },
  {
    title: "Pembayaran",
    content: `Pembayaran harus dilakukan dalam jangka waktu yang ditentukan setelah pemesanan. Pesanan yang belum dibayar dalam batas waktu tersebut akan dibatalkan secara otomatis.

Metode pembayaran yang tersedia meliputi transfer bank, e-wallet (GoPay, OVO, Dana, ShopeePay), QRIS, dan COD untuk area tertentu.

Konfirmasi pembayaran diproses secara otomatis untuk pembayaran digital. Untuk transfer bank manual, konfirmasi pembayaran akan diverifikasi dalam waktu maksimal 1x24 jam pada hari kerja.

Seluruh transaksi pembayaran diproses melalui payment gateway bersertifikat yang menjamin keamanan data finansial Anda.`,
  },
  {
    title: "Pengiriman",
    content: `Pesanan akan diproses dan dikirim dalam waktu 1-2 hari kerja setelah pembayaran dikonfirmasi.

Estimasi waktu pengiriman bervariasi tergantung lokasi tujuan: 1-2 hari untuk area Jabodetabek, dan 2-5 hari kerja untuk luar kota melalui ekspedisi yang tersedia.

Risiko kerusakan atau kehilangan selama pengiriman menjadi tanggung jawab kami hingga paket diterima oleh penerima. Setiap pengiriman dilengkapi dengan packaging pelindung dan asuransi pengiriman.

Jika terjadi keterlambatan pengiriman yang signifikan, kami akan menginformasikan Anda dan memberikan solusi terbaik termasuk pengiriman ulang atau pengembalian dana.`,
  },
  {
    title: "Pengembalian",
    content: `Pengembalian produk dapat diajukan dalam waktu 3 hari setelah produk diterima, dengan ketentuan:

Produk dalam kondisi belum dibuka atau belum digunakan dan masih dalam kemasan asli.

Kerusakan pada produk akibat pengiriman — sertakan foto bukti kerusakan saat mengajukan klaim.

Produk yang diterima tidak sesuai dengan pesanan (salah aroma, ukuran, atau jumlah).

Pengembalian tidak berlaku untuk produk custom/racikan khusus yang dibuat berdasarkan permintaan personal, kecuali terdapat cacat produksi.

Proses pengembalian dana akan dilakukan dalam waktu 3-7 hari kerja setelah produk dikembalikan dan diperiksa oleh tim kami.`,
  },
  {
    title: "Custom Request",
    content: `Layanan racikan custom memungkinkan Anda memesan parfum dengan formulasi khusus sesuai preferensi Anda.

Setelah formulasi disetujui dan produksi dimulai, pesanan custom tidak dapat dibatalkan atau dimodifikasi.

Kami akan memberikan sampel digital berupa deskripsi lengkap profil aroma sebelum produksi dimulai. Persetujuan Anda atas deskripsi tersebut merupakan konfirmasi final.

Waktu pengerjaan racikan custom adalah 3-7 hari kerja, tergantung kompleksitas formulasi yang diminta.

Garansi kepuasan berlaku untuk racikan custom — jika aroma tidak sesuai ekspektasi, kami akan melakukan penyesuaian satu kali tanpa biaya tambahan.`,
  },
  {
    title: "Perubahan Ketentuan",
    content: `Ela Parfum berhak mengubah syarat dan ketentuan ini sewaktu-waktu. Setiap perubahan akan dipublikasikan di halaman ini dengan tanggal pembaruan terbaru.

Penggunaan berkelanjutan atas layanan kami setelah perubahan dipublikasikan dianggap sebagai persetujuan Anda terhadap ketentuan yang telah diperbarui.

Untuk pertanyaan mengenai syarat dan ketentuan ini, silakan hubungi kami melalui halaman Kontak atau email ke elaparfumid@gmail.com.`,
  },
];

export default function TermsPage() {
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
              Syarat{" "}
              <em style={{ fontStyle: "italic", color: "var(--c-gold-light)" }}>&</em>{" "}
              Ketentuan
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
              <Scale
                size={20}
                style={{ color: "var(--c-gold)", flexShrink: 0 }}
              />
              <p style={{ fontSize: "0.88rem", color: "var(--c-ink-muted)", lineHeight: 1.6 }}>
                Dengan menggunakan layanan Ela Parfum, Anda menyetujui syarat dan ketentuan
                yang tercantum di bawah ini. Harap baca dengan seksama.
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
