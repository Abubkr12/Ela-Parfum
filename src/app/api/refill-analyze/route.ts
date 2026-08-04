import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiConfig, recordAiUsage, isRateLimitError } from "@/lib/ai-fallback";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, prompt, imageBase64, bibitIds } = body;
    
    if (!mode || !['ai', 'gambar', 'custom'].includes(mode)) {
      return NextResponse.json({ error: "Invalid or missing mode parameter." }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Fetch bibit catalog
    const { data: bibitList, error: bibitError } = await supabase
      .from('bibit')
      .select('id, name, slug, collection, intensity, main_accord, price_per_ml, top_notes, middle_notes, base_notes')
      .eq('is_active', true);
      
    if (bibitError || !bibitList || bibitList.length === 0) {
      return NextResponse.json({ error: "Katalog bibit tidak ditemukan di database." }, { status: 404 });
    }

    let catalogueText = "Katalog Bibit yang Tersedia (JANGAN rekomendasikan di luar id yang ada di sini!):\n";
    catalogueText += JSON.stringify(bibitList, null, 2);

    let systemPrompt = `Kamu adalah 'Nove', Master Perfumer dari Ela Parfum.
Tugasmu adalah menganalisis permintaan parfum pelanggan.
KAMU WAJIB MENGHASILKAN OUTPUT STRICT JSON YANG VALID (dibungkus block \`\`\`json \`\`\`).
JANGAN tambahkan teks lain di luar block JSON.

Struktur JSON yang diharapkan:
{
  "success": true,
  "data": {
    "mode": "${mode}",
    // Jika mode 'ai' atau 'gambar':
    "recommendedBibit": {
      "id": number,
      "name": "string",
      "collection": "string",
      "intensity": "string",
      "main_accord": "string",
      "price_per_ml": number,
      "top_notes": [],
      "middle_notes": [],
      "base_notes": []
    },
    // Jika mode 'custom':
    "selectedBibits": [ /* array objek bibit yang dipilih */ ],
    // Selalu ada:
    "analysis": {
      "custom_name": "string", // Hanya jika mode 'custom', nama blend / nama asli jika 1 bibit
      "technical_recipe": "string", // Hanya jika mode 'custom', rasio (misal: 60% A, 40% B). Jika 1 bibit, 100%. Ini rahasia untuk seller.
      "predicted_notes": { "top": ["string"], "middle": ["string"], "base": ["string"] },
      "predicted_intensity": "string", // 'Soft' | 'Medium' | 'Strong' | 'Extreme'
      "description": "string", // Deskripsi aroma hasil analisismu
      "reasoning": "string", // Alasan kamu memilih bibit ini atau hasil campuran ini
      "confidence": number // 0-100
    }
  }
}

${catalogueText}
`;

    let userContentParts: any[] = [];
    let customSelectedBibits: any[] = [];

    if (mode === 'ai') {
      if (!prompt) return NextResponse.json({ error: "Prompt is required for AI mode." }, { status: 400 });
      systemPrompt += `\nINTRUKSI: Cari 1 bibit dari katalog yang PALING COCOK dengan deskripsi pengguna.`;
      userContentParts.push({ text: `Deskripsi parfum yang saya inginkan: ${prompt}` });
    } 
    else if (mode === 'gambar') {
      if (!imageBase64) return NextResponse.json({ error: "imageBase64 is required for gambar mode." }, { status: 400 });
      systemPrompt += `\nINTRUKSI: Identifikasi parfum di gambar ini (kamu bisa gunakan Google Search). Cari 1 bibit dari katalog yang wanginya PALING MIRIP atau searah dengan parfum di gambar.`;
      const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (matches) {
        userContentParts.push({ text: "Tolong identifikasi parfum ini dan carikan bibit yang paling mirip di katalog." });
        userContentParts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      } else {
         return NextResponse.json({ error: "Invalid imageBase64 format." }, { status: 400 });
      }
    }
    else if (mode === 'custom') {
      if (!bibitIds || !Array.isArray(bibitIds) || bibitIds.length < 1) {
        return NextResponse.json({ error: "bibitIds array with at least 1 ID is required for custom mode." }, { status: 400 });
      }
      
      customSelectedBibits = bibitList.filter(b => bibitIds.includes(b.id));
      if (customSelectedBibits.length !== bibitIds.length) {
        return NextResponse.json({ error: "Satu atau lebih bibit ID tidak valid atau tidak aktif." }, { status: 400 });
      }
      
      if (customSelectedBibits.length === 1) {
        systemPrompt += `\nINTRUKSI: Pelanggan memilih 1 bibit parfum secara manual: ${JSON.stringify(customSelectedBibits[0])}. 
Tugasmu: Berikan deskripsi dan analisa dasar terhadap bibit ini. 
Untuk "custom_name", gunakan nama variasi atau nama asli bibit tersebut. 
Untuk "technical_recipe", tulis "100% ${customSelectedBibits[0].name}". 
Gunakan data notes dan intensitas asli dari database. JANGAN buat aroma baru yang jauh menyimpang, analisalah karakteristik bawaannya.`;
        userContentParts.push({ text: "Tolong analisis 1 bibit pilihan saya ini." });
      } else {
        systemPrompt += `\nINTRUKSI: Pelanggan meracik beberapa bibit parfum secara manual: ${JSON.stringify(customSelectedBibits)}. 
Tugasmu: Analisis campuran dari bibit-bibit tersebut.
1. "custom_name": BUATKAN nama baru yang unik, kreatif, dan elegan untuk racikan ini.
2. "technical_recipe": BUATKAN racikan persentase spesifik (contoh: ${customSelectedBibits[0].name} 60%, bibit lainnya 40%) sesuai harmoni notes.
3. Prediksi notes baru (top, middle, base), intensitas hasil campuran, dan deskripsikan sensasi wangi barunya.
Jawab dengan penuh percaya diri dan elegan, layaknya racikan perfumer ahli.`;
        userContentParts.push({ text: "Tolong analisis campuran bibit-bibit parfum ini dan jadikan racikan baru." });
      }
    }

    const { apiKeys, availableModels } = await getAiConfig('refill');
    
    let resultText = "";
    let success = false;
    let lastError = "";
    
    // Round-robin iteration over keys, and cascade through models
    for (const keyObj of apiKeys) {
      for (const modelObj of availableModels) {
        try {
          // Skip if key usage is near max_rpd for this specific model type (naive check)
          // For a true check, we would need to check model category. We skip if key daily_usage > 10,000 as a hard ceiling.
          if (keyObj.daily_usage_count > 10000) continue; 

          const ai = new GoogleGenAI({ apiKey: keyObj.api_key });
          
          let aiConfig: any = {
            temperature: 0.4,
            systemInstruction: { parts: [{ text: systemPrompt }] }
          };
          
          if (modelObj.model_name.includes('thinking')) {
            aiConfig.thinkingConfig = { thinkingBudget: mode === 'custom' ? 1024 : 512 };
          }

          let response;
          try {
            const supportsSearchGrounding = modelObj.model_name.startsWith('gemini-2.0') || 
                                            modelObj.model_name.startsWith('gemini-2.5') || 
                                            modelObj.model_name.startsWith('gemma') || 
                                            modelObj.model_name.startsWith('deep-research') || 
                                            modelObj.model_name.startsWith('gemini-robotics') ||
                                            modelObj.model_name.startsWith('antigravity');

            // Search grounding only if needed and model supports it
            if ((mode === 'gambar' || mode === 'custom') && supportsSearchGrounding) {
              aiConfig.tools = [{ googleSearch: {} }];
            }

            response = await ai.models.generateContent({
              model: modelObj.model_name,
              contents: [{ role: "user", parts: userContentParts }],
              config: aiConfig
            });
          } catch (eWithTools: any) {
            if (aiConfig.tools) {
               // Retrying without googleSearch
               delete aiConfig.tools;
               response = await ai.models.generateContent({
                 model: modelObj.model_name,
                 contents: [{ role: "user", parts: userContentParts }],
                 config: aiConfig
               });
            } else {
               throw eWithTools;
            }
          }
          
          resultText = response.text || '';
          success = true;
          
          // Record successful usage
          await recordAiUsage(keyObj.id);
          
          break; // Exit model loop
        } catch (e: any) {
          const errMsg = e.message || String(e);
          console.log(`Model ${modelObj.model_name} pada key ${keyObj.id} gagal:`, errMsg);
          lastError = errMsg;
          
          if (isRateLimitError(e)) {
            // If it's a rate limit on this model, try next model with same key
            continue; 
          } else {
            // Other error (e.g. invalid key, unsupported tool), break to next key or model
            continue;
          }
        }
      }
      if (success) break; // Exit key loop
    }
    
    if (!success) {
      return NextResponse.json({ error: "Semua kuota API LLM telah habis. Coba lagi besok.", details: lastError }, { status: 500 });
    }

    // Parse the JSON from the AI response
    let parsedJson = null;
    try {
      const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedJson = JSON.parse(jsonMatch[1]);
      } else {
        // Fallback to try parsing the raw text in case there are no markdown blocks
        parsedJson = JSON.parse(resultText);
      }
    } catch (parseError) {
      console.error("Failed to parse AI JSON response:", resultText);
      return NextResponse.json({ error: "AI returned invalid format", raw: resultText }, { status: 500 });
    }

    // Add selectedBibits explicitly for custom mode if AI didn't do it right
    if (mode === 'custom' && parsedJson && parsedJson.data) {
        parsedJson.data.selectedBibits = customSelectedBibits;
    }

    return NextResponse.json(parsedJson);

  } catch (error: any) {
    console.error("Refill Analyze API Error:", error);
    return NextResponse.json({ error: error.message || "Terjadi kesalahan server" }, { status: 500 });
  }
}
