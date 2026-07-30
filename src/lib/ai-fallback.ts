import { createAdminClient } from "@/lib/supabase/admin";

export interface AiKey {
  id: string;
  api_key: string;
  daily_usage_count: number;
}

export interface AiModel {
  model_name: string;
  priority: number;
  max_rpd: number;
}

export async function getAiConfig(useFor: 'chat' | 'refill') {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  // 1. Reset daily counts if it's a new day
  await supabase
    .from('ai_api_keys')
    .update({ daily_usage_count: 0, last_usage_date: today })
    .neq('last_usage_date', today);

  // 2. Fetch available keys
  const { data: keysData, error: keysError } = await supabase
    .from('ai_api_keys')
    .select('id, api_key, daily_usage_count')
    .eq('is_active', true)
    .order('last_used_at', { ascending: true, nullsFirst: true });

  let apiKeys: AiKey[] = keysData || [];

  if (apiKeys.length === 0) {
    // Fallback to env var
    apiKeys = [{ id: 'env', api_key: process.env.GEMINI_API_KEY || "", daily_usage_count: 0 }];
  }

  // 3. Fetch models based on useFor
  const { data: modelsData, error: modelsError } = await supabase
    .from('ai_models')
    .select('model_name, priority, max_rpd')
    .eq('is_active', true)
    .eq('use_for', useFor)
    .order('priority', { ascending: true });

  let availableModels: AiModel[] = modelsData || [];

  if (availableModels.length === 0) {
    // Fallbacks if db empty
    if (useFor === 'chat') {
      availableModels = [
        { model_name: 'gemini-3.1-flash-lite', priority: 1, max_rpd: 500 },
        { model_name: 'gemini-3.5-flash-lite', priority: 2, max_rpd: 500 },
        { model_name: 'gemini-2.5-flash-lite', priority: 3, max_rpd: 20 },
      ];
    } else {
      availableModels = [
        { model_name: 'gemini-2.5-flash', priority: 1, max_rpd: 20 },
        { model_name: 'gemini-3.5-flash', priority: 2, max_rpd: 20 },
        { model_name: 'gemini-3.1-flash-lite', priority: 3, max_rpd: 500 },
      ];
    }
  }

  return { apiKeys, availableModels };
}

export async function recordAiUsage(keyId: string) {
  if (keyId === 'env') return; 
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('ai_api_keys')
    .select('daily_usage_count')
    .eq('id', keyId)
    .single();
    
  if (data) {
    await supabase
      .from('ai_api_keys')
      .update({ 
        daily_usage_count: (data.daily_usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
        last_usage_date: today
      })
      .eq('id', keyId);
  }
}

export function isRateLimitError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : (error.message || '');
  return msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('exhausted');
}
