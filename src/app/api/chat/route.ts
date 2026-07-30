import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiConfig, recordAiUsage, isRateLimitError } from "@/lib/ai-fallback";

const SYSTEM_PROMPT = `Kamu adalah asisten AI untuk "Ela Parfum", toko spesialis parfum isi ulang (refill) premium. Namamu adalah "Scent Advisor".

ATURAN MUTLAK & KETAT:
1. JAWAB SINGKAT, PADAT, DAN JELAS. Maksimal 2 kalimat per jawaban. Ini untuk menghemat kuota!
2. JANGAN PERNAH melayani obrolan di luar topik parfum, wewangian, refill, atau layanan Ela Parfum.
3. JIKA PENGGUNA BERTANYA HAL DI LUAR KONTEKS (misal: coding, matematika, politik, cuaca, tips kesehatan, resep masakan, hal acak lainnya), TOLAK DENGAN TEGAS: "Maaf, saya Scent Advisor Ela Parfum dan hanya diizinkan untuk melayani seputar parfum dan layanan toko kami." JANGAN berikan jawaban atas pertanyaan mereka meskipun kamu tahu.
4. Jangan bertele-tele. Jangan gunakan kalimat pengantar panjang seperti "Tentu, saya bisa bantu...". Langsung ke intinya.
5. Gunakan bahasa Indonesia santai tapi profesional.
6. Arahkan pengguna ke halaman "Racik Refill Custom" jika mereka ingin meracik parfum sendiri dari referensi.
7. BEBAS BAHAS PARFUM APAPUN: Jika ditanya soal parfum merek terkenal/viral, JELASKAN aromanya dengan baik meskipun kita tidak punya stok aslinya.
8. JIKA DITANYA STOK/BELI: Baru cek "KATALOG AKTIF". Jika merek tersebut tidak ada, tawarkan alternatif dari toko kita yang aromanya searah/mirip, atau sarankan untuk meraciknya di "Racik Refill Custom".

KATALOG KELUARGA AROMA:
- Fresh & Clean: aroma segar, cocok sehari-hari (lemon, green tea, sea salt)
- Floral & Romantic: bunga-bungaan elegan (rose, jasmine, lily)
- Woody & Earthy: kayu hangat maskulin (oud, sandalwood, cedar, vetiver)
- Citrus & Zesty: jeruk energik (bergamot, yuzu, grapefruit)
- Sweet & Gourmand: manis comfort (vanilla, caramel, tonka, cokelat)
- Aquatic & Ocean: laut menyegarkan (sea minerals, ambergris)
- Spicy & Bold: rempah berani (cinnamon, pepper, cardamom)
- Musky & Sensual: musk misterius (white musk, iris, cashmere)

UKURAN TERSEDIA: 10ml (Rp15.000-25.000), 30ml (Rp32.000-58.000), 50ml (Rp48.000-85.000), 100ml (Rp80.000-150.000)
LAYANAN: Racikan custom, replika terinspirasi merek, konsultasi aroma`;

// Built-in catalog for fallback
const CATALOG = [
  { name: "Velvet Rose Musk", family: "Floral", mood: "Romantis, bersih, feminin", notes: ["Rose", "White musk", "Lychee"], strength: "Medium", longevity: "6-8 jam", price: "Rp35.000" },
  { name: "Citrus Neroli Clean", family: "Citrus", mood: "Segar, rapi, ringan", notes: ["Bergamot", "Neroli", "Green tea"], strength: "Soft", longevity: "4-6 jam", price: "Rp32.000" },
  { name: "Noir Oud Reserve", family: "Woody", mood: "Mewah, bold, dewasa", notes: ["Oud", "Saffron", "Patchouli"], strength: "Strong", longevity: "8-10 jam", price: "Rp58.000" },
  { name: "Ocean Linen Mist", family: "Aquatic", mood: "Sejuk, bersih, effortless", notes: ["Sea salt", "Linen", "Lavender"], strength: "Medium", longevity: "5-7 jam", price: "Rp34.000" },
  { name: "Vanilla Skin Glow", family: "Sweet", mood: "Manis, hangat, dekat di kulit", notes: ["Vanilla", "Caramel", "Milk accord"], strength: "Medium", longevity: "6-8 jam", price: "Rp37.000" },
  { name: "Spiced Amber Club", family: "Spicy", mood: "Hangat, percaya diri, maskulin", notes: ["Cardamom", "Amber", "Tonka"], strength: "Strong", longevity: "7-9 jam", price: "Rp45.000" },
];

const KEYWORD_MAP: Record<string, string[]> = {
  fresh: ["segar", "fresh", "bersih", "clean", "ringan", "kantor", "daily", "sehari"],
  floral: ["bunga", "floral", "rose", "mawar", "feminin", "romantis", "date", "kencan"],
  woody: ["kayu", "woody", "oud", "maskulin", "bold", "dewasa", "pria", "cowok", "mewah"],
  citrus: ["jeruk", "citrus", "segar", "lemon", "bergamot", "energik"],
  sweet: ["manis", "sweet", "vanilla", "caramel", "gourmand", "hangat", "comfort"],
  aquatic: ["laut", "aquatic", "ocean", "sea", "sejuk", "air"],
  spicy: ["rempah", "spicy", "pedas", "cardamom", "amber", "malam", "pesta", "club"],
  musky: ["musk", "musky", "sensual", "kulit", "skin", "misterius"],
};

