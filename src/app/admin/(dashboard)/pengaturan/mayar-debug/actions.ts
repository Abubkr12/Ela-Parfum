'use server';

import { createAdminClient } from "@/lib/supabase/admin";

export async function getWebhookLogs() {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
    
  if (error) {
    console.error("Error fetching webhook logs:", error);
    return [];
  }
  
  return data;
}
