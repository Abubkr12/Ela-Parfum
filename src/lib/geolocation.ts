/**
 * Progressive Geolocation Resolver
 * Ela Parfum - Accurate Location Detection across GPS and Non-GPS Devices
 */

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  accuracy?: number; // in meters
  source: "gps_high" | "wifi_network" | "edge_ip" | "saved_address" | "default";
  label: string;
  isAccurate: boolean;
}

export interface ResolveLocationOptions {
  fallbackLat?: number;
  fallbackLng?: number;
  savedAddressLabel?: string;
  onStatusUpdate?: (status: string) => void;
}

export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || !window.navigator) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function getPositionPromise(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return reject(new Error("Browser does not support Geolocation"));
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Resolves the best available coordinates:
 * 1. Primary: Browser Geolocation with high accuracy (GPS on mobile, Wi-Fi BSSID scan on Windows/laptop)
 * 2. Secondary: Fast fallback to low accuracy if high accuracy times out
 * 3. Saved Profile Address: If browser location is blocked or unavailable, use user's saved address in DB!
 * 4. Edge IP / ISP Geolocation: Only for new guests without a saved address
 * 5. Default Fallback
 */
export async function resolveBestCoordinates(
  options: ResolveLocationOptions = {}
): Promise<ResolvedLocation> {
  const isMobile = isMobileDevice();

  // -----------------------------------------------------------------
  // TIER 1: BROWSER GEOLOCATION (HIGH ACCURACY)
  // HP: Menggunakan sensor GPS satelit fisik (< 20m)
  // Laptop/PC Windows/Mac: Menggunakan pemindaian Wi-Fi BSSID Google/Microsoft (20-50m)
  // -----------------------------------------------------------------
  if (typeof window !== "undefined" && navigator.geolocation) {
    try {
      options.onStatusUpdate?.("Mendeteksi lokasi perangkat...");
      const pos = await getPositionPromise({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      });

      const acc = Math.round(pos.coords.accuracy || 0);
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: acc,
        source: isMobile ? "gps_high" : "wifi_network",
        label: isMobile
          ? (acc <= 50 ? "GPS Akurat" : "GPS Ponsel")
          : "Wi-Fi Perangkat",
        isAccurate: true,
      };
    } catch (err: any) {
      // Jika izin ditolak (code 1), jangan tanya lagi, langsung ke fallback alamat profil
      if (err?.code !== 1) {
        // Coba sekali lagi dengan low accuracy jika timeout
        try {
          options.onStatusUpdate?.("Mengecek sinyal jaringan...");
          const pos = await getPositionPromise({
            enableHighAccuracy: false,
            timeout: 3500,
            maximumAge: 300000,
          });

          return {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 0),
            source: "wifi_network",
            label: "Jaringan Perangkat",
            isAccurate: false,
          };
        } catch {
          // Lanjut ke fallback alamat tersimpan
        }
      }
    }
  }

  // -----------------------------------------------------------------
  // TIER 2: ALAMAT TERSIMPAN CUSTOMER (PRIORITAS TINGGI JIKA ADA DI DB)
  // Jika GPS browser gagal / ditolak, gunakan alamat rumah tersimpan
  // (misal: Kebon Jeruk, Jakarta Barat) agar TIDAK nyasar ke ISP Ancol
  // -----------------------------------------------------------------
  if (
    typeof options.fallbackLat === "number" &&
    typeof options.fallbackLng === "number" &&
    !(Math.abs(options.fallbackLat - -6.2088) < 0.001 && Math.abs(options.fallbackLng - 106.8456) < 0.001)
  ) {
    return {
      latitude: options.fallbackLat,
      longitude: options.fallbackLng,
      source: "saved_address",
      label: options.savedAddressLabel ? `Alamat (${options.savedAddressLabel})` : "Alamat Profil",
      isAccurate: true,
    };
  }

  // -----------------------------------------------------------------
  // TIER 3: CLOUDFLARE EDGE & IP GEOLOCATION (HANYA JIKA TIDAK ADA ALAMAT)
  // -----------------------------------------------------------------
  try {
    options.onStatusUpdate?.("Mengecek lokasi IP...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch("/api/geo/my-location", { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.success && typeof data.latitude === "number" && typeof data.longitude === "number") {
        const isStaticFallback =
          data.source === "fallback" &&
          Math.abs(data.latitude - -6.2088) < 0.001 &&
          Math.abs(data.longitude - 106.8456) < 0.001;

        if (!isStaticFallback) {
          return {
            latitude: data.latitude,
            longitude: data.longitude,
            source: "edge_ip",
            label: data.city ? `Jaringan IP (${data.city})` : "Jaringan Internet",
            isAccurate: false,
          };
        }
      }
    }
  } catch {
    // Abaikan kegagalan jaringan
  }

  // -----------------------------------------------------------------
  // TIER 4: DEFAULT FALLBACK (PUSAT JAKARTA)
  // -----------------------------------------------------------------
  return {
    latitude: -6.2088,
    longitude: 106.8456,
    source: "default",
    label: "Pusat Jakarta",
    isAccurate: false,
  };
}
