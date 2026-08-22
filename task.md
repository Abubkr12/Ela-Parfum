# Task List

## Aktif / Future Development
- [ ] **Fitur Admin:** Buat UI Live Tracking di detail pesanan Admin (menggunakan Biteship Tracking API).
- [ ] **Penanganan Kendala:** Buat alur untuk Pesanan Dibatalkan setelah dibayar (Opsi mengajukan pengiriman ulang ke Biteship atau Pengembalian Dana/Refund via Mayar).
- [/] Tunggu hingga script `fix-perfumes-ollama.js` selesai memproses sisa 723 data di database secara lokal.
- [ ] Verifikasi data di Supabase setelah selesai.

## Arsip
- [x] Integrasi ulang API Mayar dan Biteship (Sandbox & Production) termasuk sinkronisasi Custom Refill.
- [x] Perbaikan error float harga desimal pada penyimpanan order_items di Custom Refill.
- [x] Buat script testing untuk aktivasi API Biteship (Order terkirim & dibatalkan).
- [x] Instalasi Ollama untuk Windows.
- [x] Pull model `llama3.1` (8B) secara lokal.
- [x] Buat script eksekutor `fix-perfumes-ollama.js` dengan JSON-mode REST API.
- [x] Evaluasi rules dan prioritas penggunaan Gemini Flash + Grounding.
- [x] Modifikasi `fix-perfumes.js` untuk rotasi model.
- [x] Tangani error API limitasi dengan menambahkan logika retry untuk error 503 (High Demand).
