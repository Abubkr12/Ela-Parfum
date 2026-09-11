import { NextResponse } from "next/server";
import { ELA_STORES, getRoadDistance, formatDistanceKm, formatDurationHuman } from "@/lib/stores";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lat = parseFloat(body.latitude);
    const lon = parseFloat(body.longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const distancePromises = ELA_STORES.map(async (store) => {
      const roadRes = await getRoadDistance(lat, lon, store.latitude, store.longitude);
      return {
        storeId: store.id,
        name: store.name,
        shortName: store.shortName,
        address: store.address,
        areaId: store.areaId,
        distanceMeters: roadRes.distanceMeters,
        distanceText: formatDistanceKm(roadRes.distanceMeters),
        durationText: formatDurationHuman(roadRes.durationSeconds),
        isRoadNetwork: roadRes.isRoadNetwork,
      };
    });

    const results = await Promise.all(distancePromises);

    // Urutkan dari jarak terdekat
    results.sort((a, b) => a.distanceMeters - b.distanceMeters);

    const withNearestFlag = results.map((store, index) => ({
      ...store,
      isNearest: index === 0,
    }));

    return NextResponse.json({ stores: withNearestFlag });
  } catch (err: any) {
    console.error("Error in distances route:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
