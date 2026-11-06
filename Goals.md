# Goals & Objective

## Tujuan Utama
Melakukan patch keamanan (security hardening) pada dependencies dan framework project Ela Parfum (`minyak-wangi`) untuk menutup celah peretasan (RCE, Prototype Pollution, DoS, IP Spoofing) secara presisi tanpa memicu breaking changes atau kegagalan kompilasi OpenNext Cloudflare.

## Target & Tolok Ukur Keberhasilan
1. **Zero Critical Vulnerabilities:** Menutup celah Next.js RCE (`GHSA-673q-mjm6-r5xr`), cache leak (`GHSA-h694-7cp9-m8p3`), dan `proxy-addr` spoofing (`GHSA-jqcg-44mw-7w3h`).
2. **Zero Breaking Changes:** Memastikan Next.js tetap kompatibel dengan adapter `@opennextjs/cloudflare` dan Cloudflare Workers runtime.
3. **Pembersihan Celah `xlsx`:** Memindahkan atau memotong dependensi `xlsx` yang rentan dari bundle production karena hanya dipakai di skrip lokal lama.
4. **Build Integrity:** `npm run build` dan `npx tsc --noEmit` wajib lulus 100% tanpa error kompilasi.
