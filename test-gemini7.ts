import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: "Hello",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    console.log("Success with googleSearch");
  } catch (e: any) {
    console.error("Error with googleSearch:", e.message);
  }
}

test();
