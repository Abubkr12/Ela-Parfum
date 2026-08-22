const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/page-header.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const overlayOld = `{/* Mobile nav overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            top: "64px",
            zIndex: 99,
            background: "var(--c-bg)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            animation: "fadeSlideIn 200ms var(--ease-out) both",
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: "14px 16px",
                borderRadius: "var(--r-md)",
                fontSize: "1rem",
                fontWeight: 500,
                color:
                  pathname === link.href || pathname.startsWith(link.href.replace("/#", "/"))
                    ? "var(--c-gold)"
                    : "var(--c-ink-muted)",
                background:
                  pathname === link.href || pathname.startsWith(link.href.replace("/#", "/"))
                    ? "var(--c-gold-dim)"
                    : "transparent",
                transition: "all 140ms",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}`;

const overlayNew = `{/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            display: "flex",
          }}
        >
          <div 
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              animation: "fadeSlideIn 200ms ease-out both"
            }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            style={{
              position: "relative",
              width: "280px",
              height: "100%",
              background: "var(--c-bg)",
              borderRight: "1px solid var(--c-border)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              animation: "slideInLeft 250ms cubic-bezier(0.16, 1, 0.3, 1) both"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <img src="/assets/Ela Parfum.svg" alt="Ela Parfum Logo" style={{ height: "32px", width: "auto" }} />
              <button className="btn-icon" onClick={() => setMobileOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--r-md)",
                  fontSize: "1rem",
                  fontWeight: 500,
                  color:
                    pathname === link.href || pathname.startsWith(link.href.replace("/#", "/"))
                      ? "var(--c-gold)"
                      : "var(--c-ink-muted)",
                  background:
                    pathname === link.href || pathname.startsWith(link.href.replace("/#", "/"))
                      ? "var(--c-gold-dim)"
                      : "transparent",
                  transition: "all 140ms",
                  display: "flex",
                  alignItems: "center",
                  gap: 12
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}`;

content = content.replace(overlayOld, overlayNew);

// Replace generic LF and CRLF just in case
content = content.replace(overlayOld.replace(/\n/g, '\r\n'), overlayNew.replace(/\n/g, '\r\n'));

fs.writeFileSync(filePath, content, 'utf8');
console.log('page-header.tsx sidebar updated');
