"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Perfume } from "@/lib/types";

interface InteractiveCarouselProps {
  featuredPerfumes: Perfume[];
}

export function InteractiveCarousel({ featuredPerfumes }: InteractiveCarouselProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Core motion value to track progress (0 to totalItems - 1, and can loop)
  const progress = useMotionValue(0);
  const smoothProgress = useSpring(progress, {
    damping: 20,
    stiffness: 100,
    mass: 0.5,
  });

  const totalItems = featuredPerfumes.length;
  
  // Auto-scroll logic
  useEffect(() => {
    if (totalItems <= 1 || isHovered || isDragging) return;

    const interval = setInterval(() => {
      const current = progress.get();
      // Snap to next integer
      animate(progress, Math.round(current) + 1, {
        type: "spring",
        stiffness: 100,
        damping: 20,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [totalItems, isHovered, isDragging, progress]);

  // Drag logic
  const startX = useRef(0);
  const startProgress = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startX.current = e.clientX;
    startProgress.current = progress.get();
    // Stop any ongoing animation
    progress.stop(); 
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX.current;
    // Sensitivity factor
    const progressDelta = deltaX * -0.005;
    progress.set(startProgress.current + progressDelta);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    // Snap to nearest item
    animate(progress, Math.round(progress.get()), {
      type: "spring",
      stiffness: 100,
      damping: 20,
    });
  };

  // Wheel logic
  const handleWheel = (e: React.WheelEvent) => {
    progress.stop();
    const current = progress.get();
    progress.set(current + e.deltaY * 0.002);
    
    // Clear timeout to prevent snapping while actively scrolling
    if ((window as any).wheelSnapTimeout) clearTimeout((window as any).wheelSnapTimeout);
    
    (window as any).wheelSnapTimeout = setTimeout(() => {
      animate(progress, Math.round(progress.get()), {
        type: "spring",
        stiffness: 100,
        damping: 20,
      });
    }, 150);
  };

  if (totalItems === 0) return null;

  return (
    <section 
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsDragging(false);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      style={{
        position: "relative",
        width: "100%",
        height: "clamp(400px, 80vh, 600px)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--c-surface-1)",
        borderTop: "1px solid var(--c-border)",
        borderBottom: "1px solid var(--c-border)",
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "pan-y" // Allow vertical scrolling on mobile
      }}
    >
      <div style={{ position: "absolute", top: 15, left: 0, width: "100%", textAlign: "center", zIndex: 0 }}>
        <span style={{ fontSize: "1rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "4px", color: "var(--c-ink-dim)" }}>
          Signature Collection
        </span>
      </div>

      <div style={{ position: "relative", width: "100%", height: "100%", perspective: "1200px", marginTop: "60px" }}>
        {featuredPerfumes.map((perfume, index) => {
          return (
            <CarouselItem 
              key={perfume.id}
              perfume={perfume}
              index={index}
              totalItems={totalItems}
              smoothProgress={smoothProgress}
              onClick={() => {
                if (!isDragging) {
                  router.push(`/parfum/${perfume.slug}`);
                }
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

function CarouselItem({ 
  perfume, 
  index, 
  totalItems, 
  smoothProgress,
  onClick
}: { 
  perfume: Perfume;
  index: number;
  totalItems: number;
  smoothProgress: any;
  onClick: () => void;
}) {
  // Calculate relative distance for infinite wrapping
  const getRelativeDistance = (v: number) => {
    let diff = index - v;
    // Wrap around logic so it stays within -totalItems/2 and +totalItems/2
    while (diff > totalItems / 2) diff -= totalItems;
    while (diff < -totalItems / 2) diff += totalItems;
    return diff;
  };

  const x = useTransform(smoothProgress, (v: any) => {
    const dist = getRelativeDistance(v as number);
    return `${dist * 120}%`;
  });

  const y = useTransform(smoothProgress, (v: any) => {
    const dist = getRelativeDistance(v as number);
    // Slight arc effect
    return `${Math.abs(dist) * 15}%`;
  });

  const rotate = useTransform(smoothProgress, (v: any) => {
    const dist = getRelativeDistance(v as number);
    return `${dist * 15}deg`;
  });

  const scale = useTransform(smoothProgress, (v: any) => {
    const dist = Math.abs(getRelativeDistance(v as number));
    // Scale down items that are far away
    return Math.max(0.6, 1 - dist * 0.15);
  });

  const zIndex = useTransform(smoothProgress, (v: any) => {
    const dist = Math.abs(getRelativeDistance(v as number));
    return Math.round(100 - dist * 10);
  });

  const opacity = useTransform(smoothProgress, (v: any) => {
    const dist = Math.abs(getRelativeDistance(v as number));
    return dist > 2.5 ? 0 : 1 - (dist * 0.2);
  });

  // Calculate formatted number (e.g. 01, 02)
  const numStr = (index + 1).toString().padStart(2, '0');

  return (
    <motion.div
      onClick={onClick}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "clamp(250px, 25vw, 350px)",
        height: "clamp(350px, 35vw, 450px)",
        margin: "calc(clamp(350px, 35vw, 450px) * -0.5) 0 0 calc(clamp(250px, 25vw, 350px) * -0.5)",
        transformOrigin: "50% 100%",
        x,
        y,
        rotate,
        scale,
        zIndex,
        opacity,
      }}
    >
      <motion.div 
        style={{ 
          width: "100%", 
          height: "100%", 
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          background: "var(--c-surface-2)"
        }}
        whileHover={{ y: "-15px" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Background Image */}
      {perfume.image_url ? (
        <Image
          src={perfume.image_url}
          alt={perfume.name}
          fill
          style={{ objectFit: "cover", pointerEvents: "none" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "var(--c-surface-1)" }} />
      )}
      
      {/* Gradient Overlay for Text Legibility */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)",
        pointerEvents: "none"
      }} />

      {/* Content */}
      <div style={{ position: "absolute", bottom: "24px", left: "24px", right: "24px", pointerEvents: "none" }}>
        <div style={{ 
          color: "var(--c-gold)", 
          fontSize: "3rem", 
          fontWeight: 700, 
          fontFamily: "var(--font-display)",
          lineHeight: 1,
          marginBottom: "8px",
          opacity: 0.8
        }}>
          {numStr}
        </div>
        <h3 style={{ 
          color: "#fff", 
          fontSize: "1.5rem", 
          fontWeight: 600,
          margin: 0,
          textShadow: "0 2px 4px rgba(0,0,0,0.5)"
        }}>
          {perfume.name}
        </h3>
        <p style={{ 
          color: "rgba(255,255,255,0.7)", 
          fontSize: "0.9rem",
          margin: "4px 0 0 0",
          textTransform: "uppercase",
          letterSpacing: "1px"
        }}>
          {perfume.collection}
        </p>
      </div>
      </motion.div>
    </motion.div>
  );
}
