"use client";

import React from "react";
import { Check } from "lucide-react";
import { WizardStep } from "./types";

interface WizardProgressProps {
  currentStep: WizardStep;
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  const steps: { key: WizardStep; label: string }[] = [
    { key: "method", label: "Metode" },
    { key: "input", label: "Input" },
    { key: "analyzing", label: "Analisis" },
    { key: "ratio", label: "Rasio" },
    { key: "bottle_choice", label: "Botol" },
    { key: "summary", label: "Ringkasan" },
  ];

  // We consider "result" as part of the "analyzing" step group for progress purposes
  // We consider "bottle" as part of the "bottle_choice" step group
  const getStepIndex = (step: WizardStep) => {
    if (step === "result") return 2;
    if (step === "bottle") return 4;
    return steps.findIndex((s) => s.key === step);
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div
      style={{
        width: "100%",
        padding: "24px 16px",
        overflowX: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        marginBottom: "24px",
      }}
    >
      <div
        className="wizard-progress-track"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          position: "relative",
          margin: "0 auto",
          maxWidth: "800px",
        }}
      >
        {/* Background Line */}
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "0",
            right: "0",
            height: "2px",
            background: "var(--c-border)",
            zIndex: 0,
          }}
        />

        {/* Progress Line */}
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "0",
            height: "2px",
            background: "var(--c-gold)",
            zIndex: 1,
            transition: "width 0.3s ease",
            width: `${(currentIndex / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 2,
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: isCompleted
                    ? "var(--c-gold)"
                    : isCurrent
                    ? "var(--c-surface-1)"
                    : "var(--c-surface-2)",
                  border: `2px solid ${
                    isCompleted || isCurrent ? "var(--c-gold)" : "var(--c-border)"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isCompleted ? "#fff" : "var(--c-ink-dim)",
                  transition: "all 0.3s ease",
                }}
              >
                {isCompleted ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: isCurrent ? "var(--c-gold)" : "var(--c-ink-dim)",
                    }}
                  >
                    {index + 1}
                  </span>
                )}
              </div>
              <span
                className="wizard-progress-label"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: isCurrent ? 600 : 500,
                  color: isCurrent || isCompleted ? "var(--c-ink)" : "var(--c-ink-dim)",
                  transition: "color 0.3s ease",
                  textAlign: "center",
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
