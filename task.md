# Task List

## Aktif / Future Development
- [ ] **Revamp Halaman Statistik Admin (/admin/statistik):**
  - [ ] **Statistik Penjualan:** Mendata semua produk berhasil terjual (status PAID - QRIS & Cash), grafik chart omzet & transaksi interaktif ala saham (filter menit, jam, hari, minggu, bulan, tahun), pencatatan tanggal/waktu transaksi presisi, serta tabel rincian pemesan.
  - [ ] **Statistik Barang:** Mendata barang keluar/terjual terpisah per kategori (Produk Jadi/Reguler, Bibit, Pelarut, Botol), grafik tren barang terlaris, analisis korelasi stok vs katalog untuk prioritas restok.
- [ ] **Fitur Admin:** Buat UI Live Tracking di detail pesanan Admin (menggunakan Biteship Tracking API).
- [ ] **Penanganan Kendala:** Buat alur untuk Pesanan Dibatalkan setelah dibayar (Opsi mengajukan pengiriman ulang ke Biteship atau Pengembalian Dana/Refund via Mayar).
- [ ] **Fitur Geofencing Tunai:** Implementasi radius 50m berbasis koordinat Google Maps untuk aktivasi pembayaran tunai di toko.

## Arsip
- [x] **Perbaikan Integrasi Kurir Biteship (Instant & Non-Instant):**
  - [x] Analisis akar masalah penolakan Biteship *"Courier service type does not exist"* pada kurir non-instant (JNE YES, JNE Reguler).
  - [x] Implementasi normalisasi dan pemetaan cerdas `parseCourier` di `src/lib/biteship.ts` untuk JNE (`reg`, `yes`, `oke`), J&T (`ez`, `super`), SiCepat, Anteraja, Ninja, Wahana, TIKI, POS, Lion, Gojek, Grab, Lalamove.
  - [x] Pengiriman metadata `courierCompany` dan `courierServiceCode` dari checkout reguler dan kustom ke catatan pesanan.
  - [x] Pembersihan otomatis error lama pada kolom catatan pesanan saat resi berhasil diterbitkan via tombol sync/webhook.
  - [x] Pengujian menyeluruh dan verifikasi berhasil untuk seluruh jenis pengiriman (Instant & Non-Instant).
- [x] **Perombakan Stok Bibit (500ml Base & Input ML Direct):**
  - [x] Eksekusi migrasi skema SQL `bibit_stocks` (tambah `stock_ml NUMERIC(10,2) DEFAULT 3500`, bersihkan 6 duplikat test, set seluruh 740 bibit di Condet, Rawabelong, Tangerang ke 3500 ml = 2.220 rows tepat).
  - [x] Update database trigger `trigger_insert_bibit_stocks` agar bibit baru otomatis terisi 3500 ml di semua toko.
  - [x] Update action `getBibitStocks` dan `updateBibitStock` di `src/app/admin/(dashboard)/stok/actions.ts` untuk menggunakan `stock_ml`.
  - [x] Redesign UI tabel Stok Bibit di `src/app/admin/(dashboard)/stok/page.tsx` (hapus kolom segel 500/1000 & sisa 500/1000, ganti dengan input langsung mililiter + badge konversi botol @500ml, ganti alert bawaan ke toast sonner).
  - [x] Update kalkulasi stok bibit di `src/app/admin/(dashboard)/statistik/barang/BarangClient.tsx`.
  - [x] Implementasi fungsi pemotongan stok bibit otomatis (`deductRefillStock`) saat transaksi refill terjadi (Checkout Tunai, Webhook Mayar QRIS, dan Admin markAsPaid) dengan pemotongan bibit, pelarut absolute, dan botol packaging sekaligus cek idempotency.
- [x] Integrasi ulang API Mayar dan Biteship (Sandbox & Production) termasuk sinkronisasi Custom Refill.
- [x] Perbaikan error float harga desimal pada penyimpanan order_items di Custom Refill.
- [x] Buat script testing untuk aktivasi API Biteship (Order terkirim & dibatalkan).
- [x] Instalasi Ollama untuk Windows.
- [x] Pull model `llama3.1` (8B) secara lokal.
- [x] Buat script eksekutor `fix-perfumes-ollama.js` dengan JSON-mode REST API.
- [x] Evaluasi rules dan prioritas penggunaan Gemini Flash + Grounding.
- [x] Modifikasi `fix-perfumes.js` untuk rotasi model.
- [x] Tangani error API limitasi dengan menambahkan logika retry untuk error 503 (High Demand).
