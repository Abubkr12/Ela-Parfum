"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { RefillMode, WizardStep, BibitData, BottleData, WizardState, AiAnalysis } from "./types";
import { WizardProgress } from "./WizardProgress";
import { StepMethodSelect } from "./StepMethodSelect";
import { StepPromptInput } from "./StepPromptInput";
import { StepImageUpload } from "./StepImageUpload";
import { StepBibitSelect } from "./StepBibitSelect";
import { StepAiResult } from "./StepAiResult";
import { StepRatioSelect } from "./StepRatioSelect";
import { StepBottleChoice } from "./StepBottleChoice";
import { StepBottleSelect } from "./StepBottleSelect";
import { StepPriceSummary } from "./StepPriceSummary";

interface RefillWizardProps {
  initialMode?: RefillMode;
  bibits: BibitData[];
  bottles: BottleData[];
}

export function RefillWizard({ initialMode, bibits, bottles }: RefillWizardProps) {
  const router = useRouter();
  const wizardRef = useRef<HTMLDivElement>(null);
  
  const [state, setState] = useState<WizardState>({
    mode: initialMode || null,
    step: initialMode ? "input" : "method",
    prompt: "",
    imageBase64: null,
    selectedBibits: [],
    recommendedBibit: null,
    analysis: null,
    ratio: null,
    useOwnBottle: false,
    ownBottleVolumeMl: 30,
    selectedBottle: null,
    loading: false,
    error: null,
  });

  const updateState = (updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const scrollToTop = () => {
    if (wizardRef.current) {
      window.scrollTo({
        top: wizardRef.current.offsetTop - 100,
        behavior: "smooth"
      });
    }
  };

  const handleNextStep = (nextStep: WizardStep) => {
    scrollToTop();
    updateState({ step: nextStep });
  };

  const handleBack = () => {
    scrollToTop();
    const { step, mode } = state;
    if (step === "input") {
      updateState({ step: "method", mode: null, prompt: "", imageBase64: null, selectedBibits: [] });
    } else if (step === "result") {
      updateState({ step: "input", recommendedBibit: null, analysis: null });
    } else if (step === "ratio") {
      updateState({ step: "result", ratio: null });
    } else if (step === "bottle_choice") {
      updateState({ step: "ratio", useOwnBottle: false, selectedBottle: null });
    } else if (step === "bottle") {
      updateState({ step: "bottle_choice", selectedBottle: null });
    } else if (step === "summary") {
      if (state.useOwnBottle) {
        updateState({ step: "bottle_choice" });
      } else {
        updateState({ step: "bottle" });
      }
    }
  };

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Silakan login terlebih dahulu");
      router.push("/login?redirect=/refill");
      return null;
    }
    return user;
  };

  const handleAnalyze = async () => {
    updateState({ step: "analyzing", loading: true, error: null });
    scrollToTop();

    try {
      const res = await fetch("/api/refill-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: state.mode,
          prompt: state.prompt,
          imageBase64: state.imageBase64,
          bibitIds: state.selectedBibits.map(b => b.id)
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menganalisis");

      const result = json.data || json;
      
      let recommendedBibit = null;
      if (state.mode !== "custom" && result.recommendedBibit) {
        // Match the recommended bibit from our local list for complete data
        const found = bibits.find(b => b.id === result.recommendedBibit.id);
        recommendedBibit = found || result.recommendedBibit;
      }

      // For custom mode, use the selected bibits from our state (they have all fields)
      const selectedBibitsResult = state.mode === "custom" 
        ? (result.selectedBibits || state.selectedBibits)
        : state.selectedBibits;

      updateState({
        step: "result",
        loading: false,
        recommendedBibit,
        selectedBibits: selectedBibitsResult,
        analysis: result.analysis
      });
    } catch (err: any) {
      updateState({ step: "input", loading: false, error: err.message });
      toast.error(err.message || "Terjadi kesalahan saat analisis");
    }
  };

  const handleCheckout = async () => {
    const user = await checkAuth();
    if (!user) return;

    updateState({ loading: true });

    try {
      const activeBibits = state.mode === "custom" 
        ? state.selectedBibits 
        : (state.recommendedBibit ? [state.recommendedBibit] : []);

      const ratioPercent = state.ratio === "100/0" ? 1.0 : state.ratio === "70/30" ? 0.7 : state.ratio === "50/50" ? 0.5 : 0.3;
      const capacityMl = state.useOwnBottle ? state.ownBottleVolumeMl : (state.selectedBottle?.capacity_ml || 0);
      const totalBibitVolume = capacityMl * ratioPercent;
      const volumePerBibit = totalBibitVolume / (activeBibits.length || 1);

      const pricePerfume = Math.round(
        activeBibits.reduce((sum, b) => {
          const pPerMl = b.price_per_ml || 1500;
          return sum + (volumePerBibit * pPerMl);
        }, 0)
      );

      const priceBottle = state.useOwnBottle ? 0 : (state.selectedBottle?.price || 0);
      const totalPrice = pricePerfume + priceBottle;
      const baseNoteStr = state.recommendedBibit?.name || state.selectedBibits.map(b => b.name).join(" + ");
      
      const totalSolventVolume = capacityMl - totalBibitVolume;
      const ratioName = state.ratio === "100/0" ? "Elixir" : state.ratio === "70/30" ? "Extrait de Parfum" : state.ratio === "50/50" ? "Eau De Parfum" : "Eau De Toilette";
      
      let admin_recipe = "";
      if (state.mode === "custom" && activeBibits.length > 1 && state.analysis?.technical_recipe) {
        let recipeContent = "";
        
        // Attempt to parse percentages from AI's technical_recipe
        const parsedBibits = activeBibits.map(b => {
          // Look for number followed by % near the bibit name
          const escapedName = b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex1 = new RegExp(`${escapedName}[^0-9]*(\\d{1,3})\\s*%`, 'i');
          const regex2 = new RegExp(`(\\d{1,3})\\s*%[^,]*${escapedName}`, 'i');
          
          let match = state.analysis!.technical_recipe!.match(regex1) || state.analysis!.technical_recipe!.match(regex2);
          let pct = 0;
          if (match && match[1]) {
            pct = parseInt(match[1]);
          }
          return { bibit: b, percent: pct };
        });

        // Validate if percentages sum to roughly 100
        const totalPct = parsedBibits.reduce((acc, curr) => acc + curr.percent, 0);
        
        parsedBibits.forEach(({ bibit, percent }) => {
          let finalPct = percent;
          // Fallback if AI didn't provide clear percentages or they don't sum to 100
          if (totalPct < 90 || totalPct > 110 || percent === 0) {
            finalPct = Math.round(100 / activeBibits.length);
          }
          const bibitMl = totalBibitVolume * (finalPct / 100);
          recipeContent += `Bibit ${bibit.name} (${finalPct}%) : ${bibitMl.toFixed(1)} ml\n`;
        });
        
        admin_recipe = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRACIKAN PARFUM — ${capacityMl}ml (${ratioName})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${recipeContent}Pelarut Absolute : ${totalSolventVolume.toFixed(1)} ml\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal Volume : ${capacityMl.toFixed(1)} ml`;
      } else {
        // Single bibit
        admin_recipe = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRACIKAN PARFUM — ${capacityMl}ml (${ratioName})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nBibit ${activeBibits[0]?.name || 'Unknown'} (100%) : ${totalBibitVolume.toFixed(1)} ml\nPelarut Absolute : ${totalSolventVolume.toFixed(1)} ml\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal Volume : ${capacityMl.toFixed(1)} ml`;
      }
      
      const payload = {
        customer_name: user.user_metadata?.full_name || "Pelanggan Ela",
        customer_whatsapp: user.user_metadata?.phone || "08000000000",
        base_note: baseNoteStr,
        description: `Mode: ${state.mode}, Rasio: ${state.ratio}, Botol: ${state.useOwnBottle ? `Botol Sendiri (${state.ownBottleVolumeMl}ml)` : state.selectedBottle?.name}`,
        volume_ml: capacityMl,
        price_perfume: pricePerfume,
        price_bottle: priceBottle,
        price_service: 0,
        total_price: totalPrice,
        ai_recipe: JSON.stringify({
          mode: state.mode,
          name_suggestion: state.analysis?.custom_name || baseNoteStr,
          admin_recipe: admin_recipe,
          ratio: state.ratio,
          own_bottle: state.useOwnBottle,
          own_bottle_volume_ml: state.useOwnBottle ? state.ownBottleVolumeMl : null,
          bibits: activeBibits,
          bottle: state.useOwnBottle ? { name: `Botol Sendiri`, capacity_ml: state.ownBottleVolumeMl, price: 0 } : state.selectedBottle,
          analysis: state.analysis,
          price_breakdown: {
            bottle_price: priceBottle,
            bibit_price: pricePerfume,
            solvent_price: 0,
            total: totalPrice
          }
        })
      };

      const res = await fetch("/api/custom-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Gagal membuat pesanan");
      router.push(`/checkout/custom/${resData.data?.id || resData.id}`);
      
    } catch (err: any) {
      updateState({ loading: false });
      toast.error(err.message || "Gagal memproses pesanan");
    }
  };

  const handleRetry = () => {
    scrollToTop();
    updateState({
      mode: null,
      step: "method",
      prompt: "",
      imageBase64: null,
      selectedBibits: [],
      recommendedBibit: null,
      analysis: null,
      ratio: null,
      useOwnBottle: false,
      ownBottleVolumeMl: 30,
      selectedBottle: null,
      error: null
    });
  };

  return (
    <div ref={wizardRef} style={{ width: "100%", maxWidth: "1000px", margin: "0 auto" }}>
      {state.step !== "method" && state.step !== "analyzing" && (
        <button
          onClick={handleBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "none",
            color: "var(--c-ink-dim)",
            fontSize: "0.9rem",
            fontWeight: 500,
            cursor: "pointer",
            marginBottom: "24px",
            padding: "8px 0",
            transition: "color 0.2s ease"
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--c-ink)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--c-ink-dim)"}
        >
          <ArrowLeft size={16} /> Kembali
        </button>
      )}

      {state.step !== "method" && <WizardProgress currentStep={state.step} />}

      <div style={{ position: "relative", minHeight: "400px" }}>
        <AnimatePresence mode="wait">
          {state.step === "method" && (
            <motion.div key="method" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: "8px", fontFamily: "var(--font-display)" }}>
                  Pilih Cara Refill Parfum
                </h2>
                <p style={{ color: "var(--c-ink-dim)", fontSize: "1.1rem" }}>
                  Kami menyediakan 3 cara mudah untuk menciptakan aroma signature Anda.
                </p>
              </div>
              <StepMethodSelect onSelect={mode => { updateState({ mode, step: "input" }); scrollToTop(); }} />
            </motion.div>
          )}

          {state.step === "input" && state.mode === "ai" && (
            <motion.div key="input-ai" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <StepPromptInput
                value={state.prompt}
                onChange={prompt => updateState({ prompt })}
                onSubmit={handleAnalyze}
                loading={state.loading}
              />
            </motion.div>
          )}

          {state.step === "input" && state.mode === "gambar" && (
            <motion.div key="input-gambar" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <StepImageUpload
                imageBase64={state.imageBase64}
                onImageSelect={imageBase64 => updateState({ imageBase64 })}
                onRemove={() => updateState({ imageBase64: null })}
                onSubmit={handleAnalyze}
                loading={state.loading}
              />
            </motion.div>
          )}

          {state.step === "input" && state.mode === "custom" && (
            <motion.div key="input-custom" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <StepBibitSelect
                bibits={bibits}
                selectedBibits={state.selectedBibits}
                onToggle={bibit => {
                  const exists = state.selectedBibits.find(b => b.id === bibit.id);
                  if (exists) {
                    updateState({ selectedBibits: state.selectedBibits.filter(b => b.id !== bibit.id) });
                  } else {
                    updateState({ selectedBibits: [...state.selectedBibits, bibit] });
                  }
                }}
                onSubmit={handleAnalyze}
                loading={state.loading}
              />
            </motion.div>
          )}

          {state.step === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 20px",
                textAlign: "center"
              }}
            >
              <div style={{ position: "relative", marginBottom: "32px" }}>
                <div style={{ position: "absolute", inset: "-20px", background: "var(--c-gold)", filter: "blur(40px)", opacity: 0.2, borderRadius: "50%", animation: "pulse 2s infinite" }} />
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-gold)" }}>
                  <span style={{ display: "inline-block", animation: "spin 2s linear infinite" }}>
                    <Sparkles size={40} />
                  </span>
                </div>
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)", marginBottom: "8px", fontFamily: "var(--font-display)" }}>
                Nove AI sedang menganalisis...
              </h3>
              <p style={{ color: "var(--c-ink-dim)" }}>
                Mencari kecocokan terbaik untuk preferensi aroma Anda.
              </p>
            </motion.div>
          )}

          {state.step === "result" && state.analysis && (
            <motion.div key="result" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <StepAiResult
                mode={state.mode!}
                recommendedBibit={state.recommendedBibit}
                selectedBibits={state.selectedBibits}
                analysis={state.analysis}
                onAccept={() => handleNextStep("ratio")}
                onRetry={handleRetry}
              />
            </motion.div>
          )}

          {state.step === "ratio" && (
            <motion.div key="ratio" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <StepRatioSelect
                selected={state.ratio}
                onSelect={ratio => {
                  updateState({ ratio });
                  setTimeout(() => handleNextStep("bottle_choice"), 400);
                }}
              />
            </motion.div>
          )}

          {state.step === "bottle_choice" && (
            <motion.div key="bottle_choice" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <StepBottleChoice
                onChooseOurBottle={() => {
                  updateState({ useOwnBottle: false });
                  setTimeout(() => handleNextStep("bottle"), 300);
                }}
                onChooseOwnBottle={(volumeMl) => {
                  updateState({ useOwnBottle: true, ownBottleVolumeMl: volumeMl, selectedBottle: null });
                  setTimeout(() => handleNextStep("summary"), 300);
                }}
              />
            </motion.div>
          )}

          {state.step === "bottle" && (
            <motion.div key="bottle" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <StepBottleSelect
                bottles={bottles}
                selected={state.selectedBottle}
                onSelect={bottle => {
                  updateState({ selectedBottle: bottle });
                  setTimeout(() => handleNextStep("summary"), 400);
                }}
              />
            </motion.div>
          )}

          {state.step === "summary" && state.ratio && (state.selectedBottle || state.useOwnBottle) && (
            <motion.div key="summary" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <StepPriceSummary
                mode={state.mode!}
                recommendedBibit={state.recommendedBibit}
                selectedBibits={state.selectedBibits}
                analysis={state.analysis}
                ratio={state.ratio}
                bottle={state.selectedBottle}
                useOwnBottle={state.useOwnBottle}
                ownBottleVolumeMl={state.ownBottleVolumeMl}
                onCheckout={handleCheckout}
                onRetry={handleRetry}
                loading={state.loading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.1; }
          50% { transform: scale(1.2); opacity: 0.3; }
          100% { transform: scale(0.8); opacity: 0.1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
