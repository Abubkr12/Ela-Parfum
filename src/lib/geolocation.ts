/**
 * Progressive Multi-Tier Geolocation Resolver
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
 * Resolves the best available coordinates progressively:
 * - Mobile: High Accuracy GPS (3.5s) -> Low Accuracy Cell/Wi-Fi (3.0s) -> Edge IP -> Saved Address -> Default
 * - Desktop/Laptop: Low Accuracy Wi-Fi (3.0s) -> High Accuracy (2.0s) -> Edge IP -> Saved Address -> Default
 */
export async function resolveBestCoordinates(
  options: ResolveLocationOptions = {}
): Promise<ResolvedLocation> {
  const isMobile = isMobileDevice();

  if (typeof window !== "undefined" && navigator.geolocation) {
    if (isMobile) {
      // -------------------------------------------------------------
      // MOBILE DEVICE (HAS HARDWARE GPS CHIP)
      // -------------------------------------------------------------
      // Tier 1: Coba GPS Akurasi Tinggi
      try {
        options.onStatusUpdate?.("Mengakses sensor GPS...");
        const pos = await getPositionPromise({
          enableHighAccuracy: true,
          timeout: 3500,
          maximumAge: 30000,
        });

        const acc = Math.round(pos.coords.accuracy || 0);
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: acc,
          source: "gps_high",
          label: acc <= 30 ? "GPS Akurat" : "GPS Ponsel",
          isAccurate: true,
        };
      } catch (err: any) {
        // Jika user secara eksplisit memblokir/menolak izin lokasi (code 1 = PERMISSION_DENIED),
        // jangan tanya lagi ke browser karena akan langsung ditolak, langsung lompat ke fallback IP/Alamat.
        if (err?.code === 1) {
          // Permission denied
        } else {
          // Tier 2: GPS timeout (misal di dalam ruangan), coba jaringan seluler / Wi-Fi
          try {
            options.onStatusUpdate?.("Mencari sinyal jaringan...");
            const pos = await getPositionPromise({
              enableHighAccuracy: false,
              timeout: 3000,
              maximumAge: 120000,
            });

            return {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 0),
              source: "wifi_network",
              label: "Jaringan Ponsel",
              isAccurate: false,
            };
          } catch {
            // Lanjut ke fallback IP/Alamat
          }
        }
      }
    } else {
      // -------------------------------------------------------------
      // DESKTOP / LAPTOP / PC (TIDAK MEMILIKI CHIP GPS SATELIT)
      // -------------------------------------------------------------
      // Tier 1: Coba Akurasi Jaringan/Wi-Fi (BSSID scan) terlebih dahulu.
      // Di laptop Windows/macOS, ini merespons instan (< 400ms) tanpa hang/freeze mencari chip GPS.
      try {
        options.onStatusUpdate?.("Mendeteksi Wi-Fi perangkat...");
        const pos = await getPositionPromise({
          enableHighAccuracy: false,
          timeout: 3000,
          maximumAge: 120000,
        });

        const acc = Math.round(pos.coords.accuracy || 0);
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: acc,
          source: "wifi_network",
          label: "Wi-Fi / Laptop",
          isAccurate: acc <= 150,
        };
      } catch (err: any) {
        if (err?.code !== 1) {
          // Tier 2: Coba opsi high accuracy singkat jika barangkali laptop punya modul GPS/LTE
          try {
            const pos = await getPositionPromise({
              enableHighAccuracy: true,
              timeout: 2000,
              maximumAge: 60000,
            });

            return {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 0),
              source: "gps_high",
              label: "Sensor Perangkat",
              isAccurate: true,
            };
          } catch {
            // Lanjut ke fallback IP/Alamat
          }
        }
      }
    }
  }

  // -----------------------------------------------------------------
  // TIER 3: CLOUDFLARE EDGE & IP GEOLOCATION FALLBACK
  // Digunakan jika izin browser ditolak, atau PC LAN tanpa Wi-Fi card
  // -----------------------------------------------------------------
  try {
    options.onStatusUpdate?.("Mengecek lokasi jaringan...");
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
            label: data.city ? `Jaringan (${data.city})` : "Jaringan Internet",
            isAccurate: false,
          };
        }
      }
    }
  } catch {
    // Abaikan kegagalan jaringan
  }

  // -----------------------------------------------------------------
  // TIER 4: ALAMAT TERSIMPAN CUSTOMER (JIKA ADA DI DATABASE)
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
      label: options.savedAddressLabel || "Alamat Profil",
      isAccurate: true,
    };
  }

  // -----------------------------------------------------------------
  // TIER 5: DEFAULT FALLBACK (PUSAT JAKARTA)
  // -----------------------------------------------------------------
  return {
    latitude: -6.2088,
    longitude: 106.8456,
    source: "default",
    label: "Pusat Jakarta",
    isAccurate: false,
  };
}
