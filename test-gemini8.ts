import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  let aiConfig: any = {
    tools: [{ googleSearch: {} }]
  };
  
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: "Hello",
      config: aiConfig
    });
    console.log("Success with googleSearch");
  } catch (e: any) {
    console.error("Error with googleSearch:", e.message);
    console.log("Retrying without googleSearch...");
    delete aiConfig.tools;
    try {
      const res2 = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: "Hello",
        config: aiConfig
      });
      console.log("Success without googleSearch!");
    } catch (e2: any) {
      console.error("Error without googleSearch:", e2.message);
    }
  }
}

test();
