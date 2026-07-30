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
