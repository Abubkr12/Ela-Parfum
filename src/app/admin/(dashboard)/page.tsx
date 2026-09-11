import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "./actions";
import DashboardClient from "./DashboardClient";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // 1. Fetch user session for sapaan
  let userName = 'Amba';
  try {
    const supabase = await createClient(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.full_name) {
      userName = user.user_metadata.full_name;
    } else if (user?.email) {
      userName = user.email.split('@')[0];
    }
  } catch (err) {
    console.warn('Session read fallback to default admin:', err);
  }

  // 2. Fetch initial dashboard data using createAdminClient via server action
  const initialData = await getDashboardData();

  return (
    <DashboardClient
      initialData={initialData}
      userName={userName}
    />
  );
}
