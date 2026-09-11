# Rules & Architectural Plan — Ela Parfum

## Aturan Utama
1. **Model AI**: Menggunakan `@google/genai` dengan rotasi API keys dari Supabase (`ai_api_keys`) dan fallback `.env.local`.
2. **AI Refill System**:
   - `thinkingBudget: 2048` diaktifkan untuk reasoning/analisis akurasi racikan.
   - `googleSearch: {}` (Search Grounding) diaktifkan khusus mode gambar untuk identifikasi merek parfum secara online.
   - Rotasi API keys otomatis jika terjadi kuota habis / error.
3. **Desain & UI/UX**:
   - Dilarang menggunakan stock emoji untuk icon (wajib gunakan `lucide-react`).
   - Dilarang menggunakan default browser `alert()` (wajib gunakan `toast` dari `sonner`).
   - Menggunakan sistem variabel CSS kustom (`var(--c-gold)`, `var(--c-surface-1)`, `var(--c-bg)`, dll).
   - Aksesibilitas dan responsivitas mobile-first.

## Struktur Project Detail

```
Minyak Wangi/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/              # API Scent Advisor AI 24 Jam
│   │   │   └── refill-analyze/     # API Refill Gemini AI (Thinking + Search Grounding)
│   │   ├── refill/
│   │   │   ├── page.tsx           # Landing Page Refill (3 pilihan metode)
│   │   │   └── wizard/
│   │   │       ├── page.tsx       # Server component (fetch bibit & botol)
│   │   │       └── WizardClientPage.tsx
│   │   └── kustom-refill/
│   │       └── page.tsx           # Deprecated: Redirect ke /refill
│   ├── components/
│   │   ├── chat-widget.tsx        # Floating Chat AI Asisten 24 Jam
│   │   └── refill/
│   │       ├── types.ts           # Type definitions wizard
│   │       ├── RefillWizard.tsx   # Orchestrator & State Machine Wizard
│   │       ├── WizardProgress.tsx # Horizontal Step Progress Bar
│   │       ├── StepMethodSelect.tsx # Card Pilihan 3 Metode
│   │       ├── StepPromptInput.tsx  # Textarea Input Prompt AI
│   │       ├── StepImageUpload.tsx  # Upload & Preview Gambar Refill
│   │       ├── StepBibitSelect.tsx  # Grid Bibit (Filter Tab + Search + Multi-select)
│   │       ├── StepAiResult.tsx     # Tampilan Hasil Analisis AI
│   │       ├── StepRatioSelect.tsx  # Pilihan Rasio 50/50 & 70/30
│   │       ├── StepBottleSelect.tsx # Card Pilihan Botol (Layout 1:1)
│   │       └── StepPriceSummary.tsx # Kalkulasi Rincian Harga & Checkout
│   └── lib/
│       ├── supabase/
│       │   ├── admin.ts           # Admin Supabase Client (Service Role)
│       │   └── client.ts          # Browser Supabase Client
│       └── types.ts               # Database & App Type Definitions
```

## Alur Sistem Refill (Wizard 3 Metode)
1. **Pilih Metode**:
   - *Refill via AI*: Pengguna menjelaskan aroma impian dalam bentuk teks.
   - *Refill via Gambar*: Pengguna mengupload foto botol parfum referensi (Search Grounding aktif).
   - *Multiple Custom*: Pengguna memilih 2+ bibit dari katalog database untuk dicampur.
2. **Analisis AI (Nove AI)**:
   - Memproses input via `/api/refill-analyze` menggunakan Gemini API + Thinking.
   - Menampilkan rekomendasi bibit, campuran aroma (top, middle, base notes), intensitas, dan confidence level.
3. **Pilih Rasio**:
   - *50/50* (Eau De Parfum - 50% Bibit, 50% Pelarut)
   - *70/30* (Extrait De Parfum - 70% Bibit, 30% Pelarut)
4. **Pilih Botol**:
   - Menampilkan varian botol aktif dari database `bottles` dalam bentuk card 1:1.
5. **Kalkulasi & Ringkasan Harga**:
   - `Harga Total = Harga Botol + (Total Volume Bibit * Harga Bibit/ml)`
   - Pelarut: **GRATIS**.
6. **Checkout**:
   - Membuat rekaman pesanan di `custom_requests` dan mengarahkan ke `/checkout/custom/[id]`.

## Arsitektur Stok Multi-Cabang (Revisi Bibit 500ml Base & ML Direct)
1. **Entitas Terpisah**:
   - Stok dipisah dari tabel master (`bibit`, `bottles`, `perfume_sizes`).
   - Tabel master hanya untuk mengatur metadata (nama, deskripsi, notes, harga, dsb) di halaman **Katalog**.
2. **Manajemen Cabang**:
   - Menggunakan tabel `stores` (ID 1: Condet, ID 2: Rawabelong, ID 3: Tangerang).
