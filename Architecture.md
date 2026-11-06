# Architecture & Security Topology — Ela Parfum

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Deployment Platform:** Cloudflare Workers via `@opennextjs/cloudflare` + `wrangler`
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Storage)
- **Payment Gateways:** Mayar (QRIS/E-Wallet/VA), Midtrans
- **Logistics & Tracking:** Biteship API
- **Styling & Motion:** Tailwind CSS, Framer Motion, Motion, Lucide Icons

## Dependency & Security Graph

```mermaid
graph TD
    Client["User Browser / POS Kasir"] -->|HTTPS / API| CFWorker["Cloudflare Worker (OpenNext)"]
    CFWorker -->|App Router Runtime| NextJS["Next.js Core (16.4.3 Patched)"]
    
    subgraph CoreFrameworks ["Core Frameworks & Runtimes"]
        NextJS --> React["React & React-DOM (19.3.x)"]
        NextJS --> OpenNext["@opennextjs/cloudflare (1.20.x)"]
        OpenNext --> Wrangler["Wrangler & Miniflare (Patched Undici & Sharp)"]
    end

    subgraph SecuritySurface ["Attack Surface & Patching Status"]
        CVE_Next["Next.js Cache & RCE"] -->|Patched by 16.4.3| NextJS
        CVE_Proxy["proxy-addr Spoofing"] -->|Patched by 2.0.8| NextJS
        CVE_Undici["Undici SSRF/DoS"] -->|Patched by 7.29.1| Wrangler
        CVE_Sharp["Sharp librsvg"] -->|Patched by 0.35.5| Wrangler
        CVE_Postcss["PostCSS Path Traversal"] -->|Patched by 8.5.31| NextJS
        CVE_XLSX["xlsx Prototype Pollution"] -->|Isolate / Remove from Prod| OfflineScripts["Offline Migration Scripts Only"]
    end

    subgraph ExternalServices ["External Cloud Services"]
        NextJS --> Supabase["Supabase (RLS Protected)"]
        NextJS --> Mayar["Mayar Webhook & API (HMAC Verified)"]
        NextJS --> Biteship["Biteship Logistics"]
    end
```

## Keputusan Arsitektur Keamanan
1. **Targeted Patching over Major Bumping:** Menghindari upgrade major blind (`npm update` sembarangan) yang merusak integrasi Cloudflare OpenNext dan TypeScript.
2. **Isolasi Modul Rentan (`xlsx`):** Mengeliminasi modul parser rentan dari bundle production karena seluruh operasi Excel runtime web ditangani oleh `exceljs`.
3. **Zero-Downtime Patch:** Menjamin build Turbopack dan build worker Cloudflare 100% hijau sebelum perilisan.
