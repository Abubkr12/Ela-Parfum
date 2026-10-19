import { redirect } from "next/navigation";
import { getPosInitialData } from "./actions";
import KasirPosClient from "./KasirPosClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terminal Kasir POS | Ela Parfum",
  description: "Sistem Point of Sale (POS) Multi-Cabang Resmi Ela Parfum",
};

export default async function KasirPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const params = await searchParams;
  const storeId = params.store ? parseInt(params.store, 10) : undefined;

  const result = await getPosInitialData(storeId);

  if (result.error || !result.data) {
    redirect("/kasir/login");
  }

  return <KasirPosClient initialData={result.data} />;
}
