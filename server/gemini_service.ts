import { GoogleGenAI, Type, ThinkingLevel, GenerateContentResponse } from "@google/genai";
import { ChatMessage, Product } from "../types";

// Dynamic lazy initializer for GoogleGenAI
const getAiClient = async () => {
  // 1. Try to read from client-uploaded Firebase agentApiKey config
  try {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const projectId = config.projectId;
      const databaseId = config.firestoreDatabaseId || '(default)';
      const apiKey = config.apiKey;
      
      const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/settings/social${apiKey ? `?key=${apiKey}` : ''}`;
      const res = await fetch(restUrl);
      if (res.ok) {
        const data = await res.json();
        const key = data?.fields?.agentApiKey?.stringValue;
        if (key) {
          return new GoogleGenAI({
            apiKey: key,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
        }
      }
    }
  } catch (err: any) {
    console.log("Firebase config REST API key look-up skipped:", err?.message);
  }

  // 2. Try to read from Firebase Admin Firestore document settings/social
  try {
    const { adminDb } = await import('../firebase-admin');
    if (adminDb) {
      const doc = await adminDb.collection('settings').doc('social').get();
      if (doc.exists) {
        const data = doc.data();
        if (data?.agentApiKey) {
          return new GoogleGenAI({
            apiKey: data.agentApiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
        }
      }
    }
  } catch (err: any) {
    console.log("adminDb query for agentApiKey skipped:", err?.message);
  }

  // 3. Fallback to process.env.GEMINI_API_KEY
  const envApiKey = process.env.GEMINI_API_KEY;
  if (envApiKey) {
    return new GoogleGenAI({
      apiKey: envApiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }

  return null;
};

export const generateSEOContent = async (productName: string, description: string, category: string, tags: string[] = []) => {
  const client = await getAiClient();
  if (!client) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
  
  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Write an SEO meta title, meta description, and 5-7 comma-separated SEO keywords for this streetwear product: "${productName}". 
Category: "${category}". 
Tags: ${tags.join(', ')}. 
Description: "${description}". 
Format as JSON. 
The title should be catchy, include relevant keywords, and be under 60 characters. 
The description should be compelling, include a call to action, and be under 160 characters.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            seoTitle: { type: Type.STRING },
            seoDescription: { type: Type.STRING },
            seoKeywords: { type: Type.STRING }
          },
          required: ["seoTitle", "seoDescription", "seoKeywords"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    console.error("SEO_GEN_ERROR:", error);
    if (error.message?.includes('429') || error.message?.includes('exhausted')) {
      throw new Error("AI_QUOTA_EXCEEDED: Our AI systems are currently at peak capacity. Please try again in 60 seconds.");
    }
    throw new Error(`AI_MODELS_ERROR: ${error.message}`);
  }
};

export const generateTags = async (productName: string, description: string, category: string) => {
  const client = await getAiClient();
  if (!client) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Analyze the following product details for a premium streetwear brand and generate a list of 5-8 relevant SEO keywords / search tags.
Product Name: "${productName}"
Category: "${category}"
Description: "${description}"

Guidelines:
- Include tags representing the style (e.g., streetwear, minimalist, cyber, utility, oversized).
- Include product-specific keywords (e.g., hoodie, cargo-pants, custom-embroidery).
- Keep each tag concise, lowercase, and without special characters besides hyphens.
- Format as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error: any) {
    console.error("TAGS_GEN_ERROR:", error);
    if (error.message?.includes('429') || error.message?.includes('exhausted')) {
      throw new Error("AI_QUOTA_EXCEEDED: Our AI systems are currently at peak capacity. Please try again in 60 seconds.");
    }
    throw new Error(`AI_TAGS_ERROR: ${error.message}`);
  }
};

export const generateProductDescription = async (productName: string, category: string, currentDescription?: string) => {
  const client = await getAiClient();
  if (!client) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");

  const prompt = `Act as a luxury streetwear brand copywriter. Write a compelling, minimal, and edgy product description for a product named "${productName}" in the category "${category}". ${currentDescription ? `Current notes/description to expand upon: "${currentDescription}".` : ""} Focus on the fit, the aesthetic vibe, and the premium feel. Keep it under 60 words. No emojis.`;
  
  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    });
    return response.text;
  } catch (error: any) {
    console.error("DESC_GEN_ERROR:", error);
    if (error.message?.includes('429') || error.message?.includes('exhausted')) {
      throw new Error("AI_QUOTA_EXCEEDED: Our copywriters are currently busy. Please wait a moment.");
    }
    throw new Error(`AI_DESC_ERROR: ${error.message}`);
  }
};

// Helper fallbacks for when Gemini API quota or image generation fails (e.g. 429 Quota Exceeded)
const getFallbackOgImage = (productName: string, category: string, description: string) => {
  const cleanProd = (productName || "PRODUCT").replace(/["&<>]/g, "");
  const cleanCat = (category || "STREETWEAR").replace(/["&<>]/g, "");
  const cleanDesc = (description || "PREMIUM MINIMALIST APPAREL").replace(/["&<>]/g, "").substring(0, 150) + "...";
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
    <defs>
      <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a0a0c" />
        <stop offset="50%" stop-color="#121216" />
        <stop offset="100%" stop-color="#050507" />
      </linearGradient>
      <linearGradient id="accent-glow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0055ff" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#002288" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg-grad)" />
    <g opacity="0.12">
      <path d="M 0,50 L 1200,50 M 0,100 L 1200,100 M 0,150 L 1200,150 M 0,200 L 1200,200 M 0,250 L 1200,250 M 0,300 L 1200,300 M 0,350 L 1200,350 M 0,400 L 1200,400 M 0,450 L 1200,450 M 0,500 L 1200,500 M 0,550 L 1200,550 M 0,600 L 1200,600" stroke="#374151" stroke-width="1"/>
      <path d="M 100,0 L 100,630 M 200,0 L 200,630 M 300,0 L 300,630 M 400,0 L 400,630 M 500,0 L 500,630 M 600,0 L 600,630 M 700,0 L 700,630 M 800,0 L 800,630 M 900,0 L 900,630 M 1000,0 L 1000,630 M 1100,0 L 1100,630" stroke="#374151" stroke-width="1"/>
    </g>
    <rect width="1200" height="300" fill="url(#accent-glow)" />
    <line x1="50" y1="50" x2="350" y2="50" stroke="#0055ff" stroke-width="3" />
    <line x1="50" y1="50" x2="50" y2="200" stroke="#0055ff" stroke-width="3" />
    <circle cx="50" cy="50" r="6" fill="#0055ff" />
    <line x1="1150" y1="580" x2="850" y2="580" stroke="#ffffff" stroke-width="1" opacity="0.3" />
    <line x1="1150" y1="580" x2="1150" y2="430" stroke="#ffffff" stroke-width="1" opacity="0.3" />
    <circle cx="1150" cy="580" r="3" fill="#ffffff" opacity="0.5" />
    <text x="90" y="105" font-family="'Inter', -apple-system, sans-serif" font-size="14" font-weight="900" fill="#0055ff" letter-spacing="8">STREET THREADX // LOOKBOOK</text>
    <text x="90" y="130" font-family="'Inter', -apple-system, sans-serif" font-size="10" font-weight="bold" fill="#4b5563" letter-spacing="4">NEURAL GRAPHICS AUTOMATION v3.1</text>
    <text x="90" y="245" font-family="-apple-system, sans-serif" font-size="54" font-weight="900" fill="#ffffff" letter-spacing="-1">${cleanProd}</text>
    <text x="90" y="300" font-family="'Inter', -apple-system, sans-serif" font-size="14" font-weight="900" fill="#0055ff" letter-spacing="6">${cleanCat.toUpperCase()}</text>
    <text x="90" y="360" font-family="'Inter', -apple-system, sans-serif" font-size="15" font-weight="500" fill="#9ca3af" width="1020">${cleanDesc}</text>
    <rect x="90" y="470" width="1020" height="1" fill="#1f2937" />
    <text x="90" y="515" font-family="monospace" font-size="11" font-weight="bold" fill="#0055ff" letter-spacing="1">LAUNCH DETAILS: SECUREDROP_FALLBACK</text>
    <text x="90" y="535" font-family="monospace" font-size="10" font-weight="500" fill="#4b5563" letter-spacing="1">PREMIUM STREETWEAR / EST. 2026</text>
    <text x="850" y="515" font-family="monospace" font-size="11" font-weight="bold" fill="#ffffff" letter-spacing="1">STRETCH STATE : SYNCED</text>
    <text x="850" y="535" font-family="monospace" font-size="10" font-weight="500" fill="#4b5563" letter-spacing="1">PAYMENTS PROXIED WITH MFS</text>
    <rect x="25" y="25" width="1150" height="580" fill="none" stroke="#1f2937" stroke-width="1" />
  </svg>`;
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const getFallbackSizeChartImage = (productName: string, category: string, extraPrompt: string = "") => {
  const cleanProd = (productName || "PRODUCT").replace(/["&<>]/g, "");
  const cleanCat = (category || "STREETWEAR").replace(/["&<>]/g, "").toUpperCase();
  const isLowerBody = cleanCat.includes("PANTS") || cleanCat.includes("JEANS") || cleanCat.includes("SHORTS") || cleanCat.includes("TROUSERS");
  const isFootwear = cleanCat.includes("FOOTWEAR") || cleanCat.includes("SNEAKERS") || cleanCat.includes("SHOES");
  
  let layoutGraphic = "";
  if (isLowerBody) {
    layoutGraphic = `
      <line x1="170" y1="180" x2="230" y2="180" stroke="#0055ff" stroke-width="2" stroke-dasharray="2 2" />
      <text x="200" y="170" font-family="monospace" font-size="10" fill="#0055ff" text-anchor="middle">WAIST</text>
      <line x1="160" y1="180" x2="160" y2="420" stroke="#0055ff" stroke-width="2" />
      <polygon points="160,180 157,188 163,188" fill="#0055ff" />
      <polygon points="160,420 157,412 163,412" fill="#0055ff" />
      <text x="145" y="305" font-family="monospace" font-size="10" fill="#0055ff" text-anchor="middle" transform="rotate(-90 145 305)">OUTSEAM</text>
      <path d="M 175,180 L 225,180 L 230,220 L 220,420 L 205,420 L 199,300 L 193,300 L 187,420 L 172,420 L 170,220 Z" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.7" />
    `;
  } else if (isFootwear) {
    layoutGraphic = `
      <line x1="130" y1="360" x2="270" y2="360" stroke="#0055ff" stroke-width="2" />
      <polygon points="130,360 138,357 138,363" fill="#0055ff" />
      <polygon points="270,360 262,357 262,363" fill="#0055ff" />
      <text x="200" y="380" font-family="monospace" font-size="10" fill="#0055ff" text-anchor="middle">FOOT LENGTH</text>
      <path d="M 130,330 C 130,280 160,260 190,260 C 200,260 215,280 230,290 C 245,295 260,310 270,330 C 275,340 270,350 250,350 C 230,350 140,350 130,330 Z" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.7" />
    `;
  } else {
    layoutGraphic = `
      <line x1="140" y1="230" x2="260" y2="230" stroke="#0055ff" stroke-width="2" />
      <polygon points="140,230 148,227 148,233" fill="#0055ff" />
      <polygon points="260,230 252,227 252,233" fill="#0055ff" />
      <text x="200" y="220" font-family="monospace" font-size="10" fill="#0055ff" text-anchor="middle">CHEST WIDTH</text>
      <line x1="120" y1="180" x2="120" y2="350" stroke="#0055ff" stroke-width="2" />
      <polygon points="120,180 117,188 123,188" fill="#0055ff" />
      <polygon points="120,350 117,342 123,342" fill="#0055ff" />
      <text x="105" y="270" font-family="monospace" font-size="10" fill="#0055ff" text-anchor="middle" transform="rotate(-90 105 270)">BODY LENGTH</text>
      <path d="M 170,180 C 185,185 215,185 230,180 L 260,195 L 245,230 L 230,225 L 230,350 L 170,350 L 170,225 L 155,230 L 140,195 Z" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.7" />
    `;
  }

  let labels = ["S", "M", "L", "XL"];
  let headerCol1 = "CHEST Width";
  let headerCol2 = "BODY Length";
  let valsCol1 = ["21.0 in", "22.5 in", "24.0 in", "25.5 in"];
  let valsCol2 = ["27.5 in", "28.5 in", "30.0 in", "31.0 in"];

  if (isLowerBody) {
    headerCol1 = "WAIST Size";
    headerCol2 = "PANTS Length";
    valsCol1 = ["30.0 in", "32.0 in", "34.0 in", "36.0 in"];
    valsCol2 = ["39.0 in", "40.0 in", "41.5 in", "43.0 in"];
  } else if (isFootwear) {
    headerCol1 = "US SIZING";
    headerCol2 = "FOOT Length";
    valsCol1 = ["8.0 / 9.0 US", "9.5 / 10 US", "10.5 / 11 US", "11.5 / 12 US"];
    valsCol2 = ["26.0 cm", "27.5 cm", "28.5 cm", "29.5 cm"];
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <linearGradient id="blueprint-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050811" />
        <stop offset="100%" stop-color="#0d142d" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#blueprint-bg)" />
    <g opacity="0.12">
      <path d="M 0,25 L 800,25 M 0,50 L 800,50 M 0,75 L 800,75 M 0,100 L 800,100 M 0,125 L 800,125 M 0,150 L 800,150 M 0,175 L 800,175 M 0,200 L 800,200 M 0,225 L 800,225 M 0,250 L 800,250 M 0,275 L 800,275 M 0,300 L 800,300 M 0,325 L 800,325 M 0,350 L 800,350 M 0,375 L 800,375 M 0,400 L 800,400 M 0,425 L 800,425 M 0,450 L 800,450 M 0,475 L 800,475 M 0,500 L 800,500 M 0,550 L 800,550 M 0,575 L 800,575" stroke="#0055ff" stroke-width="0.5"/>
      <path d="M 25,0 L 25,600 M 50,0 L 50,600 M 75,0 L 75,600 M 100,0 L 100,600 M 125,0 L 125,600 M 150,0 L 150,600 M 175,0 L 175,600 M 200,0 L 200,600 M 225,0 L 225,600 M 250,0 L 250,600 M 275,0 L 275,600 M 300,0 L 300,600 M 325,0 L 325,600 M 350,0 L 350,600 M 375,0 L 375,600 M 400,0 L 400,600 M 425,0 L 425,600 M 450,0 L 450,600 M 475,0 L 475,600 M 500,0 L 500,600 M 525,0 L 525,600 M 550,0 L 550,600 M 575,0 L 575,600 M 600,0 L 600,600 M 625,0 L 625,600 M 650,0 L 650,600 M 675,0 L 675,600 M 700,0 L 700,600 M 725,0 L 725,600 M 750,0 L 750,600 M 775,0 L 775,600" stroke="#0055ff" stroke-width="0.5"/>
    </g>
    <rect x="25" y="25" width="750" height="550" fill="none" stroke="#0055ff" stroke-width="1.5" opacity="0.6" stroke-dasharray="none" />
    <text x="60" y="80" font-family="monospace" font-size="20" font-weight="900" fill="#ffffff" letter-spacing="2">STREET THREADX // SIZING BLUEPRINT</text>
    <text x="60" y="105" font-family="monospace" font-size="12" font-weight="bold" fill="#0055ff" letter-spacing="4">DIAGRAM SPEC: FALLBACK_MODE_ACTIVE</text>
    <g transform="translate(40, -10)">
      ${layoutGraphic}
    </g>
    <g transform="translate(360, 150)">
      <rect x="0" y="0" width="370" height="35" fill="#0055ff" fill-opacity="0.1" stroke="#0055ff" stroke-width="1.5" />
      <text x="15" y="22" font-family="monospace" font-size="11" font-weight="900" fill="#ffffff" letter-spacing="1">SIZE</text>
      <text x="110" y="22" font-family="monospace" font-size="11" font-weight="900" fill="#0055ff" letter-spacing="1">${headerCol1.toUpperCase()}</text>
      <text x="240" y="22" font-family="monospace" font-size="11" font-weight="900" fill="#0055ff" letter-spacing="1">${headerCol2.toUpperCase()}</text>
      <rect x="0" y="45" width="370" height="40" fill="none" stroke="#0055ff" stroke-width="0.75" opacity="0.5" />
      <text x="15" y="70" font-family="monospace" font-size="14" font-weight="900" fill="#ffffff">${labels[0]}</text>
      <text x="110" y="69" font-family="monospace" font-size="12" font-weight="500" fill="#cbd5e1">${valsCol1[0]}</text>
      <text x="240" y="69" font-family="monospace" font-size="12" font-weight="500" fill="#cbd5e1">${valsCol2[0]}</text>
      <rect x="0" y="95" width="370" height="40" fill="none" stroke="#0055ff" stroke-width="0.75" opacity="0.5" />
      <text x="15" y="120" font-family="monospace" font-size="14" font-weight="900" fill="#ffffff">${labels[1]}</text>
      <text x="110" y="119" font-family="monospace" font-size="12" font-weight="500" fill="#cbd5e1">${valsCol1[1]}</text>
      <text x="240" y="119" font-family="monospace" font-size="12" font-weight="500" fill="#cbd5e1">${valsCol2[1]}</text>
      <rect x="0" y="145" width="370" height="40" fill="none" stroke="#0055ff" stroke-width="0.75" opacity="0.5" />
      <text x="15" y="170" font-family="monospace" font-size="14" font-weight="900" fill="#ffffff">${labels[2]}</text>
      <text x="110" y="169" font-family="monospace" font-size="12" font-weight="500" fill="#cbd5e1">${valsCol1[2]}</text>
      <text x="240" y="169" font-family="monospace" font-size="12" font-weight="500" fill="#cbd5e1">${valsCol2[2]}</text>
      <rect x="0" y="195" width="370" height="40" fill="none" stroke="#0055ff" stroke-width="0.75" opacity="0.5" />
      <text x="15" y="220" font-family="monospace" font-size="14" font-weight="900" fill="#ffffff">${labels[3]}</text>
      <text x="110" y="219" font-family="monospace" font-size="12" font-weight="500" fill="#cbd5e1">${valsCol1[3]}</text>
      <text x="240" y="219" font-family="monospace" font-size="12" font-weight="500" fill="#cbd5e1">${valsCol2[3]}</text>
    </g>
    <g transform="translate(360, 420)">
      <rect x="0" y="0" width="370" height="50" fill="#0055ff" fill-opacity="0.05" stroke="#0055ff" stroke-dasharray="2 2" stroke-width="1" />
      <text x="15" y="22" font-family="monospace" font-size="9" fill="#0055ff" font-weight="bold">AUTOGENERATED DESIGN:</text>
      <text x="15" y="37" font-family="monospace" font-size="8" fill="#64748b">Preset specifications loaded due to service rate limitation.</text>
    </g>
    <rect x="60" y="500" width="670" height="1" fill="#0055ff" opacity="0.3" />
    <text x="60" y="535" font-family="monospace" font-size="9" font-weight="bold" fill="#0055ff" letter-spacing="1">PATENT DEPLOYMENT : SYS-X99</text>
    <text x="60" y="550" font-family="monospace" font-size="8" fill="#38bdf8" opacity="0.5">EST. 2026 / STREET THREADX CORE</text>
    <text x="540" y="535" font-family="monospace" font-size="9" font-weight="bold" fill="#ffffff" letter-spacing="1">UNITS : US METRIC STANDARD</text>
    <text x="540" y="550" font-family="monospace" font-size="8" fill="#cbd5e1" opacity="0.5">MFS PRE-RESERVATION ONLINE</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const getFallbackPromotionalImage = (prompt: string) => {
  const cleanPrompt = (prompt || "PREMIUM APPAREL").replace(/["&<>]/g, "").substring(0, 80) + "...";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
    <defs>
      <linearGradient id="promo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#09090b" />
        <stop offset="100%" stop-color="#27272a" />
      </linearGradient>
    </defs>
    <rect width="800" height="800" fill="url(#promo-grad)" stroke="#3f3f46" stroke-width="2"/>
    <g opacity="0.05">
      <circle cx="400" cy="400" r="300" fill="none" stroke="#ffffff" stroke-width="1" />
      <circle cx="400" cy="400" r="200" fill="none" stroke="#ffffff" stroke-width="1.5" />
      <line x1="100" y1="400" x2="700" y2="400" stroke="#ffffff" stroke-width="1" />
      <line x1="400" y1="100" x2="400" y2="700" stroke="#ffffff" stroke-width="1" />
    </g>
    <line x1="100" y1="100" x2="200" y2="100" stroke="#0055ff" stroke-width="3" />
    <line x1="100" y1="100" x2="100" y2="200" stroke="#0055ff" stroke-width="3" />
    <text x="120" y="300" font-family="-apple-system, sans-serif" font-weight="900" font-size="44" fill="#ffffff" letter-spacing="-1">STREET THREADX</text>
    <text x="120" y="345" font-family="-apple-system, sans-serif" font-weight="bold" font-size="16" fill="#0055ff" letter-spacing="4">EXCLUSIVE CAMPAIGN PRESET</text>
    <text x="120" y="440" font-family="-apple-system, sans-serif" font-weight="500" font-size="16" fill="#a1a1aa" width="560">${cleanPrompt}</text>
    <rect x="120" y="550" width="560" height="1" fill="#3f3f46" />
    <text x="120" y="585" font-family="monospace" font-size="11" fill="#71717a">AUTONOMOUS TEMPLATE DROP: ACTIVE</text>
    <text x="120" y="605" font-family="monospace" font-size="11" fill="#71717a">EMULATOR RENDERING STAGE: STX-V3</text>
    <text x="480" y="585" font-family="monospace" font-size="11" fill="#0055ff" font-weight="bold">STANDBY : SECURE_OK</text>
    <text x="480" y="605" font-family="monospace" font-size="11" fill="#71717a">AUTOPILOT GRAPHICS SYSTEM</text>
    <rect x="40" y="40" width="720" height="720" fill="none" stroke="#27272a" stroke-width="1" />
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const getFallbackModelSwapImage = (productName: string, category: string, seed: number) => {
  const cleanProd = (productName || "STREET PIECE").replace(/["&<>]/g, "");
  const cleanCat = (category || "STREETWEAR").replace(/["&<>]/g, "").toUpperCase();
  const themes = [
    { bg: "#0d0d12", accent: "#0055ff", label: "NEON INDUSTRIAL" },
    { bg: "#141517", accent: "#10b981", label: "CYBERPUNK SLATE" },
    { bg: "#1c1412", accent: "#f59e0b", label: "TECHWEAR ORANGE" },
    { bg: "#111827", accent: "#ec4899", label: "METROPOLIS PINK" },
    { bg: "#020617", accent: "#38bdf8", label: "HYPERGRID COLD" },
  ];
  const theme = themes[(seed - 1) % themes.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 600" width="450" height="600">
    <rect width="450" height="600" fill="${theme.bg}" stroke="#1f2937" stroke-width="2"/>
    <g opacity="0.15">
      <circle cx="225" cy="220" r="180" fill="none" stroke="${theme.accent}" stroke-width="1" />
      <circle cx="225" cy="220" r="120" fill="none" stroke="#ffffff" stroke-width="0.5" />
      <line x1="50" y1="220" x2="400" y2="220" stroke="#ffffff" stroke-width="0.5" />
      <line x1="225" y1="50" x2="225" y2="390" stroke="#ffffff" stroke-width="0.5" />
    </g>
    <rect x="20" y="20" width="410" height="560" fill="none" stroke="#1f2937" stroke-width="1" />
    <text x="45" y="55" font-family="monospace" font-size="9" fill="${theme.accent}" font-weight="black" letter-spacing="1">STREET THREADX // LOOKBOOK_PRESET_${seed}</text>
    <text x="45" y="70" font-family="monospace" font-size="8" fill="#4b5563" letter-spacing="1">NEURAL CATALOG GENERATOR / SEED ${seed}</text>
    <g transform="translate(10, -50)">
      <path d="M 180,250 C 195,255 225,255 240,250 L 290,270 L 265,340 L 240,330 L 240,510 L 180,510 L 180,330 L 155,340 L 130,270 Z" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.4" />
      <path d="M 180,250 C 195,255 225,255 240,250 L 290,270 L 265,340" fill="none" stroke="${theme.accent}" stroke-width="2" opacity="0.8" />
    </g>
    <text x="45" y="470" font-family="-apple-system, sans-serif" font-weight="900" font-size="18" fill="#ffffff" letter-spacing="-0.5">${cleanProd}</text>
    <text x="45" y="492" font-family="-apple-system, sans-serif" font-weight="bold" font-size="10" fill="${theme.accent}" letter-spacing="2">${cleanCat}</text>
    <text x="45" y="530" font-family="monospace" font-size="9" fill="#9ca3af">${theme.label} LOOKBOOK SHOT</text>
    <text x="45" y="545" font-family="monospace" font-size="8" fill="#4b5563">EXCLUSIVE STREETWEAR SPECIMEN VARIANT #${seed}</text>
    <rect x="330" y="515" width="75" height="30" fill="none" stroke="${theme.accent}" stroke-width="1" />
    <text x="367" y="533" font-family="monospace" font-size="9" fill="${theme.accent}" font-weight="bold" text-anchor="middle">STX_LIVE</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const generateModelSwapImages = async (base64Image: string, productName: string, category: string, count: number = 4) => {
  const client = await getAiClient();
  
  const prompt = `Based on this product image (a ${productName} ${category}), generate a high-quality lifestyle image of a cool model wearing this exact item in a stylish urban setting. The model should be diverse in ethnicity and gender. The image should look like a professional streetwear lookbook photo. Maintain the key design elements of the product.`;

  const generateOne = async (seed: number) => {
      if (!client) {
        return getFallbackModelSwapImage(productName, category, seed);
      }
      try {
        const response = await client.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Image,
                  mimeType: "image/jpeg",
                },
              },
              {
                text: prompt + ` Variant #${seed}.`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: "3:4",
              imageSize: "1K"
            }
          }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      } catch (error: any) {
        console.warn(`Gemini Model Gen Error (Seed ${seed}), falling back to beautiful SVG preset...`);
        return getFallbackModelSwapImage(productName, category, seed);
      }
      return getFallbackModelSwapImage(productName, category, seed);
  };

  const tasks = Array.from({ length: Math.min(Math.max(count, 1), 8) }, (_, i) => generateOne(i + 1));
  const results = await Promise.all(tasks);

  return results.filter(Boolean) as string[];
};

export const generatePromotionalImage = async (prompt: string) => {
  const client = await getAiClient();
  if (!client) return getFallbackPromotionalImage(prompt);

  const fullPrompt = `${prompt}. High-quality professional product photography, minimalist urban aesthetic, streetwear vibe, 8k resolution, photorealistic.`;
  
  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.warn("Gemini Image Gen Error, returning beautiful SVG fallback limits.");
    return getFallbackPromotionalImage(prompt);
  }
  return getFallbackPromotionalImage(prompt);
};

export const generateOgImage = async (productName: string, category: string, description: string) => {
  const client = await getAiClient();
  if (!client) return getFallbackOgImage(productName, category, description);

  const fullPrompt = `A premium professional Open Graph (OG) social share banner artwork for an exclusive streetwear product named "${productName}" in category "${category}".
Details: "${description}".
The style must be an elite streetwear lookbook photography mixed with modern editorial design:
- Sleek minimalist layout showing high-fashion streetwear representation of the item.
- Visual elements/accents of cyberpunk, urban, cyber-industrial, or premium minimal aesthetic.
- Sophisticated ambient neon blue and dark slate lighting with realistic clothing fabric textures.
- Professional composition suitable for social media sharing cards (Facebook, Twitter, LinkedIn, iMessage), 8k resolution, photorealistic.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.warn("Gemini OG Image Gen Error, returning beautiful SVG fallback due to API limits.");
    return getFallbackOgImage(productName, category, description);
  }
  return getFallbackOgImage(productName, category, description);
};

export const generateSizeChartImage = async (productName: string, category: string, extraPrompt: string = "") => {
  const client = await getAiClient();
  if (!client) return getFallbackSizeChartImage(productName, category, extraPrompt);

  const fullPrompt = `A premium professional technical size guide and measurement chart diagram for a product named "${productName}" in category "${category}". ${extraPrompt}
The style must be a minimalist streetwear industrial/techwear blueprint design:
- Sleek line-art illustration showing a silhouette/schematic of the apparel (e.g. hoodie or t-shirt) with arrow lines indicating key measurement paths (chest, height, sleeve).
- A clean, hyper-readable measurement table (showing Small, Medium, Large sizes) integrated into the design.
- Dark blueprint slate gray/black background with thin neon blue/white/cyan lines and futuristic typography.
- Professional, visually appealing, clean grid, no spelling errors, high resolution 8k graphic, photorealistic rendering of a digital catalog spec.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.warn("Gemini Size Chart Image Gen Error, returning beautiful SVG fallback limits.");
    return getFallbackSizeChartImage(productName, category, extraPrompt);
  }
  return getFallbackSizeChartImage(productName, category, extraPrompt);
};

export const generateSupportReply = async (inquiry: string, customerContext: string = 'No additional context available.') => {
  const client = await getAiClient();
  if (!client) throw new Error("Gemini API key not configured");
  const response = await client.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: inquiry,
    config: {
      systemInstruction: `You are the Lead Stylist for StreetThreadX—a high-performance streetwear institution.
Your goal is to draft replies that are confident, concise, and technically informed.

Brand DNA:
- Tone: Technical, elite, minimalist. 
- Style: Rapid, clear, high-impact.
- Shipping: 2-4 days (Dhaka), 3-7 days (National).
- Custom Orders: 50% advance payment required via bKash/Nagad/Rocket.
- Returns: 7-day technical verification cycle.

Contextual Intelligence:
${customerContext}

Instructions:
1. Acknowledge user status.
2. Provide precise metadata.
3. Sign off as "StreetThreadX Stylist Core".`,
    }
  });
  return response.text;
};

export const generateAgentMonitorReply = async (query: string, coreStats: any) => {
  const client = await getAiClient();
  if (!client) throw new Error("Gemini API key not configured");
  const response = await client.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: `You are the StreetThreadX AI Site Monitor. 
User query: "${query}"
Context Stats: ${JSON.stringify(coreStats)}.
Respond concisely and professionally in 1-2 sentences. If asked to act on something, say you have submitted a background task.`,
  });
  return response.text;
};

export const generateAnalyticsReport = async (stats: any) => {
  const client = await getAiClient();
  if (!client) throw new Error("Gemini API key not configured");
  const response = await client.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: `Analyze these weekly Shopify stats: ${JSON.stringify(stats)}. Provide a 2-sentence insight on performance and 1 actionable tip.`,
  });
  return response.text;
};

export const generateChatAgentResponse = async (message: string, products: Product[], customerInfo?: any, cartItems: any[] = [], imageBase64DataUrl?: string) => {
  const customAi = await getAiClient();
  if (!customAi) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
  
  try {
    const cartSummary = cartItems.length > 0 
      ? `Current Cart: ${cartItems.map(item => `${item.name} (x${item.quantity})`).join(', ')}`
      : 'Cart is empty.';
    
    const activeProducts = products.filter(p => p.status === 'Published');
    const productCatalogContext = activeProducts.length > 0 
      ? `Product Catalog (Available to recommend):\n${activeProducts.map(p => `- ${p.name} ($${p.price}) in ${p.category}. ${p.description || ''}`).join('\n')}`
      : 'Product Catalog: No active products available right now.';

    const customerContext = `
${customerInfo && customerInfo.email ? `Target User: ${customerInfo.name || 'KNOWN_USER'}, Email: ${customerInfo.email}` : 'Session Type: Anonymous (NOT LOGGED IN / NEW USER)'}
${cartSummary}
`.trim();

    const tools = [{
      functionDeclarations: [
        {
          name: 'check_stock',
          description: 'Check stock availability for a specific item and size.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              item_name: { type: Type.STRING, description: 'Name of the product' },
              size: { type: Type.STRING, description: 'Size (e.g., S, M, L, XL)' }
            },
            required: ['item_name', 'size']
          }
        },
        {
          name: 'get_products_by_category',
          description: 'Get all active products in a specific category.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              category_name: { type: Type.STRING, description: 'Category name (e.g., Hoodies, T-Shirts)' }
            },
            required: ['category_name']
          }
        }
      ]
    }];
    
    const systemInstruction = `You are the StreetThreadX Senior Sales Agent—a deeply human, persuasive, and empathetic streetwear expert.
Your ultimate goal is to connect with the customer, understand their style needs, and enthusiastically pitch our premium apparel, driving them to make a purchase.

Brand DNA:
- Identity: High-end streetwear, limited drops, premium quality.
- Payment: 50% advance secures their piece (pitch this as an exclusive reservation for high-demand items).
- Delivery: 2-4 days (Dhaka), 3-7 days (National).

Behavioral Guidelines:
1. Act like a real, enthusiastic human sales associate (use active, persuasive, and validating language).
2. Proactively recommend products that match their vibe. 
3. Create a sense of urgency (e.g., "these are selling fast", "limited sizes left").
4. Always solve their problems instantly, but gracefully pivot back to exciting styles they should grab.
5. Keep responses punchy, conversational, and persuasive (2-3 sentences max).

Customer Context:
${customerContext}

${productCatalogContext}`;

    const parts: any[] = [{ text: message }];
    
    if (imageBase64DataUrl) {
      const dataPart = imageBase64DataUrl.split(';base64,').pop();
      const mimeType = imageBase64DataUrl.split(';base64,')[0].replace('data:', '');
      if (dataPart && mimeType) {
        parts.push({
          inlineData: {
            mimeType,
            data: dataPart
          }
        });
      }
    }

    let contents: any[] = [{ role: 'user', parts }];

    const response = await customAi.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction,
        tools,
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      let result = '';

      if (call.name === 'check_stock') {
        const args = call.args as any;
        const item = products.find(p => p.name.toLowerCase().includes((args.item_name || '').toLowerCase()));
        if (item) {
          result = `Stock for ${item.name} size ${args.size}: ${item.stock || 'In Stock'}. Price: ৳${item.price}. Image: ${item.images?.[0] || ''}`;
        } else {
          result = `Product not found.`;
        }
      } else if (call.name === 'get_products_by_category') {
        const args = call.args as any;
        const catItems = products.filter(p => p.category.toLowerCase().includes((args.category_name || '').toLowerCase()));
        if (catItems.length > 0) {
          result = `Products in ${args.category_name}: \n` + catItems.map(p => `- ${p.name}: ৳${p.price} [Image: ${p.images?.[0] || ''}]`).join('\n');
        } else {
          result = `No products found in ${args.category_name}.`;
        }
      }

      contents.push(response.candidates?.[0]?.content as any);
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: call.name, response: { result } } }]
      });

      const secondResponse = await customAi.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction,
          tools,
        }
      });
      return secondResponse.text;
    }

    return response.text;
  } catch (error: any) {
    console.error("CHAT_AGENT_ERROR:", error);
    if (error.message?.includes('429') || error.message?.includes('exhausted')) {
      throw new Error("AI_QUOTA_EXCEEDED: Our stylists are currently processing other VIP orders. Please send your signal again in 60 seconds.");
    }
    if (error.message?.includes('503') || error.message?.includes('high demand') || error.message?.includes('UNAVAILABLE')) {
      throw new Error("AI_SERVICE_UNAVAILABLE: The StreetThreadX neural link is experiencing heavy VIP traffic. Please try again in a few moments.");
    }
    throw new Error(`AI_CHAT_ERROR: ${error.message}`);
  }
};

export const generateResponseSuggestions = async (messages: ChatMessage[]) => {
  const client = await getAiClient();
  if (!client) throw new Error("Gemini API key not configured");
  const chatContext = messages.slice(-5).map(m => `${m.isAdmin ? 'ADMIN' : 'CUSTOMER'}: ${m.text}`).join('\n');
  const response = await client.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: `Based on the following chat conversation, generate 3 short, professional, and helpful response suggestions for the support agent.
Brand: StreetThreadX (Elite Streetwear).
Tone: Efficient, minimalist, confident.

Chat:
${chatContext}

Format as a JSON array of 3 strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};
