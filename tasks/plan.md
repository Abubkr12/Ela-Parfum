# Implementation Plan: Unified Refill Cart & Katalog Bibit (Refill Manual)

## Overview
Implementasi dua kapabilitas utama pada sistem e-commerce Ela Parfum:
1. **Refill Masuk Keranjang (Add to Cart for Refill)**: Memungkinkan pengguna memasukkan racikan hasil wizard Refill (AI, Gambar, Custom) ke dalam keranjang belanja (`CartContext`) dengan pengaturan kuantitas, resep racikan utuh, dan checkout gabungan, **tanpa mengganggu alur "Bayar Sekarang" langsung (`/checkout/custom/[id]`) yang sudah berjalan stabil**.
2. **Katalog Bibit & Refill Manual**: Menambahkan Katalog Bibit (740+ varian bibit) di `/katalog` dengan sistem serverless-friendly (anti Error 1102 Cloudflare), modal cepat pilih varian (Rasio, Botol Ela / Bawa Botol Sendiri dengan slider 1-1000ml), halaman detail bibit (`/bibit/[slug]`), dan 5 aset gambar preview botol berlogo Ela Parfum (termasuk visual orang menyemprot parfum berlatar putih elegan).

---

## Architecture Decisions & Cloudflare Protection

### 1. Zero-Regression Alur Refill Eksisting
- **Prinsip**: Alur "Bayar Sekarang" langsung yang sudah ada (membuat record `custom_requests` dan langsung mengarahkan ke `/checkout/custom/[id]`) **tetap dipertahankan 100% utuh tanpa diubah sedikitpun**.
- **Penambahan**: Di samping tombol "Bayar Sekarang", ditambahkan tombol baru **"Tambah ke Keranjang"**. Jika tombol ini ditekan, racikan dimasukkan ke `CartContext` sehingga pelanggan bisa memesan beberapa racikan sekaligus atau mengatur jumlah kuantitas botol racikan yang sama.

### 2. Unified Cart Data Structure (Polymorphic Cart Item)
- **Keputusan**:
  - Ganti identifier item di cart menjadi string composite `cartItemId` (misal: `regular-${sizeId}` untuk parfum reguler, dan `refill-${Date.now()}-${random}` untuk racikan refill).
  - Tambahkan payload opsional `refillData` pada `CartItem`:
    ```typescript
    export interface RefillCartData {
      mode: 'ai' | 'gambar' | 'custom' | 'manual';
      customName: string;
      ratio: '30/70' | '50/50' | '70/30' | '100/0';
      volumeMl: number;
      bottle: { id?: number | null; name: string; capacity_ml: number; price: number };
      useOwnBottle: boolean;
      ownBottleVolumeMl?: number;
      bibits: { id: number; name: string; volumeMl: number; pricePerMl: number }[];
      technicalRecipe?: string;
      adminRecipe?: string;
    }
    ```
  - Tetapkan `itemType: 'regular' | 'refill'` agar UI keranjang dan checkout utama tahu cara memproses item.

### 3. Serverless & Cloudflare Free Protection (Anti Error 1102)
- **Kondisi**: Cloudflare Workers membatasi CPU time maks 10ms per request. Merender 740 bibit secara SSR dengan join database berat akan memicu Error 1102.
- **Solusi**:
  - Bungkus komponen katalog bibit dengan `dynamic(..., { ssr: false })` atau ambil data bibit via client-side fetch endpoint `/api/bibits` (hanya kolom ringan: `id, name, slug, collection, intensity, main_accord, price_per_ml`).
  - Lakukan search, filtering, dan pagination (24-36 item per halaman) secara client-side di memori browser. CPU server Cloudflare tetap aman di bawah 1ms.

### 4. Smart Catalog Tab Visibility
- **Logic**:
  - Pindai ketersediaan produk: jika tabel `perfumes` kosong (0 rows) dan tabel `bibit` memiliki data, `/katalog` otomatis menampilkan **Katalog Bibit** secara langsung tanpa menampilkan state kosong parfum jadi.
  - Jika kedua tabel memiliki produk, tab selector `[Katalog Parfum]` dan `[Katalog Bibit]` akan aktif otomatis.

