const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src/app/globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

const utilityCSS = `
/* ─────────────────────────────────────────
   MOBILE RESPONSIVE OVERRIDES (Global)
───────────────────────────────────────── */
.topbar__hamburger { display: none; }

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-100%); }
  to { opacity: 1; transform: translateX(0); }
}

/* ─────────────────────────────────────────
   RESPONSIVE
───────────────────────────────────────── */
@media (max-width: 1080px) {`;

css = css.replace(
  '/* ─────────────────────────────────────────\r\n   RESPONSIVE\r\n───────────────────────────────────────── */\r\n@media (max-width: 1080px) {',
  utilityCSS
);
// LF fallback
css = css.replace(
  '/* ─────────────────────────────────────────\n   RESPONSIVE\n───────────────────────────────────────── */\n@media (max-width: 1080px) {',
  utilityCSS
);

const media768_orig = `@media (max-width: 768px) {
  .hero__content {`;

const media768_new = `@media (max-width: 768px) {
  .topbar__nav { display: none; }
  .topbar__hamburger { display: inline-flex; }
  
  /* OVERRIDE INLINE GRIDS */
  [style*="1fr 1fr"],
  [style*="1fr 380px"],
  [style*="1fr 400px"],
  [style*="1fr 420px"],
  [style*="280px 1fr"],
  [style*="300px 1fr"] {
    grid-template-columns: 1fr !important;
  }
  
  /* OVERRIDE keranjang items */
  [style*="60px 1fr auto auto auto"] {
    grid-template-columns: 60px 1fr !important;
    gap: 12px !important;
  }
  [style*="60px 1fr auto auto auto"] > *:nth-child(3),
  [style*="60px 1fr auto auto auto"] > *:nth-child(4),
  [style*="60px 1fr auto auto auto"] > *:nth-child(5) {
    grid-column: span 2;
  }

  /* OVERRIDE massive paddings */
  [style*="120px 24px"],
  [style*="100px 24px"] {
    padding-top: 40px !important;
    padding-bottom: 40px !important;
  }
  
  [style*="padding: 40px"],
  [style*="padding: '40px'"],
  [style*='padding: "40px"'],
  [style*="padding: 32px"],
  .card {
    padding: 20px !important;
  }

  .hero__content {`;

css = css.replace(media768_orig, media768_new);
css = css.replace(media768_orig.replace(/\n/g, '\r\n'), media768_new.replace(/\n/g, '\r\n'));

// Remove old 520px topbar__nav hide
css = css.replace(/\.topbar__nav\s*\{\s*display:\s*none;\s*\}/g, '');

fs.writeFileSync(cssPath, css, 'utf8');
console.log('globals.css updated perfectly');
