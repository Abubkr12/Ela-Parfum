"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileSpreadsheet, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { syncApiKeys } from "./actions";

export default function ApiSyncPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleSync = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await syncApiKeys(formData);
      setResult({ success: res.success, message: res.message || "" });
      if (res.success) {
        toast.success(res.message);
        setFile(null);
      } else {
        toast.error(res.message || "Gagal melakukan sync");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan sync");
      setResult({ success: false, message: err.message || "Gagal melakukan sync" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/admin/pengaturan" className="btn btn-outline" style={{ padding: 8, borderRadius: "var(--r-full)" }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontFamily: "var(--font-display)", color: "var(--c-ink)" }}>Sync API Key</h1>
          <p style={{ color: "var(--c-ink-muted)", fontSize: "0.9rem" }}>Import API Keys dan Models dari file Excel ke Database</p>
        </div>
      </div>

      <div className="card mobile-pad-reduce" style={{ padding: 32, background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)" }}>
        
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 8 }}>Upload File Excel</h2>
          <p style={{ fontSize: "0.9rem", color: "var(--c-ink-dim)" }}>
            Sistem akan secara otomatis mencari kolom yang berisi format API Key Gemini (dimulai dengan "AIza...") dan list model yang didukung, lalu menyimpannya ke database.
          </p>
        </div>

        <div 
          style={{ 
            border: "2px dashed var(--c-border)", 
            borderRadius: "var(--r-md)", 
            padding: "40px 20px", 
            textAlign: "center",
            background: "var(--c-surface-2)",
            marginBottom: 24,
            transition: "all 0.2s"
          }}
        >
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileChange} 
            style={{ display: "none" }} 
            id="excel-upload"
          />
          <label 
            htmlFor="excel-upload" 
            style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              gap: 12,
              cursor: "pointer"
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: file ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: file ? "#10b981" : "var(--c-gold)" }}>
              {file ? <FileSpreadsheet size={32} /> : <Upload size={32} />}
            </div>
            
            {file ? (
              <div>
                <p style={{ fontWeight: 600, color: "var(--c-ink)", margin: 0 }}>{file.name}</p>
                <p style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", margin: "4px 0 0 0" }}>{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 600, color: "var(--c-ink)", margin: 0 }}>Pilih File Excel (.xlsx)</p>
                <p style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", margin: "4px 0 0 0" }}>Klik area ini untuk mencari file</p>
              </div>
            )}
          </label>
        </div>

        {result && (
          <div style={{ 
            padding: 16, 
            borderRadius: "var(--r-md)", 
            marginBottom: 24,
            background: result.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${result.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            display: "flex",
            alignItems: "flex-start",
            gap: 12
          }}>
            <div style={{ color: result.success ? "#10b981" : "#ef4444", marginTop: 2 }}>
              {result.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
            </div>
            <div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: 600, color: result.success ? "#065f46" : "#991b1b" }}>
                {result.success ? "Sync Berhasil" : "Sync Gagal"}
              </h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: result.success ? "#064e3b" : "#7f1d1d" }}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSync}
            disabled={!file || loading}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", opacity: (!file || loading) ? 0.5 : 1 }}
          >
            <RefreshCw size={18} style={{ animation: loading ? "spin 2s linear infinite" : "none" }} />
            {loading ? "Menyinkronkan..." : "Mulai Sync"}
          </button>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