### 5. 5 Mockup Visual Botol Ela Parfum (White Studio Luxury)
- **Referensi Bentuk Botol**: Diambil dari data riil di `C:\Users\Abu Bakar Al Adny\Downloads\Botol Ela Parfum` (Casa, Lacoste, Dhermes, XX/Pot).
- **Spesifikasi 5 Gambar**:
  1. **Botol Casa**: Botol kaca Casa elegan berisi parfum warna golden amber dengan branding mewah "Ela Parfum", latar belakang studio putih bersih (#FFFFFF).
  2. **Botol Lacoste**: Botol kaca Lacoste elegan berisi parfum dengan branding "Ela Parfum", latar putih studio.
  3. **Botol Dhermes**: Botol kaca Dhermes mewah berisi parfum dengan branding "Ela Parfum", latar putih studio.
  4. **Botol XX / Pot**: Botol kaca XX/Pot elegan berisi parfum dengan branding "Ela Parfum", latar putih studio.
  5. **Action Shot (Spray Preview)**: Visual elegan model menyemprotkan parfum Ela Parfum ke leher/tubuh dengan butiran mist halus di atas studio putih bersih.
- **Lokasi Penyimpanan**: `public/images/bottles/preview/` (bottle-1.webp s/d bottle-5.webp).

### 6. Slider Bawa Botol Sendiri
- **Rentang**: 1 ml s/d 1000 ml sesuai permintaan klien.
- **Kontrol UI**: Range slider interaktif + input angka langsung (agar presisi jika ingin mengetik 30, 50, 100, dll).
- **Fulfillment**: Otomatis mengarahkan ke pengambilan langsung di toko (*pickup*) karena botol fisik dibawa oleh pelanggan.

---

## Task List

### Phase 1: Aset Gambar & Pondasi Keranjang

#### Task 1: Generate & Siapkan 5 Mockup Botol Ela Parfum
**Description:** Buat 5 gambar studio berlatar putih bersih (#FFFFFF) mengacu pada bentuk botol Casa, Lacoste, Dhermes, XX/Pot berlabel "Ela Parfum" plus 1 gambar preview orang menyemprotkan parfum.
**Acceptance criteria:**
- [ ] Tersedia 5 gambar di `public/images/bottles/preview/`:
  - `bottle-casa.webp` (Botol Casa berisi parfum amber emas berlogo Ela Parfum)
  - `bottle-lacoste.webp` (Botol Lacoste berisi parfum berlogo Ela Parfum)
  - `bottle-dhermes.webp` (Botol Dhermes berisi parfum berlogo Ela Parfum)
  - `bottle-xxpot.webp` (Botol XX/Pot berisi parfum berlogo Ela Parfum)
  - `bottle-spray-action.webp` (Orang menyemprot parfum Ela Parfum ke badan/leher)
- [ ] Visual mewah, latar belakang putih studio, bebas watermark.
**Verification:**
- [ ] Gambar dapat dibuka dan diakses melalui URL lokal Next.js.
**Dependencies:** None
**Files likely touched:**
- `public/images/bottles/preview/*`
**Estimated scope:** Small (Asset generation)

#### Task 2: Refactor Cart Types & CartContext (Polymorphic Refill Support)
**Description:** Perluas antarmuka `CartItem` dan `CartContext` agar dapat menampung item refill maupun item parfum reguler tanpa mengubah perilaku lama.
**Acceptance criteria:**
- [ ] `CartItem` memiliki key unik `cartItemId: string` dan payload `refillData`.
- [ ] Operasi `addItem`, `updateQuantity`, `removeItem` bekerja mulus di memori dan `localStorage`.
- [ ] Tidak ada error kompilasi TypeScript (`npx tsc --noEmit`).
**Verification:**
- [ ] Run `npx tsc --noEmit` lolos 0 error.
**Dependencies:** None
**Files likely touched:**
- `src/lib/types.ts`
- `src/lib/cart-context.tsx`
**Estimated scope:** Medium (2 files)

#### Task 3: Update Halaman Keranjang Belanja (/keranjang)
**Description:** Perbarui tampilan list keranjang untuk mengenali `itemType === 'refill'`, menampilkan nama racikan, rincian botol & rasio, thumbnail mockup botol, dan stepper jumlah kuantitas botol.
**Acceptance criteria:**
- [ ] Item refill tampil estetik dengan badge "Racikan Refill", keterangan botol, dan rasio.
- [ ] Stepper quantity (+) dan (-) mengalikan harga racikan secara proporsional.
- [ ] Subtotal menghitung seluruh item reguler dan refill secara akurat.
**Verification:**
- [ ] Cek halaman `/keranjang` di browser, tes ubah quantity dan hapus item.
**Dependencies:** Task 2
**Files likely touched:**
- `src/app/keranjang/page.tsx`
**Estimated scope:** Medium (1 file)

---

### Checkpoint 1: Aset & Pondasi Keranjang
- [ ] 5 Mockup gambar preview botol tersedia dan tajam.
- [ ] Keranjang mendukung item refill dan regular secara bersamaan.
- [ ] TypeScript check 0 error.

---

### Phase 2: Integrasi Wizard Refill & Checkout Utama

#### Task 4: Tambahkan Opsi "Tambah ke Keranjang" di Wizard Refill
**Description:** Tambahkan tombol "Tambah ke Keranjang" pada `StepPriceSummary.tsx` di samping tombol "Bayar Sekarang", sehingga user bisa memilih untuk memasukkan racikan ke keranjang atau langsung bayar (Beli Sekarang).
**Acceptance criteria:**
- [ ] Tombol "Bayar Sekarang" eksisting tetap berjalan normal ke `/api/custom-requests` -> `/checkout/custom/[id]` (100% tanpa regresi).
- [ ] Tombol "Tambah ke Keranjang" memformat payload racikan ke `CartItem`, memasukkannya ke `CartContext`, dan memunculkan toast notifikasi dengan tombol cepat "Buka Keranjang" atau "Racik Aroma Lain".
**Verification:**
- [ ] Uji wizard refill: klik "Tambah ke Keranjang", pastikan badge keranjang navbar bertambah dan isi keranjang tersimpan.
**Dependencies:** Task 2, Task 3
**Files likely touched:**
- `src/components/refill/StepPriceSummary.tsx`
- `src/components/refill/RefillWizard.tsx`
**Estimated scope:** Medium (2 files)

#### Task 5: Dukungan Checkout Utama untuk Item Refill
**Description:** Perbarui fungsi `processCheckout` di `src/app/checkout/actions.ts` agar saat checkout dari keranjang biasa, item refill dicatat ke `order_items` dan stok `bibit_stocks` serta `bottle_stocks` dipotong dengan tepat.
**Acceptance criteria:**
- [ ] `order_items` mencatat item refill (`perfume_id: null, size_id: null`).
- [ ] Resep racikan teknis dicatat ke kolom `notes` pesanan agar kasir dapat melihat takaran ml di dashboard admin.
- [ ] Pemotongan stok tunai (saat checkout kasir) dan QRIS (saat webhook Mayar) memotong stok bibit & botol menggunakan helper `deductRefillStock`.
**Verification:**
- [ ] Uji submit checkout keranjang berisi racikan refill, cek tabel `orders`, `order_items`, dan log stok.
**Dependencies:** Task 2, Task 4
**Files likely touched:**
- `src/app/checkout/actions.ts`
- `src/app/checkout/page.tsx`
- `src/app/api/webhooks/mayar/route.ts`
**Estimated scope:** Medium (3 files)

---

### Checkpoint 2: Alur Keranjang Refill & Checkout
- [ ] Alur "Bayar Sekarang" langsung tetap berjalan 100% seperti biasa.
- [ ] Alur "Tambah ke Keranjang" berhasil menampung beberapa racikan refill sekaligus.
- [ ] Checkout keranjang berhasil membuat pesanan dan mencatat detail racikan untuk kasir.

---

### Phase 3: Katalog Bibit (Refill Manual) & Halaman Detail

#### Task 6: Endpoint API Bibit Ringan (/api/bibits) & Tab Katalog Otomatis
**Description:** Buat route handler `/api/bibits` yang efisien (< 1ms CPU Cloudflare) dan perbarui `/katalog` dengan logika deteksi otomatis tab: jika parfum kosong, langsung tampilkan Katalog Bibit.
**Acceptance criteria:**
- [ ] Endpoint `/api/bibits` mengembalikan data bibit aktif secara ringkas (hanya kolom yang dibutuhkan UI).
- [ ] Jika tabel `perfumes` kosong, `/katalog` otomatis menampilkan tab Katalog Bibit. Jika kedua tabel terisi, muncul tab switcher `[Katalog Parfum]` dan `[Katalog Bibit]`.
- [ ] Grid bibit memiliki pencarian nama/aroma instan dan paginasi client-side 24 item per halaman (ringan di browser mobile).
**Verification:**
- [ ] Buka `/katalog`, pastikan halaman langsung menampilkan 740 bibit tanpa loading berat atau lag.
**Dependencies:** Task 1
**Files likely touched:**
- `src/app/api/bibits/route.ts`
- `src/app/katalog/page.tsx`
- `src/components/katalog/BibitCatalogGrid.tsx`
**Estimated scope:** Medium (3 files)

#### Task 7: Modal Quick-Buy Varian Bibit (Rasio & Botol 1-1000ml)
**Description:** Buat modal/drawer varian yang muncul saat tombol "+ Keranjang" di kartu bibit ditekan, memungkinkan user memilih Rasio (30/70, 50/50, 70/30, 100/0) dan Botol (daftar botol Ela atau Bawa Botol Sendiri dengan slider 1-1000ml).
**Acceptance criteria:**
- [ ] Modal menampilkan nama bibit, pilihan Rasio (EDT, EDP, Extrait, Murni), dan pilihan Botol.
- [ ] Opsi "Bawa Botol Sendiri" memiliki slider interaktif 1ml - 1000ml dan kotak input angka langsung.
- [ ] Harga terhitung otomatis secara real-time: `(Volume × Rasio % × Harga/ml) + Harga Botol`.
- [ ] Klik "Tambah ke Keranjang" memasukkan racikan manual ini ke `CartContext` dan menutup modal.
**Verification:**
- [ ] Coba atur slider ke 15ml, 50ml, 100ml, dan 500ml; verifikasi hitungan harga sesuai rumus.
- [ ] Item racikan manual berhasil masuk ke keranjang.
**Dependencies:** Task 1, Task 2, Task 6
**Files likely touched:**
- `src/components/katalog/BibitVariantModal.tsx`
**Estimated scope:** Medium (1 file)

#### Task 8: Halaman Detail Bibit (/bibit/[slug])
**Description:** Buat halaman detail bibit lengkap dengan galeri 5 mockup botol Ela Parfum (termasuk preview orang semprot), piramida notes (top, middle, base), deskripsi, dan panel racik varian.
**Acceptance criteria:**
- [ ] Rute dinamis `/bibit/[slug]` memuat data bibit berdasarkan slug.
- [ ] Galeri gambar menampilkan 5 foto mockup botol Ela Parfum dengan thumbnail klik.
- [ ] Komponen piramida notes menampilkan top, middle, base notes secara estetik.
- [ ] Tersedia selector varian (Rasio & Botol/Botol Sendiri 1-1000ml) dan tombol "Tambah ke Keranjang" serta "Beli Sekarang".
**Verification:**
- [ ] Buka `/bibit/baccarat-rouge-540` atau slug bibit lainnya.
- [ ] Semua data aroma, foto botol, dan aksi checkout berjalan lancar.
**Dependencies:** Task 1, Task 2, Task 7
**Files likely touched:**
- `src/app/bibit/[slug]/page.tsx`
- `src/components/bibit/BibitDetailView.tsx`
**Estimated scope:** Large (2 files)

---

### Checkpoint 3: Verifikasi Komprehensif & Build
- [ ] Seluruh 8 task selesai dikerjakan.
- [ ] `npx tsc --noEmit` lolos 0 error.
- [ ] `npm run build` sukses 100% tanpa error prerender / SSR Cloudflare.
- [ ] Uji alur lengkap: Wizard Refill -> Masuk Keranjang -> Buka Katalog Bibit -> Racik Varian -> Masuk Keranjang -> Checkout Bersama -> Verifikasi detail di pesanan admin.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cloudflare Error 1102 (CPU > 10ms) saat render 740 bibit | High | Gunakan client-side data fetching `/api/bibits` dengan seleksi kolom minimal & pagination memori browser 24 item/page. |
| Regresi pada alur Refill "Bayar Sekarang" yang lama | High | Tombol "Bayar Sekarang" dipertahankan 100% ke rute `/checkout/custom/[id]`. "Tambah ke Keranjang" murni sebagai opsi tambahan. |
| Input volume ekstrem pada slider botol sendiri (1ml atau 1000ml) | Medium | Sediakan range slider 1-1000ml yang responsif plus input angka langsung, dan tandai wajib ambil di toko jika bawa botol sendiri. |
| Inkonsistensi stok saat checkout campuran | High | Manfaatkan helper `deductRefillStock` yang sudah teruji di webhook Mayar dan checkout custom untuk memotong stok bibit & botol per cabang. |
