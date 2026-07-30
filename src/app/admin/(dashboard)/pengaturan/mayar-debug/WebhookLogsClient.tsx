"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Database, Eye, RefreshCw, AlertCircle, Search, X } from "lucide-react";
import { getWebhookLogs } from "./actions";

export default function WebhookLogsClient() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getWebhookLogs();
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)" }}>Mayar Debug (Webhook Logs)</h2>
          <p style={{ color: "var(--c-ink-dim)" }}>Pantau semua webhook yang masuk dari Mayar untuk kebutuhan integrasi pembayaran.</p>
        </div>
        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <RefreshCw size={18} className={loading ? "spin" : ""} />
          {loading ? "Memuat..." : "Refresh Logs"}
        </button>
      </div>

      <div style={{ background: "var(--c-surface)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border)", overflow: "hidden" }}>
        {loading && logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-ink-dim)" }}>
            <RefreshCw className="spin" size={24} style={{ margin: "0 auto 12px" }} />
            <p>Memuat log webhook...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-ink-dim)" }}>
            <Database size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
            <p>Belum ada data webhook masuk.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
              <thead>
                <tr style={{ background: "var(--c-surface-2)", borderBottom: "1px solid var(--c-border)", textAlign: "left" }}>
                  <th style={{ padding: "16px 20px", fontWeight: 600, color: "var(--c-ink)" }}>Waktu</th>
                  <th style={{ padding: "16px 20px", fontWeight: 600, color: "var(--c-ink)" }}>Event</th>
                  <th style={{ padding: "16px 20px", fontWeight: 600, color: "var(--c-ink)" }}>Order Code / Info</th>
                  <th style={{ padding: "16px 20px", fontWeight: 600, color: "var(--c-ink)" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  let orderCode = "-";
                  let amount = "";
                  if (log.payload) {
                    const data = log.payload.data || log.payload;
                    orderCode = data.referenceId || data.reference_id || data.transactionId || orderCode;
                    if (data.amount) {
                      amount = `(Rp ${data.amount.toLocaleString('id-ID')})`;
                    }
                  }

                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--c-border)" }}>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ color: "var(--c-ink)", fontWeight: 500 }}>
                          {format(new Date(log.created_at), "dd MMM yyyy", { locale: localeId })}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>
                          {format(new Date(log.created_at), "HH:mm:ss")}
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ 
                          display: "inline-block", 
                          padding: "4px 10px", 
                          borderRadius: 20, 
                          fontSize: "0.8rem", 
                          fontWeight: 600,
                          background: log.event_type.includes('success') || log.event_type.includes('paid') ? "rgba(34, 197, 94, 0.1)" : "rgba(59, 130, 246, 0.1)",
                          color: log.event_type.includes('success') || log.event_type.includes('paid') ? "var(--c-teal)" : "var(--c-blue)"
                        }}>
                          {log.event_type}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontWeight: 500 }}>{orderCode}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>{amount}</div>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="btn btn-outline"
                          style={{ padding: "6px 12px", height: "auto", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <Eye size={16} /> Lihat JSON
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Viewer Modal */}
      {selectedLog && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 24
        }}>
          <div style={{
            background: "var(--c-surface)",
            borderRadius: "var(--r-md)",
            width: "100%",
            maxWidth: 800,
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--c-border)" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Detail Webhook: {selectedLog.event_type}</h3>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--c-ink-dim)" }}
              >
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              <pre style={{ 
                background: "#1e1e1e", 
                color: "#d4d4d4", 
                padding: 20, 
                borderRadius: 8, 
                fontSize: "0.9rem",
                overflowX: "auto",
                fontFamily: "monospace"
              }}>
                {JSON.stringify(selectedLog.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
