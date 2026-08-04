import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Hello"
    });
    console.log("Success gemini-2.5-flash");
  } catch (e: any) {
    console.error("Error gemini-2.5-flash:", e.message);
  }

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: "Hello"
    });
    console.log("Success gemini-2.0-flash");
  } catch (e: any) {
    console.error("Error gemini-2.0-flash:", e.message);
  }
}

test();
