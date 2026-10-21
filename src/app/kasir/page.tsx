import { Metadata } from "next";
import KasirPosClient from "./KasirPosClient";

export const metadata: Metadata = {
  title: "Terminal Kasir POS | Ela Parfum",
  description: "Sistem Point of Sale (POS) Multi-Cabang Resmi Ela Parfum",
};

export default async function KasirPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; mayar_done?: string; code?: string }>;
}) {
  const params = await searchParams;
  const storeId = params.store ? parseInt(params.store, 10) : undefined;

  return (
    <KasirPosClient
      initialStoreId={storeId}
      mayarDone={params.mayar_done === "1"}
      mayarCode={params.code}
    />
  );
}
