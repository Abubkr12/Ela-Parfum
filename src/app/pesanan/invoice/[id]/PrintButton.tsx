"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--c-gold)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
    >
      <Printer size={16} /> Cetak Invoice
    </button>
  );
}
