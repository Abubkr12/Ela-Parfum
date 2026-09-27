import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiConfig, recordAiUsage, isRateLimitError } from "@/lib/ai-fallback";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, prompt, imageBase64, bibitIds } = body;

    if (!mode || !["ai", "gambar", "custom"].includes(mode)) {
      return NextResponse.json({ error: "Invalid or missing mode parameter." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // =========================================================================
    // FAST PATH: MODE 'custom' (Pelanggan memilih bibit sendiri)
    // =========================================================================
    if (mode === "custom") {
      if (!bibitIds || !Array.isArray(bibitIds) || bibitIds.length < 1) {
        return NextResponse.json({ error: "Pilih minimal 1 bibit parfum." }, { status: 400 });
      }

      // Query HANYA bibit yang dipilih pelanggan (Sangat hemat memory & CPU)
      const { data: customSelectedBibits, error: selectErr } = await supabase
        .from("bibit")
        .select("id, name, slug, collection, intensity, main_accord, price_per_ml, top_notes, middle_notes, base_notes")
        .in("id", bibitIds)
        .eq("is_active", true);

      if (selectErr || !customSelectedBibits || customSelectedBibits.length === 0) {
        return NextResponse.json({ error: "Bibit yang dipilih tidak valid atau tidak aktif." }, { status: 400 });
      }

      // SUB-FAST PATH: 1 BIBIT TUNGGAL (Langsung respons tanpa panggil LLM!)
      if (customSelectedBibits.length === 1) {
        const b = customSelectedBibits[0];
        const topNotes = Array.isArray(b.top_notes) ? b.top_notes : (b.top_notes ? [String(b.top_notes)] : []);
        const midNotes = Array.isArray(b.middle_notes) ? b.middle_notes : (b.middle_notes ? [String(b.middle_notes)] : []);
        const baseNotes = Array.isArray(b.base_notes) ? b.base_notes : (b.base_notes ? [String(b.base_notes)] : []);

        return NextResponse.json({
          success: true,
          data: {
            mode: "custom",
            selectedBibits: [b],
            analysis: {
              custom_name: b.name,
              technical_recipe: `100% ${b.name}`,
              predicted_notes: {
                top: topNotes,
                middle: midNotes,
                base: baseNotes,
              },
              predicted_intensity: b.intensity || "Medium",
              description: `Aroma murni ${b.name} dari koleksi ${b.collection} dengan karakter dominan ${b.main_accord}. Menghadirkan kesan aroma khas yang autentik.`,
              reasoning: `Formula tunggal murni 100% konsentrasi bibit pilihan Anda.`,
              confidence: 100,
              blend_verdict: "",
              blend_warning: "",
            },
          },
        });
      }

      // MULTI-BIBIT CUSTOM: Hanya kirim 2-3 bibit terpilih ke Gemini (JANGAN kirim seluruh katalog!)
      const leanSelected = customSelectedBibits.map((b) => ({
        id: b.id,
        name: b.name,
        collection: b.collection,
        intensity: b.intensity,
        main_accord: b.main_accord,
        notes: `${(b.top_notes || []).slice(0, 3).join(", ")} | ${(b.middle_notes || []).slice(0, 3).join(", ")} | ${(b.base_notes || []).slice(0, 3).join(", ")}`,
      }));

      const systemPrompt = `Kamu adalah 'Nove', Master Perfumer dari Ela Parfum.
Tugasmu: Analisis kecocokan campuran beberapa bibit parfum berikut secara objektif dan kritis:
${JSON.stringify(leanSelected)}

Panduan Harmonisasi:
- HARMONIS (75-100%): Woody+Spicy, Floral+Citrus, Sweet+Woody, Musky+Floral, Fresh+Citrus.
- CUKUP HARMONIS (50-74%): Woody+Floral, Sweet+Floral, Spicy+Musky.
- TIDAK HARMONIS (<50%): Aquatic+Sweet Gourmand, Heavy Spicy+Aquatic, Extreme+Extreme intensity.

OUTPUT HARUS STRICT JSON (dibungkus \`\`\`json \`\`\`):
{
  "success": true,
  "data": {
    "mode": "custom",
    "selectedBibits": ${JSON.stringify(customSelectedBibits)},
    "analysis": {
      "custom_name": "Nama blend kreatif baru",
      "technical_recipe": "Rasio persentase (misal: 60% ${customSelectedBibits[0].name}, 40% ${customSelectedBibits[1]?.name || 'bibit kedua'})",
      "predicted_notes": { "top": ["note1"], "middle": ["note2"], "base": ["note3"] },
      "predicted_intensity": "Soft" | "Medium" | "Strong" | "Extreme",
      "description": "Deskripsi aroma racikan",
      "reasoning": "Alasan kecocokan",
      "confidence": 85,
      "blend_verdict": "HARMONIS" | "CUKUP HARMONIS" | "TIDAK HARMONIS",
      "blend_warning": "Peringatan aroma jika tidak harmonis, atau kosongkan"
    }
  }
}`;

      return await runGeminiGeneration(systemPrompt, [{ text: "Analisis campuran bibit parfum ini secara objektif." }]);
    }

    // =========================================================================
    // MODE 'ai' & 'gambar' (Pencarian Rekomendasi dari Katalog)
    // =========================================================================
    // Ambil ringkasan katalog yang ramping (ID, Nama, Accord, Intensitas)
    const { data: bibitList, error: bibitError } = await supabase
      .from("bibit")
      .select("id, name, collection, intensity, main_accord, price_per_ml")
      .eq("is_active", true)
      .order("id");

    if (bibitError || !bibitList || bibitList.length === 0) {
      return NextResponse.json({ error: "Katalog bibit tidak ditemukan di database." }, { status: 404 });
    }

    // Format padat satu baris per bibit (~15KB saja vs 400KB sebelumnya)
    const compactCatalog = bibitList
      .map((b) => `${b.id}: ${b.name} (${b.collection} | ${b.main_accord} | ${b.intensity})`)
      .join("\n");

    let systemPrompt = `Kamu adalah 'Nove', Master Perfumer dari Ela Parfum.
Tugasmu: Rekomendasikan 1 ID bibit parfum yang PALING COCOK dari katalog di bawah.
WAJIB PILIH ID DARI KATALOG INI:
${compactCatalog}

OUTPUT HARUS STRICT JSON (dibungkus \`\`\`json \`\`\`):
{
  "success": true,
  "data": {
    "mode": "${mode}",
    "recommendedBibit": {
      "id": 123,
      "name": "Nama Bibit",
      "collection": "Global Parfume",
      "intensity": "Strong",
      "main_accord": "Woody",
      "price_per_ml": 2000
    },
    "selectedBibits": [],
    "analysis": {
      "description": "Deskripsi wangi bibit ini",
      "reasoning": "Kenapa bibit ini sangat cocok dengan permintaan pengguna",
      "confidence": 95,
      "predicted_intensity": "Strong",
      "predicted_notes": { "top": ["..."], "middle": ["..."], "base": ["..."] }
    }
  }
}`;

    const userContentParts: any[] = [];

    if (mode === "ai") {
      if (!prompt) return NextResponse.json({ error: "Prompt diperlukan untuk mode AI." }, { status: 400 });
      systemPrompt += `\nInstruksi: Cari 1 bibit yang aromanya paling mendekati deskripsi pengguna.`;
      userContentParts.push({ text: `Deskripsi parfum yang saya inginkan: ${prompt}` });
    } else if (mode === "gambar") {
      if (!imageBase64) return NextResponse.json({ error: "Foto parfum diperlukan untuk mode gambar." }, { status: 400 });
      const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json({ error: "Format gambar tidak valid." }, { status: 400 });
      }
      systemPrompt += `\nInstruksi: Identifikasi merek/nama botol parfum pada foto. Jika ada nama yang sama/mirip di katalog, utamakan exact match. Jika tidak, pilih alternatif yang paling mendekati karakternya.`;
      userContentParts.push({ text: "Tolong identifikasi parfum ini dan pilihkan bibit yang paling cocok dari katalog." });
      userContentParts.push({
        inlineData: {
          mimeType: matches[1],
          data: matches[2],
        },
      });
    }

    return await runGeminiGeneration(systemPrompt, userContentParts);
  } catch (error: any) {
    console.error("Refill Analyze API Error:", error);
    return NextResponse.json({ error: error.message || "Terjadi kesalahan server" }, { status: 500 });
  }
}

