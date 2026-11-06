# Product Requirements Document (PRD) — Ela Parfum

## Scope & MVP
Platform e-commerce dan Point of Sale (POS) terintegrasi untuk bisnis parfum Ela Parfum. Melayani transaksi online (web) dan in-store (kasir cabang: Condet, Rawabelong, Tangerang) dengan manajemen stok otomatis, katalog bibit & botol, kalkulator racikan parfum kustom, serta sistem pembayaran QRIS/VA dan pengiriman kurir.

## Technical Requirements
- **Runtime:** Edge runtime & SSR via Cloudflare Workers (OpenNext)
- **Database:** Supabase PostgreSQL dengan RLS aktif dan enkripsi credential
- **Keamanan Dependencies:** Zero high/critical CVEs pada public-facing web runtime
- **Payment & Tracking:** Webhook Mayar dengan verifikasi signature, Biteship live rate & tracking

## Success Metrics
- Waktu respons API < 150ms pada edge
- Zero CPU limit (10ms) crashes di Cloudflare Worker
- Build & lint 100% lulus tanpa kegagalan tipe data
