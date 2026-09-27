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

function isValidSavedCoordinate(lat?: number, lng?: number): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  // Jika koordinat sama persis dengan default fallback Jakarta (-6.2088, 106.8456)
  if (Math.abs(lat - -6.2088) < 0.001 && Math.abs(lng - 106.8456) < 0.001) return false;
  return true;
}

/**
 * Resolves the best available coordinates:
 * 1. Physical High Accuracy:
 *    - Mobile phone: Hardware GPS sensor (< 150m accuracy)
 *    - Laptop/PC: Wi-Fi BSSID AP triangulation (< 250m accuracy)
 * 2. Saved Profile Address (Priority over Coarse ISP!):
 *    - If browser location is coarse (accuracy > 250m on laptop or > 500m on mobile)
 *      or permission is denied / unavailable:
 *      USE SAVED ADDRESS! Because user's saved home/shop address in DB is 100x more
 *      accurate than ISP cellular gateway (e.g. Indosat tower in Ancol 15-30km away).
 * 3. Coarse Geolocation (Only for guests without saved address):
 *    - Wi-Fi / Cellular / Edge IP location
 * 4. Default Fallback: Central Jakarta (-6.2088, 106.8456)
 */
export async function resolveBestCoordinates(
  options: ResolveLocationOptions = {}
): Promise<ResolvedLocation> {
  const isMobile = isMobileDevice();
  const hasSavedAddress = isValidSavedCoordinate(options.fallbackLat, options.fallbackLng);

  // -----------------------------------------------------------------
  // TIER 1: BROWSER GEOLOCATION
  // -----------------------------------------------------------------
  if (typeof window !== "undefined" && navigator.geolocation) {
    try {
      options.onStatusUpdate?.("Mendeteksi sinyal lokasi perangkat...");
      // Mobile: beri waktu hingga 6 detik untuk satelit GPS lock
      // Laptop/PC: 3.5 detik untuk Wi-Fi BSSID scan
      const pos = await getPositionPromise({
        enableHighAccuracy: true,
        timeout: isMobile ? 6000 : 3500,
        maximumAge: 60000,
      });

      const acc = Math.round(pos.coords.accuracy || 0);
      const isHighAccuracy = isMobile ? acc <= 150 : acc <= 250;

      if (isHighAccuracy) {
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: acc,
          source: isMobile ? "gps_high" : "wifi_network",
          label: isMobile
            ? (acc <= 50 ? "GPS Akurat" : "GPS Ponsel")
            : "Wi-Fi Terdekat",
          isAccurate: true,
        };
      }

      // Jika akurasi kasar (misal ISP Ancol 1.000m - 15.000m) dan pengguna memiliki alamat tersimpan yang valid:
      // PRIORITASKAN ALAMAT TERSIMPAN! Jangan biarkan nyasar ke ISP Ancol.
      if (hasSavedAddress) {
        return {
          latitude: options.fallbackLat!,
          longitude: options.fallbackLng!,
          accuracy: 10,
          source: "saved_address",
          label: options.savedAddressLabel ? `Alamat (${options.savedAddressLabel})` : "Alamat Profil",
          isAccurate: true,
        };
      }

      // Jika tidak ada alamat tersimpan, gunakan perkiraan browser ini
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: acc,
        source: "wifi_network",
        label: "Jaringan Perangkat",
        isAccurate: false,
      };
    } catch {
      // Browser geolocation gagal, timeout, atau izin ditolak
    }
  }

  // -----------------------------------------------------------------
  // TIER 2: ALAMAT TERSIMPAN CUSTOMER (PRIORITAS JIKA ADA DI DB)
  // -----------------------------------------------------------------
  if (hasSavedAddress) {
    return {
      latitude: options.fallbackLat!,
      longitude: options.fallbackLng!,
      accuracy: 10,
      source: "saved_address",
      label: options.savedAddressLabel ? `Alamat (${options.savedAddressLabel})` : "Alamat Profil",
      isAccurate: true,
    };
  }

  // -----------------------------------------------------------------
  // TIER 3: CLOUDFLARE EDGE & IP GEOLOCATION (HANYA UNTUK TAMU TANPA ALAMAT)
  // -----------------------------------------------------------------
  try {
    options.onStatusUpdate?.("Mengecek lokasi IP...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

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