async function runGeminiGeneration(systemPrompt: string, userContentParts: any[]) {
  const { apiKeys, availableModels } = await getAiConfig("refill");

  let resultText = "";
  let success = false;
  let lastError = "";

  for (const keyObj of apiKeys) {
    if (keyObj.daily_usage_count > 10000) continue;

    for (const modelObj of availableModels) {
      try {
        const ai = new GoogleGenAI({ apiKey: keyObj.api_key });

        const aiConfig: any = {
          temperature: 0.3,
          systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        const response = await ai.models.generateContent({
          model: modelObj.model_name,
          contents: [{ role: "user", parts: userContentParts }],
          config: aiConfig,
        });

        resultText = response.text || "";
        if (resultText) {
          success = true;
          await recordAiUsage(keyObj.id);
          break;
        }
      } catch (e: any) {
        lastError = e.message || String(e);
        console.warn(`Model ${modelObj.model_name} key ${keyObj.id} error:`, lastError);
        if (isRateLimitError(e)) {
          continue;
        }
      }
    }
    if (success) break;
  }

  if (!success) {
    return NextResponse.json({ error: "Sistem analisis AI sedang sibuk. Silakan coba sesaat lagi.", details: lastError }, { status: 500 });
  }

  try {
    let parsedJson = null;
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      parsedJson = JSON.parse(jsonMatch[1]);
    } else {
      parsedJson = JSON.parse(resultText);
    }
    return NextResponse.json(parsedJson);
  } catch (parseErr) {
    console.error("Failed to parse Gemini JSON:", resultText);
    return NextResponse.json({ error: "Format respons AI tidak valid", raw: resultText }, { status: 500 });
  }
}