3. **Jenis Stok**:
   - **Stok Bibit** (`bibit_stocks`):
     - Dikelola murni dalam satuan mililiter (`stock_ml NUMERIC(10,2)`).
     - Tidak ada sistem botol segel / buka (disederhanakan total).
     - Hanya ada ukuran botol fisik 500 ml. Input admin bisa langsung mili (misal 3000 ml = 6 botol @500ml).
     - Stok awal di setiap cabang di-reset menjadi 3500 ml (~7 botol @500ml).
   - **Stok Botol** (`bottle_stocks`): Botol kosong untuk packaging.
   - **Stok Pelarut** (`solvent_stocks`): Pelarut absolute dalam satuan ml (`stock_ml`).
   - **Stok Produk** (`product_stocks`): Parfum racikan/produk jadi per ukuran (`stock_qty`).
4. **Logika Transaksi Refill (Pemotongan Otomatis)**:
   - Setiap transaksi refill yang berhasil (tunai saat checkout, atau QRIS saat webhook Mayar sukses/admin markAsPaid) otomatis memotong `stock_ml` pada tabel `bibit_stocks` di cabang yang bersangkutan sesuai formula racikan (ml).
   - Setiap pemotongan dicatat ke `stock_changelog` (`entity_type = 'bibit'`, `reason = 'sale'`) dengan link `order_id`.
5. **Akses Admin**:
   - Halaman **Stok** (`/admin/stok`) adalah sumber kebenaran (Source of Truth) untuk mutasi barang.
   - Halaman **Katalog** bersifat *read-only* untuk jumlah stok (sum agregasi).
6. **Standar Statistik & Visualisasi Barang**:
   - Visualisasi pergerakan stok menggunakan dual-metric: **Barang Keluar** (Merah / Rose `#EF4444`) dan **Barang Masuk** (Hijau / Emerald `#10B981`) untuk membandingkan inflow dan outflow.
   - Mengingat limit default PostgREST Supabase membatasi 1.000 row per request, query pada tabel bervolume > 1.000 row (seperti `stock_changelog` dan `bibit_stocks`) WAJIB menggunakan batch range pagination agar data multi-cabang (Condet, Rawabelong, Tangerang) tidak terpotong.
7. **Integritas Agregasi & Anti-Duplikasi Stok**:
   - Catatan mutasi bertipe `reason === 'baseline'` adalah snapshot awal database dan dilarang dihitung sebagai transaksi arus masuk/keluar serta dilarang membuat entitas barang baru di luar master katalog.
   - Nama entitas di changelog wajib dinormalisasi (misal pembersihan sufiks kapasitas `(XXml)` pada botol) agar teragregasi tepat ke master entitas.
   - Entitas dengan kondisi `stock === 0 && out === 0 && in === 0` harus diabaikan dari tabel statistik untuk mencegah baris hantu (ghost duplicates).

8. **Standar Arsitektur Dashboard Admin (/admin)**:
   - **Peran Utama**: Berfungsi sebagai *Operational Command Center* terpadu untuk keputusan cepat admin harian (bukan sekadar replika grafik dari `/admin/statistik`).
   - **Bypass RLS & Security**: Menggunakan `createAdminClient()` (Service Role) di Server Component dan Server Actions agar seluruh transaksi pesanan dan stok dari database teragregasi secara akurat tanpa terpotong RLS anon token.
   - **Live Polling & Manual Sync**: Mekanisme auto-refresh setiap 60 detik secara halus tanpa reload browser, disertai tombol manual *Segarkan Data* dengan indikator timestamp relatif dan feedback toast `sonner`.
   - **Radar Stok Kritis Multi-Cabang**: Agregasi stok menipis dengan threshold (bibit < 500ml, botol < 20 pcs, pelarut < 1000ml) dilengkapi filter cabang independen (Semua Cabang, Condet, Rawabelong, Tangerang).
   - **Higienitas Visual**: Wajib 100% menggunakan icon `lucide-react` (dilarang keras menggunakan stock emoji Unicode seperti icon tips), desain responsif mobile-first, dan berpadu selaras dengan sistem variabel CSS (`var(--c-gold)`, `var(--c-surface-1)`, `var(--c-ink)`).

