
import { GoogleGenAI, Type } from "@google/genai";

const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const ai = getAi();

export const generateSEOContent = async (productName: string, description: string, category: string, tags: string[] = []) => {
  if (!ai) return { seoTitle: productName, seoDescription: description };
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write an SEO meta title and meta description for this streetwear product: "${productName}". 
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
            seoDescription: { type: Type.STRING }
          },
          required: ["seoTitle", "seoDescription"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating SEO content:", error);
    return { seoTitle: productName, seoDescription: description };
  }
};

export const generateProductDescription = async (productName: string, category: string, currentDescription?: string) => {
  if (!ai) return `Premium ${productName} from our ${category} collection.`;
  try {
    const prompt = `Act as a luxury streetwear brand copywriter. Write a compelling, minimal, and edgy product description for a product named "${productName}" in the category "${category}". ${currentDescription ? `Current notes/description to expand upon: "${currentDescription}".` : ""} Focus on the fit, the aesthetic vibe, and the premium feel. Keep it under 60 words. No emojis.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating product description:", error);
    return `Premium ${productName} from our ${category} collection.`;
  }
};

export const generateSupportReply = async (inquiry: string, customerContext: string = 'No additional context available.') => {
  if (!ai) return "Thank you for reaching out to StreetThreadX support. Our team will review your message and provide a resolution shortly.";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: inquiry,
      config: {
        systemInstruction: `You are the Support Lead for StreetThreadX, a premium high-performance streetwear brand.
Your goal is to provide a draft reply to a customer inquiry that is professional, empathetic, and aligns with our "edgy elite" brand voice.

Brand Guidelines:
- Tone: Confident, efficient, slightly technical, and empathetic to the customer's "vibe".
- Style: Use concise sentences. Avoid fluff.
- Shipping Info: 2-4 days inside Dhaka, 3-7 days outside Dhaka.
- Returns: 7-day return policy for manufacturing defects or sizing issues (must be unworn).

Contextual Intelligence:
${customerContext}

Instructions for the Draft:
1. Acknowledge the specific issue mentioned in the inquiry.
2. If the customer context provides order history or status, leverage it to provide a more personalized and accurate answer.
3. Provide a helpful next step or explanation based on the brand guidelines.
4. Sign off as "StreetThreadX Support Squad".
5. Do not include any placeholder brackets like [Name] unless necessary. Use "GUEST" if the name is unknown.

Customer Inquiry:
${inquiry}`,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating support reply:", error);
    return "Thank you for reaching out to StreetThreadX support. Our team will review your message and provide a resolution shortly.";
  }
};

export const generateAnalyticsReport = async (stats: any) => {
  if (!ai) return "Analytics processing is currently unavailable.";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze these weekly Shopify stats: ${JSON.stringify(stats)}. Provide a 2-sentence insight on performance and 1 actionable tip.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating analytics report:", error);
    return "Analytics processing is currently unavailable.";
  }
};

export const generateChatAgentResponse = async (message: string, products: any[], customerInfo?: any, cartItems: any[] = []) => {
  if (!ai) return "Our neural link is currently down. Please stand by.";
  
  const productSummary = products.map(p => `- ${p.name}: ৳${p.price} (${p.category}) [Image: ${p.images?.[0] || ''}]`).join('\n');
  const cartSummary = cartItems.length > 0 
    ? `Current Cart: ${cartItems.map(item => `${item.name} (x${item.quantity})`).join(', ')}`
    : 'Cart is empty.';
  
  const customerContext = `
${customerInfo ? `Target User: ${customerInfo.name || 'GUEST'}, Email: ${customerInfo.email || 'N/A'}` : 'Session Type: Anonymous'}
${cartSummary}
`.trim();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: `You are "CORE_AI", the high-performance Customer Support Agent for StreetThreadX.
Personality: Technical, elite, efficient, and slightly edgy. Use prefixes like "UPLINK_ESTABLISHED" or "INTEL_FOUND".
Role: Provide rapid support intel and recommend high-demand streetwear.

Identity Verification:
${customerContext}

Support Intel:
- Shipping: 2-4 cycles inside Dhaka, 3-7 cycles elsewhere.
- Quality: Forged from premium 400GSM+ materials.
- Sizing: Elite oversized fit.

Inventory Available:
${productSummary}

Task:
1. Always confirm user identity if available (e.g. "IDENTITY_VERIFIED: Greetings, [Name]").
2. Answer support queries precisely.
3. Recommend products based on interest. When suggesting a product, ALWAYS include its image using Markdown: ![Name](URL).
4. Keep responses fast, data-driven, and distinctive.`,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error in AI Agent response:", error);
    return "RELAY_ERROR: Neural feedback detected. Re-initializing...";
  }
};
