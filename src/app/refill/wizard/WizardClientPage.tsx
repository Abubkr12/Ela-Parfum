"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { RefillWizard } from "@/components/refill/RefillWizard";
import { BibitData, BottleData, RefillMode } from "@/components/refill/types";
import { Loader2 } from "lucide-react";

interface WizardClientPageProps {
  bibits?: BibitData[];
  bottles?: BottleData[];
  initialMode?: RefillMode;
}

export default function WizardClientPage({
  bibits: initialBibits,
  bottles: initialBottles,
  initialMode,
}: WizardClientPageProps) {
  const [bibits, setBibits] = useState<BibitData[]>(initialBibits || []);
  const [bottles, setBottles] = useState<BottleData[]>(initialBottles || []);
  const [loading, setLoading] = useState(!initialBibits?.length);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialBibits?.length && initialBottles?.length) return;

    let isMounted = true;
    async function loadCatalog() {
      try {
        setLoading(true);
        const res = await fetch("/api/refill/catalog");
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Gagal memuat katalog");
        }
        if (isMounted) {
          setBibits(json.bibits || []);
          setBottles(json.bottles || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Gagal memuat katalog racikan.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [initialBibits, initialBottles]);

  return (
    <div
      className="customer-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--c-bg)",
      }}
    >
      <PageHeader />

      <main
        className="wizard-main"
        style={{
          flex: 1,
          paddingTop: "100px",
          paddingRight: "24px",
          paddingBottom: "100px",
          paddingLeft: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "80px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              color: "var(--c-ink-dim)",
            }}
          >
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--c-gold)" }} />
            <p style={{ fontSize: "0.95rem" }}>Menyiapkan katalog bibit & racikan parfum...</p>
          </div>
        ) : error ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--c-rose)",
            }}
          >
            <p style={{ marginBottom: 16 }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-secondary"
              style={{ padding: "8px 18px", fontSize: "0.85rem" }}
            >
              Muat Ulang Halaman
            </button>
          </div>
        ) : (
          <RefillWizard
            initialMode={initialMode}
            bibits={bibits}
            bottles={bottles}
          />
        )}
      </main>
    </div>
  );
}
