import { BottleData } from "@/components/refill/types";

export type BottleSeriesType = "luxury" | "spray" | "tola";

export interface BottleSeriesTab {
  id: "all" | BottleSeriesType;
  label: string;
  badge?: string;
}

export function getBottleSeries(name: string): BottleSeriesType {
  const n = (name || "").toUpperCase();
  if (n.includes("TOLA") || n.includes("WAJIK") || n.includes("ULIR")) {
    return "tola";
  }
  if (
    n.includes("CASA") ||
    n.includes("LACOSTE") ||
    n.includes("LE LABO") ||
    n.includes("D'HERMES") ||
    n.includes("POT") ||
    n.includes("BINTIK")
  ) {
    return "luxury";
  }
  return "spray";
}

export function getBottleSeriesLabel(type: BottleSeriesType): string {
  switch (type) {
    case "luxury":
      return "Luxury Glass";
    case "spray":
      return "Spray Reguler";
    case "tola":
      return "Tola & Roll-on";
    default:
      return "Kemasan";
  }
}

export function getBottleSeriesBadge(type: BottleSeriesType): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  switch (type) {
    case "luxury":
      return {
        label: "Luxury",
        color: "var(--c-gold, #d97706)",
        bg: "rgba(217, 119, 6, 0.12)",
        border: "rgba(217, 119, 6, 0.25)",
      };
    case "spray":
      return {
        label: "Spray",
        color: "#38bdf8",
        bg: "rgba(56, 189, 248, 0.12)",
        border: "rgba(56, 189, 248, 0.25)",
      };
    case "tola":
      return {
        label: "Oles",
        color: "#a855f7",
        bg: "rgba(168, 85, 247, 0.12)",
        border: "rgba(168, 85, 247, 0.25)",
      };
  }
}

/**
 * Mengurutkan botol secara logis dan terstruktur:
 * 1. Series Luxury Glass (Casa, Lacoste, Le Labo, D'Hermes, Pot, Kotak Bintik)
 * 2. Series Spray Reguler (Spray 20ml - 100ml)
 * 3. Series Tola & Roll-on (Tola 3ml - 12ml)
 * Di dalam tiap series diurutkan berdasarkan kapasitas (ml) asc, lalu nama asc.
 */
export function sortBottlesLogically<T extends { name: string; capacity_ml?: number }>(
  bottles: T[]
): T[] {
  const seriesWeight: Record<BottleSeriesType, number> = {
    luxury: 1,
    spray: 2,
    tola: 3,
  };

  return [...bottles].sort((a, b) => {
    const sA = getBottleSeries(a.name);
    const sB = getBottleSeries(b.name);

    if (seriesWeight[sA] !== seriesWeight[sB]) {
      return seriesWeight[sA] - seriesWeight[sB];
    }

    const capA = Number(a.capacity_ml || 0);
    const capB = Number(b.capacity_ml || 0);
    if (capA !== capB) {
      return capA - capB;
    }

    return a.name.localeCompare(b.name);
  });
}
