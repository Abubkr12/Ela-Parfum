const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'admin', '(dashboard)', 'pesanan', '[id]', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /(<div style=\{\{ display: "flex", width: 300, justifyContent: "space-between", fontSize: "1\.1rem", fontWeight: 600, color: "var\(--c-gold\)" \}\}>\s*<span>Total Pembayaran<\/span>\s*<span>\{formatRupiah\(order\.total\)\}<\/span>\s*<\/div>\s*<\/div>\s*<\/div>)/;

const customBlock = `
          {customRequest && customRequest.ai_recipe && (
            <div style={{ marginTop: 24, background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)", position: "relative", overflow: "hidden", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.02)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(45deg, transparent, rgba(0,0,0,0.02))", pointerEvents: "none" }}></div>
              <h3 style={{ fontSize: "1.1rem", color: "var(--c-ink)", fontWeight: 600, marginBottom: 16 }}>Resep Racikan AI (Technical Recipe)</h3>
              
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Saran Nama:</span>
                <p style={{ fontSize: "1.2rem", fontFamily: "var(--font-display)", color: "var(--c-gold)", lineHeight: 1.2, marginTop: 4 }}>{customRequest.ai_recipe?.name_suggestion}</p>
              </div>

              {customRequest.ai_recipe?.admin_recipe ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {customRequest.ai_recipe.admin_recipe.split('\\n').map((line: string, i: number) => {
                    const isSeparator = line.includes('â” â” â” ') || line.includes('===');
                    if (isSeparator || !line.trim()) return null;
                    
                    const isHeader = line.includes('RACIKAN PARFUM');
                    const isTotal = line.includes('Total Volume');
                    
                    return (
                      <div key={i} style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        padding: isHeader || isTotal ? "10px 14px" : "6px 14px",
                        background: isHeader || isTotal ? "var(--c-surface-2)" : "rgba(0,0,0,0.02)",
                        borderRadius: "var(--r-md)",
                        border: "1px solid var(--c-border)",
                        fontWeight: isHeader || isTotal ? 600 : 500,
                        color: isHeader ? "var(--c-gold)" : "var(--c-ink)",
                        fontSize: "0.9rem"
                      }}>
                        <span>{line}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "16px", background: "var(--c-surface-2)", borderRadius: "var(--r-md)", border: "1px dashed var(--c-border)", color: "var(--c-ink-dim)", fontSize: "0.9rem", textAlign: "center" }}>
                  Resep teknikal tidak tersedia atau gagal digenerate.
                </div>
              )}
            </div>
          )}
`;

content = content.replace(regex, `$1\n${customBlock}`);
fs.writeFileSync(file, content);
console.log("Done");
