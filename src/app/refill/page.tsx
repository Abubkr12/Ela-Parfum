"use client";

import { PageHeader } from "@/components/page-header";
import { Sparkles, Camera, FlaskConical, ArrowRight, Beaker } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const methods = [
  {
    id: "ai",
    title: "Refill via AI",
    description: "Jelaskan parfum impian Anda, AI kami akan merekomendasikan bibit yang tepat dari koleksi kami.",
    icon: Sparkles,
    color: "var(--c-gold)",
    bgColor: "rgba(59, 130, 246, 0.08)",
    hoverShadow: "rgba(59, 130, 246, 0.18)",
  },
  {
    id: "gambar",
    title: "Refill via Gambar",
    description: "Upload foto botol parfum referensi Anda. AI akan mengidentifikasi merek dan mencarikan bibit yang sesuai.",
    icon: Camera,
    color: "#0ea5e9",
    bgColor: "rgba(14, 165, 233, 0.08)",
    hoverShadow: "rgba(14, 165, 233, 0.18)",
  },
  {
    id: "custom",
    title: "Refill Custom",
    description: "Pilih 1 atau lebih bibit parfum untuk menciptakan aroma unik Anda sendiri. AI akan menganalisis hasilnya.",
    icon: FlaskConical,
    color: "#a855f7",
    bgColor: "rgba(168, 85, 247, 0.08)",
    hoverShadow: "rgba(168, 85, 247, 0.18)",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { y: 24, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 22 },
  },
};

export default function RefillLandingPage() {
  return (
    <div className="customer-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PageHeader />

      <main className="refill-main" style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        paddingTop: "var(--page-pad-y, 100px)", 
        paddingRight: "24px",
        paddingBottom: "48px", 
        paddingLeft: "24px" 
      }}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          style={{ maxWidth: 1000, width: "100%", textAlign: "center" }}
        >
          <motion.div
            variants={itemVariants}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 18px", borderRadius: 100,
              background: "var(--c-gold-dim)", color: "var(--c-gold)",
              marginBottom: 24, fontSize: "0.88rem", fontWeight: 500,
            }}
          >
            <Beaker size={16} />
            Layanan Refill Parfum
          </motion.div>

          <motion.h1
            variants={itemVariants}
            style={{
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontFamily: "var(--font-display)", fontWeight: 700,
              color: "var(--c-ink)", marginBottom: 20,
              lineHeight: 1.1, letterSpacing: "-0.5px",
            }}
          >
            Pilih Cara Refill Parfum Anda
          </motion.h1>

          <motion.p
            variants={itemVariants}
            style={{
              fontSize: "1.05rem", color: "var(--c-ink-dim)",
              maxWidth: 620, margin: "0 auto 48px auto", lineHeight: 1.65,
            }}
          >
            Tiga metode cerdas untuk meracik parfum custom sesuai selera Anda.
            Mulai dari deskripsi, foto referensi, atau campurkan bibit sendiri.
          </motion.p>

          <div className="refill-methods-grid">
            {methods.map((method) => {
              const Icon = method.icon;
              return (
                <motion.div key={method.id} variants={itemVariants}>
                  <Link
                    href={`/refill/wizard?mode=${method.id}`}
                    className="refill-method-card"
                    style={{
                      display: "flex", flexDirection: "column", height: "100%",
                      padding: 28, borderRadius: "var(--r-lg)",
                      background: "var(--c-surface-1)",
                      border: "1px solid var(--c-border)",
                      textDecoration: "none",
                      transition: "all 0.3s var(--ease-out)",
                      position: "relative", overflow: "hidden",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 56, height: 56, borderRadius: 14,
                      background: method.bgColor, color: method.color,
                      marginBottom: 20, transition: "transform 0.3s var(--ease-spring)",
                    }}>
                      <Icon size={28} />
                    </div>

                    <h3 style={{
                      fontSize: "1.3rem", fontWeight: 700,
                      fontFamily: "var(--font-display)",
                      color: "var(--c-ink)", marginBottom: 10,
                    }}>
                      {method.title}
                    </h3>

                    <p style={{
                      color: "var(--c-ink-dim)", marginBottom: 28,
                      lineHeight: 1.6, flex: 1, fontSize: "0.92rem",
                    }}>
                      {method.description}
                    </p>

                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      color: method.color, fontWeight: 600, fontSize: "0.92rem",
                      marginTop: "auto", transition: "gap 0.3s var(--ease-out)",
                    }}>
                      Mulai Meracik <ArrowRight size={18} />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .refill-method-card:hover {
          transform: translateY(-4px);
          border-color: var(--c-border-mid) !important;
          box-shadow: 0 12px 32px rgba(0,0,0,0.08) !important;
        }
        .refill-method-card:hover div:first-child {
          transform: scale(1.08);
        }
        @media (max-width: 520px) {
          .refill-method-card {
            padding: 22px !important;
          }
        }
      `}} />
    </div>
  );
}
