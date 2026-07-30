"use client";

import { PageHeader } from "@/components/page-header";
import { RefillWizard } from "@/components/refill/RefillWizard";
import { BibitData, BottleData, RefillMode } from "@/components/refill/types";

interface WizardClientPageProps {
  bibits: BibitData[];
  bottles: BottleData[];
  initialMode?: RefillMode;
}

export default function WizardClientPage({ bibits, bottles, initialMode }: WizardClientPageProps) {
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
        style={{
          flex: 1,
          padding: "100px 24px 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <RefillWizard
          initialMode={initialMode}
          bibits={bibits}
          bottles={bottles}
        />
      </main>
    </div>
  );
}
