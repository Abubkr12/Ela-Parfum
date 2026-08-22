const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, 'src/app/admin/(dashboard)/layout.tsx');
let content = fs.readFileSync(layoutPath, 'utf8');

if (!content.includes('isMobileOpen')) {
  // Add mobile state
  content = content.replace(
    'const [isCollapsed, setIsCollapsed] = useState(false);',
    'const [isCollapsed, setIsCollapsed] = useState(false);\n  const [isMobileOpen, setIsMobileOpen] = useState(false);'
  );

  // Close mobile sidebar on route change automatically if possible, or just via overlay click
  
  // Replace <aside className={`pro-sidebar ...
  content = content.replace(
    '<aside className={`pro-sidebar ${isCollapsed ? "collapsed" : ""}`}>',
    '{/* Mobile Overlay */}\n      {isMobileOpen && (\n        <div \n          className="pro-sidebar-overlay" \n          onClick={() => setIsMobileOpen(false)} \n        />\n      )}\n      <aside className={`pro-sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}>'
  );

  content = content.replace(
    /<div style=\{\{ fontWeight: 500, color: "var\(--c-ink\)" \}\}>\s*\{navItems\.find.*?\}\s*<\/div>/g,
    '<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>\n            <button \n              className="admin-hamburger"\n              onClick={() => setIsMobileOpen(!isMobileOpen)}\n              style={{ display: "none", background: "none", border: "none", color: "var(--c-ink)", cursor: "pointer", padding: 0 }}\n            >\n              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>\n            </button>\n            <div style={{ fontWeight: 500, color: "var(--c-ink)" }}>\n              {navItems.find(n => pathname === n.href || pathname.startsWith(n.href + "/"))?.name || "Dashboard"}\n            </div>\n          </div>'
  );
  
  // Fix header padding
  content = content.replace(
    'padding: "0 32px"',
    'padding: "0 var(--admin-pad-x, 32px)"'
  );
  // Fix main padding
  content = content.replace(
    'padding: 32,',
    'padding: "var(--admin-pad-x, 32px)",'
  );

  // Fix all Link/a tags to close mobile menu
  content = content.replace(/router\.push\(item\.href\)/g, '(() => { router.push(item.href); setIsMobileOpen(false); })()');
  // Need regex for Link sub-items
  content = content.replace(/<Link href=\{sub\.href\}>/g, '<Link href={sub.href} onClick={() => setIsMobileOpen(false)}>');

  fs.writeFileSync(layoutPath, content, 'utf8');
}

const cssPath = path.join(__dirname, 'src/app/admin/admin.css');
let css = fs.readFileSync(cssPath, 'utf8');

if (!css.includes('.pro-sidebar-overlay')) {
  css += `

/* ─────────────────────────────────────────
   ADMIN MOBILE RESPONSIVE
───────────────────────────────────────── */
@media (max-width: 768px) {
  .admin-hamburger {
    display: block !important;
  }
  
  :root {
    --admin-pad-x: 16px;
  }
  
  .pro-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .pro-sidebar.mobile-open {
    transform: translateX(0);
  }
  
  .pro-sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 999;
    animation: fadeSlideIn 0.2s ease-out;
  }
}
`;
  fs.writeFileSync(cssPath, css, 'utf8');
}
console.log('admin layout updated');
