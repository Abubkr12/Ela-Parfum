# Database Schema Topology — Supabase PostgreSQL

## Core Tables & Relations
- `stores`: Daftar cabang toko fisik (id, name, address, latitude, longitude)
- `perfumes` / `bibits`: Katalog bibit parfum (id, name, slug, brand, category, notes, prices)
- `bottles`: Katalog botol dan ukuran volume (id, name, volume_ml, price, image_url)
- `orders`: Transaksi pesanan (id, user_id, store_id, total_amount, status, payment_method, channel [POS/WEB])
- `order_items`: Rincian item pesanan terhubung ke order_id
- `vouchers`: Kode diskon dan potongan ongkir
- `product_stocks`: Stok terdistribusi per produk dan per cabang toko

## Security & Constraints
- RLS diaktifkan pada semua tabel publik
- Kebijakan otentikasi role `authenticated` untuk manipulasi data kasir/admin
- Integritas relasi foreign key terisolasi dengan cascade behavior yang aman
