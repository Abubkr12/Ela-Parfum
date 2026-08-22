const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src/app/globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

const utilityCSS = `
/* ─────────────────────────────────────────
   MOBILE RESPONSIVE UTILITIES (Global)
───────────────────────────────────────── */
.grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.grid-sidebar-right { display: grid; grid-template-columns: 1fr 380px; gap: 32px; align-items: start; }
.grid-sidebar-left { display: grid; grid-template-columns: 280px 1fr; gap: 32px; align-items: start; }
.flex-between-wrap { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.mobile-stack { display: flex; gap: 16px; }
.product-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }
.admin-dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; align-items: start; }

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

// Fallback for LF line endings
css = css.replace(
  '/* ─────────────────────────────────────────\n   RESPONSIVE\n───────────────────────────────────────── */\n@media (max-width: 1080px) {',
  utilityCSS
);

// Update 768px breakpoint
const media768_orig = `@media (max-width: 768px) {
  .hero__content {`;

const media768_new = `@media (max-width: 768px) {
  .topbar__nav { display: none; }
  .topbar__hamburger { display: inline-flex; }
  .grid-2-col, .grid-sidebar-right, .grid-sidebar-left { grid-template-columns: 1fr !important; }
  .mobile-stack { flex-direction: column !important; }
  .mobile-pad-reduce { padding: 20px !important; }
  .mobile-pad-y-reduce { padding-top: 40px !important; padding-bottom: 40px !important; }
  .product-detail-grid { grid-template-columns: 1fr !important; }
  .admin-dashboard-grid { grid-template-columns: 1fr !important; }

  .hero__content {`;

css = css.replace(media768_orig, media768_new);
css = css.replace(media768_orig.replace(/\n/g, '\r\n'), media768_new.replace(/\n/g, '\r\n'));

// Remove old 520px topbar__nav hide
css = css.replace(/\.topbar__nav\s*\{\s*display:\s*none;\s*\}/g, '');

fs.writeFileSync(cssPath, css, 'utf8');
console.log('globals.css updated');
