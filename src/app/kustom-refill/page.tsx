"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Deprecated: Old chatbot refill page — redirect to new refill wizard
export default function KustomRefillRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/refill");
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--c-bg)",
      color: "var(--c-ink-dim)",
      fontFamily: "var(--font-body)",
      fontSize: "0.95rem",
    }}>
      Mengalihkan ke halaman Refill baru...
    </div>
  );
}
