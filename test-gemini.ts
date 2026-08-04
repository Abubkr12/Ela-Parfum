import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: "Hello"
    });
    console.log("Success");
  } catch (e: any) {
    console.error("Error with gemini-3.5-flash:", e.message);
  }
  
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: "Hello",
      config: {
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });
    console.log("Success with thinkingConfig");
  } catch (e: any) {
    console.error("Error with thinkingConfig:", e.message);
  }
}

test();
