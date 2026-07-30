"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { retryWebhook } from "../actions";
import { toast } from "sonner";

export function SyncWebhookButton({ orderCode }: { orderCode: string }) {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      toast.loading("Memicu sinkronisasi Mayar & Biteship...");
      const result = await retryWebhook(orderCode);
      if (result?.error) {
        toast.dismiss();
        toast.error(result.error);
      } else {
        toast.dismiss();
        toast.success("Berhasil sinkronisasi. Cek status terbaru.");
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Gagal sinkronisasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="btn btn-outline"
      style={{ width: "100%", justifyContent: "center", padding: "12px", gap: "8px" }}
    >
      <RefreshCw size={16} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
      {loading ? "Menyinkronkan..." : "Sync Pembayaran Mayar & Resi Biteship"}
    </button>
  );
}