9. **Standar Arsitektur Sistem Pesanan Multi-Cabang & Kasir Toko**:
   - **Struktur Data Cabang**: Menggunakan foreign key `store_id INT REFERENCES stores(id)` dan `fulfillment_type TEXT CHECK (fulfillment_type IN ('delivery', 'pickup'))` pada tabel `orders`.
     - Store 1: Condet (Jakarta Timur)
     - Store 2: Rawa Belong (Jakarta Barat)
     - Store 3: Tangerang (Ciledug)
   - **Routing Jalan Aktual & Geolocation**:
     - Perhitungan jarak pengiriman ke alamat customer menggunakan OpenStreetMap OSRM driving routing API via `getRoadDistance` (`src/lib/stores.ts`) dengan fallback Haversine factor 1.3x circuity.
     - Opsi *Ambil di Toko* memanfaatkan `navigator.geolocation` browser customer untuk mengukur jarak jalan realtime ke ketiga toko fisik.
     - Cabang terdekat secara otomatis direkomendasikan dengan badge highlight emas.
   - **Validasi Stok Multi-Cabang**:
     - Sebelum checkout diizinkan, API `/api/stores/check-stock` memvalidasi stok riil item pesanan (produk jadi di `product_stocks` atau racikan bibit di `bibit_stocks` dan botol di `bottle_stocks`) di ketiga cabang.
     - Toko cabang yang stoknya tidak mencukupi dinonaktifkan dari pilihan customer dengan indikator status badge stok habis.
   - **Integrasi Ongkir Dinamis Biteship**:
     - Endpoint `/api/shipping/rates` menerima parameter dinamis `origin_store_id` untuk menentukan koordinat dan area ID asal penjemputan paket kurir Biteship.
   - **Pemisahan Status Pembayaran vs Pemenuhan**:
     - Tabel Admin `/admin/pesanan` memisahkan secara tegas `Status Pembayaran` (`Menunggu Pembayaran`, `Lunas`, `Ditolak`) dan `Status Pemenuhan` (`Menunggu Diproses`, `Sedang Diracik`, `Siap Diambil di Toko`, `Dalam Pengiriman`, `Selesai`, `Dibatalkan`).
     - Nilai status mentah webhook Mayar (`paid`) dinormalisasi menjadi badge visual `LUNAS` dan tidak lagi muncul sebagai plain text unstyled.
   - **Alur Kasir Toko (Ambil di Toko / Pickup)**:
     - Pesanan pickup tidak menampilkan form input nomor resi kurir di detail pesanan `/admin/pesanan/[id]`.
     - Kasir dapat menekan tombol operasional terarah:
       1. *Tandai Siap Diambil di Toko* (`markAsReadyForPickup`): Mengubah status menjadi `ready_for_pickup`.
       2. *Terima Uang Tunai & Selesaikan Pesanan* (`confirmCashPaymentAndComplete`): Untuk pesanan tunai, mengonfirmasi penerimaan uang, mengubah `payment_status = 'paid'`, `status = 'completed'`, memotong stok cabang pesanan secara otomatis, dan mencatat `stock_changelog`.
       3. *Serahkan Pesanan ke Pelanggan* (`markPickupCompleted`): Untuk pesanan yang sudah dibayar (QRIS), menandai pesanan selesai setelah parfum diserahkan.
   - **Halaman Riwayat & Invoice Pelanggan**:
     - Riwayat pesanan (`/riwayat-pesanan`) dan lembar invoice (`/pesanan/invoice/[id]`, `/riwayat-pesanan/invoice/[id]`, kustom) menampilkan detail nama cabang, alamat lengkap pengambilan, jam buka, dan instruksi bayar tunai di kasir tanpa kebingungan.

10. **Standar Sinkronisasi Stok Produk Detail (/parfum/[id]) & Agregasi Multi-Cabang**:
    - **Single Source of Truth**: Tabel `product_stocks` (dihubungkan via `perfume_size_id` dan `store_id`) adalah sumber kebenaran stok fisik produk jadi di setiap cabang (Condet, Rawabelong, Tangerang).
    - **Bypass Anon RLS via Proxy**: Karena query anonim Supabase browser client tidak memiliki akses SELECT ke `product_stocks`, data varian ukuran untuk halaman publik (`/katalog`, `/parfum/[id]`) wajib diambil melalui endpoint proxy server `/api/product-stocks` (mendukung filter `?perfume_id=...`) yang dieksekusi dengan Service Role Admin client.
    - **Helper Kalkulasi Standar**: Seluruh tampilan UI (kartu katalog, button ukuran di detail produk, chip AI advisor) wajib menggunakan helper `getSizeStock(size)` dan `getTotalStock(sizes)` dari `src/lib/types.ts` yang menjumlahkan `stock_qty` dari relasi `product_stocks`.
    - **Sinkronisasi Otomatis Dual-Write**: Setiap mutasi stok produk di Admin (`/admin/stok`), checkout kasir tunai, atau webhook Mayar QRIS wajib memperbarui `product_stocks` sekaligus meng-update kolom agregat `perfume_sizes.stock` agar konsistensi query lama dan fallback tetap terjaga 100%.
    - **Toleransi URL & Slug**: Halaman `/parfum/[id]` wajib mendukung pencocokan toleran baik slug dash (`-`), underscore (`_`), maupun ID numeric dengan sanitasi `decodeURIComponent` untuk mencegah error 404 atau render kosong.
