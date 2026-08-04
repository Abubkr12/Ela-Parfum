import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: "What is this?" },
          { inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=' } }
        ]
      }],
      config: {
        thinkingConfig: { thinkingBudget: 512 }
      }
    });
    console.log("Success with image and thinkingConfig");
  } catch (e: any) {
    console.error("Error with image and thinkingConfig:", e.message);
  }
}

test();
