import { redirect } from "next/navigation";
import WizardClientPage from "./WizardClientPage";

export const dynamic = "force-dynamic";

export default async function RefillWizardPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const validModes = ["ai", "gambar", "custom"];
  const initialMode = validModes.includes(params.mode || "") ? (params.mode as any) : undefined;

  if (!initialMode) {
    redirect("/refill");
  }

  return <WizardClientPage initialMode={initialMode} />;
}
