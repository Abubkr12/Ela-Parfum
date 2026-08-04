"use client";

import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Instagram,
  MessageCircle,
  ChevronUp,
  ExternalLink
} from "lucide-react";

const footerLinks = {
  navigasi: [
    { label: "Beranda", href: "/" },
    { label: "Katalog Parfum", href: "/#catalog" },
    { label: "Konsultasi AI", href: "/#assistant" },
    { label: "Custom Request", href: "/#request" },
    { label: "Tentang Kami", href: "/#about" },
    { label: "Kontak", href: "/#contact" }
  ],
  layanan: [
    { label: "Racikan Custom", href: "/#request" },
    { label: "Replika Merek", href: "/#request" },
    { label: "Konsultasi Aroma", href: "/#assistant" },
    { label: "Parfum Signature", href: "/#catalog" },
    { label: "Isi Ulang Botol", href: "/#catalog" }
  ],
  bantuan: [
    { label: "FAQ", href: "/faq" },
    { label: "Kebijakan Privasi", href: "/privacy" },
    { label: "Syarat & Ketentuan", href: "/terms" },
    { label: "Cara Pemesanan", href: "/faq" },
    { label: "Pengembalian", href: "/faq" }
  ]
};

export function Footer() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="footer" role="contentinfo">
      {/* Top accent line */}
      <div className="footer__accent" />

      {/* Newsletter / CTA band */}
      <div className="footer__cta">
        <div className="footer__cta-inner">
          <div>
            <h3 className="footer__cta-title">Temukan Aroma Signature Anda</h3>
            <p className="footer__cta-desc">
              Dapatkan rekomendasi parfum personal melalui AI kami, atau langsung request racikan custom.
            </p>
          </div>
          <div className="footer__cta-actions">
            <Link href="/#assistant" className="btn btn-primary">
              <MessageCircle size={16} />
              Konsultasi Sekarang
            </Link>
            <Link href="/#request" className="btn btn-ghost">
              Custom Request
            </Link>
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="footer__main">
        <div className="footer__grid">

          {/* Brand column */}
          <div className="footer__brand-col">
            <div className="footer__brand">
              <img src="/assets/Ela Parfum.svg" alt="Ela Parfum Logo" style={{ height: "48px", width: "auto" }} />
            </div>
            <p className="footer__brand-desc">
              Toko parfum isi ulang Condet dengan AI yang membantu Anda menemukan aroma
              yang tepat. Jual parfum jadi, racikan custom, replika merek, dan elixir/biang mentahan.
            </p>
            <div className="footer__contact-list">
              <div className="footer__contact-item">
                <MapPin size={14} />
                <span>
                  <a href="https://maps.app.goo.gl/CALqLaWZET1Lix7B7" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    Jl. Raya Condet No.1, Cililitan, Jakarta Timur (PVP7+MW)
                  </a>
                </span>
              </div>
              <div className="footer__contact-item">
                <Phone size={14} />
                <span>0878-7755-0573</span>
              </div>
              <div className="footer__contact-item">
                <Clock size={14} />
                <span>Setiap Hari, 08:00 – 22:00 WIB</span>
              </div>
            </div>
            <div className="footer__socials">
              <a
                href="https://www.instagram.com/ela_parfum_condet/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon btn-icon-sm"
                aria-label="Instagram"
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://web.facebook.com/ELAPARFUM/?_rdc=1&_rdr#"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon btn-icon-sm"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a
                href="https://wa.me/6287877550573"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon btn-icon-sm"
                aria-label="WhatsApp"
              >
                <MessageCircle size={16} />
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="footer__links-col">
            <h4 className="footer__links-heading">Navigasi</h4>
            <ul className="footer__links">
              {footerLinks.navigasi.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>



          <div className="footer__links-col">
            <h4 className="footer__links-heading">Layanan</h4>
            <ul className="footer__links">
              {footerLinks.layanan.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__links-col">
            <h4 className="footer__links-heading">Bantuan</h4>
            <ul className="footer__links">
              {footerLinks.bantuan.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer__bottom">
        <div className="footer__bottom-inner">
          <p className="footer__copy">
            &copy; {new Date().getFullYear()} Ela Parfum. Semua hak dilindungi.
          </p>
          <div className="footer__bottom-links">
            <Link href="/admin" className="footer__admin-link">
              <ExternalLink size={12} />
              Area Internal
            </Link>
          </div>
          <button
            className="footer__scroll-top"
            onClick={scrollToTop}
            aria-label="Kembali ke atas"
          >
            <ChevronUp size={18} />
          </button>
        </div>
      </div>
    </footer>
  );
}
