"use server";

import * as xlsx from "xlsx";
import { createAdminClient } from "@/lib/supabase/admin";

export async function syncApiKeys(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("File Excel tidak ditemukan.");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    
    let newKeysCount = 0;
    let existingKeysCount = 0;
    let newModelsCount = 0;

    const supabase = createAdminClient();

    // Iterate through all sheets just in case names vary slightly
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;

        for (const cell of row) {
          if (typeof cell !== 'string') continue;
          
          const val = cell.trim();
          
          // Detect Gemini API Keys (Typically start with AIza)
          if (val.startsWith("AIza") && val.length > 30) {
            const { data: existingKey } = await supabase
              .from('ai_api_keys')
              .select('id')
              .eq('api_key', val)
              .single();
              
            if (existingKey) {
              existingKeysCount++;
            } else {
              await supabase.from('ai_api_keys').insert({
                api_key: val,
                service: 'gemini',
                daily_usage_count: 0,
                note: `Imported via Sync from sheet ${sheetName}`
              });
              newKeysCount++;
            }
          }
          
          // Detect Gemini Model Strings
          if (val.startsWith("gemini-1") || val.startsWith("gemini-2") || val.startsWith("gemini-exp") || val.startsWith("gemini-pro")) {
            const { data: existingModel } = await supabase
              .from('ai_models')
              .select('id')
              .eq('model_name', val)
              .single();
              
            if (!existingModel) {
              await supabase.from('ai_models').insert({
                model_name: val,
                priority: 10
              });
              newModelsCount++;
            }
          }
        }
      }
    }

    return { 
      success: true, 
      message: `Sync Berhasil! ${newKeysCount} API Key baru, ${newModelsCount} Model baru ditambahkan. ${existingKeysCount} API Key sudah ada.` 
    };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
