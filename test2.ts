import { GoogleGenAI } from "@google/genai";
async function test() {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const res = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: "Hello"
    });
    console.log("Success:", res.text);
  } catch (err) {
    console.error("ERROR TYPE:", err.constructor.name);
    console.error("ERROR MESSAGE:", err.message);
  }
}
test();
