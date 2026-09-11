export interface ElaStore {
  id: number;
  name: string;
  shortName: string;
  address: string;
  areaId: string;
  latitude: number;
  longitude: number;
}

export const ELA_STORES: ElaStore[] = [
  {
    id: 1,
    name: "Ela Parfum Condet",
    shortName: "Condet",
    address: "Jl. Raya Condet No. 1, RT.001/RW.015, Cililitan, Kramat Jati, Jakarta Timur 13640",
    areaId: "IDNP6IDNC149IDND851",
    latitude: -6.263281646322936,
    longitude: 106.86484090895478,
  },
  {
    id: 2,
    name: "Ela Parfum Rawa Belong",
    shortName: "Rawa Belong",
    address: "Jl. Raya Kb. Jeruk No.57B, RT.8/RW.15, Palmerah, Jakarta Barat 11530",
    areaId: "IDNP6IDNC146IDND825",
    latitude: -6.202968871424059,
    longitude: 106.78298439693361,
  },
  {
    id: 3,
    name: "Ela Parfum Tangerang",
    shortName: "Tangerang",
    address: "Jl. Pondok Kacang No. 36, RT.002/RW.005, Parung Serab, Ciledug, Tangerang 15226",
    areaId: "IDNP3IDNC446IDND5630",
    latitude: -6.244325229406331,
    longitude: 106.69862467974234,
  },
];

export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export async function getRoadDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<{ distanceMeters: number; durationSeconds: number; isRoadNetwork: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        return {
          distanceMeters: Math.round(data.routes[0].distance),
          durationSeconds: Math.round(data.routes[0].duration),
          isRoadNetwork: true,
        };
      }
    }
  } catch {
    // Ignore and use fallback
  }

  const straightMeters = haversineDistanceMeters(lat1, lon1, lat2, lon2);
  const estimatedRoadMeters = Math.round(straightMeters * 1.3);
  const estimatedDuration = Math.round(estimatedRoadMeters / 6.94);

  return {
    distanceMeters: estimatedRoadMeters,
    durationSeconds: estimatedDuration,
    isRoadNetwork: false,
  };
}

export function formatDistanceKm(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

export function formatDurationHuman(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} mnt`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours} jam ${remainingMins} mnt` : `${hours} jam`;
}
