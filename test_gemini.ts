import { GoogleGenAI, Type } from "@google/genai";
async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: 'hello',
  });
  console.log(response.text);
}
test().catch(console.error);
