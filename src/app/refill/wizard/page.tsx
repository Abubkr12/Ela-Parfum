import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import WizardClientPage from "./WizardClientPage";

export default async function RefillWizardPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const supabase = createAdminClient();

  // Fetch bibit data server-side
  const { data: bibits } = await supabase
    .from("bibit")
    .select("id, name, slug, collection, intensity, main_accord, price_per_ml, top_notes, middle_notes, base_notes")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // Fetch bottle data server-side
  const { data: bottles } = await supabase
    .from("bottles")
    .select("id, name, capacity_ml, price, image_url, is_active")
    .eq("is_active", true)
    .order("capacity_ml", { ascending: true });

  const validModes = ["ai", "gambar", "custom"];
  const initialMode = validModes.includes(params.mode || "") ? params.mode as any : undefined;

  if (!initialMode) {
    redirect("/refill");
  }

  return (
    <WizardClientPage
      bibits={bibits || []}
      bottles={bottles || []}
      initialMode={initialMode}
    />
  );
}