function generateFallbackResponse(lastMessage: string): string {
  const msg = lastMessage.toLowerCase();
  
  // Find matching families
  const matches: typeof CATALOG = [];
  for (const [family, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(k => msg.includes(k))) {
      const found = CATALOG.filter(p => p.family.toLowerCase() === family);
      matches.push(...found);
    }
  }
  
  // If no keyword match, give general recommendation
  if (matches.length === 0) {
    const random = CATALOG[Math.floor(Math.random() * CATALOG.length)];
    return `Terima kasih sudah menghubungi Scent Advisor! Berdasarkan pesan Anda, saya rekomendasikan untuk mencoba ${random.name} — ${random.mood.toLowerCase()}. Notes utama: ${random.notes.join(", ")}. Daya tahan sekitar ${random.longevity}. Tersedia mulai ${random.price} untuk ukuran 30ml.\n\nJika Anda bisa ceritakan lebih spesifik tentang suasana atau aktivitas yang Anda inginkan, saya bisa memberikan rekomendasi yang lebih tepat!`;
  }
  
  // Remove duplicates
  const unique = [...new Map(matches.map(m => [m.name, m])).values()];
  const top = unique.slice(0, 2);
  
  if (top.length === 1) {
    const p = top[0];
    return `Berdasarkan preferensi Anda, rekomendasi terbaik adalah ${p.name} dari keluarga aroma ${p.family}. Karakter: ${p.mood.toLowerCase()}. Notes utama: ${p.notes.join(", ")}. Kekuatan ${p.strength.toLowerCase()} dengan daya tahan ${p.longevity}. Tersedia mulai ${p.price} untuk ukuran 30ml.\n\nMau coba aroma ini, atau ingin eksplorasi karakter lain?`;
  }
  
  let response = "Berikut rekomendasi yang cocok untuk Anda:\n\n";
  top.forEach((p, i) => {
    response += `${i + 1}. ${p.name} (${p.family}) — ${p.mood.toLowerCase()}. Notes: ${p.notes.join(", ")}. Daya tahan ${p.longevity}. Mulai ${p.price}.\n`;
  });
  response += "\nKeduanya tersedia dalam ukuran 10ml, 30ml, dan 50ml. Mau tahu lebih detail tentang salah satunya?";
  
  return response;
}

async function getGeminiSettings() {
  try {
    const supabase = createAdminClient();
    
    // 1. Fetch settings
    const { data: settingsData } = await supabase
      .from("store_settings")
      .select("key,value")
      .in("key", ["GEMINI_SYSTEM_PROMPT"]);

    const settings = new Map((settingsData || []).map((row) => [row.key, row.value]));
    let basePrompt = settings.get("GEMINI_SYSTEM_PROMPT") || SYSTEM_PROMPT;

    // 2. Fetch real catalog from perfumes table
    const { data: perfumesData } = await supabase
      .from("perfumes")
      .select("name, category, price, is_available")
      .eq("is_available", true);

    let dynamicCatalog = "\n\nKATALOG AKTIF DI TOKO SAAT INI (Gunakan data ini untuk menjawab jika ditanya stok/harga):\n";
    if (perfumesData && perfumesData.length > 0) {
      dynamicCatalog += perfumesData.map(p => `- ${p.name} (${p.category}): Mulai dari Rp${p.price.toLocaleString('id-ID')}`).join("\n");
    } else {
      dynamicCatalog += "Katalog sedang kosong atau belum ada produk yang tersedia.";
    }

    return {
      systemPrompt: basePrompt + dynamicCatalog,
    };
  } catch {
    return {
      systemPrompt: SYSTEM_PROMPT,
    };
  }
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    const lastText = lastUserMsg?.text ?? "";

    const { systemPrompt } = await getGeminiSettings();
    const { apiKeys, availableModels } = await getAiConfig('chat');
    
    let responseText: string | null = null;
    let success = false;
    
    // Format messages for GoogleGenAI
    const contents = messages.map(
      (msg: { role: string; text: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.text }],
      })
    );

    for (const keyObj of apiKeys) {
      for (const modelObj of availableModels) {
        try {
          if (keyObj.daily_usage_count > 10000) continue; 
          
          const ai = new GoogleGenAI({ apiKey: keyObj.api_key });
          
          const response = await ai.models.generateContent({
            model: modelObj.model_name,
            contents,
            config: {
              systemInstruction: systemPrompt,
              maxOutputTokens: 300, // Reduced to save tokens
              temperature: 0.7,
              // thinking is OFF for chat to save extreme amounts of tokens
            },
          });
          
          responseText = response.text || null;
          if (responseText) {
            success = true;
            await recordAiUsage(keyObj.id);
            break;
          }
        } catch (e: any) {
          if (isRateLimitError(e)) {
            continue;
          } else {
            continue;
          }
        }
      }
      if (success) break;
    }

    if (success && responseText) {
      return NextResponse.json({ text: responseText });
    }

    // Fallback to local smart response if API exhausted
    const text = generateFallbackResponse(lastText);
    return NextResponse.json({ text });
  } catch (error: unknown) {
    console.error("AI Chat Error:", error);
    return NextResponse.json(
      { text: "Maaf, ada kendala teknis. Silakan coba lagi dalam beberapa saat." },
      { status: 200 }
    );
  }
}
