
import { GoogleGenAI, Type, ThinkingLevel, GenerateContentResponse } from "@google/genai";
import { ChatMessage, Product } from "../types";

const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined.");
    return null;
  }
  return new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

const ai = getAi();

export const generateSEOContent = async (productName: string, description: string, category: string, tags: string[] = []) => {
  if (!ai) throw new Error("Gemini API key not configured");
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
};

export const generateProductDescription = async (productName: string, category: string, currentDescription?: string) => {
  if (!ai) throw new Error("Gemini API key not configured");

  const prompt = `Act as a luxury streetwear brand copywriter. Write a compelling, minimal, and edgy product description for a product named "${productName}" in the category "${category}". ${currentDescription ? `Current notes/description to expand upon: "${currentDescription}".` : ""} Focus on the fit, the aesthetic vibe, and the premium feel. Keep it under 60 words. No emojis.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text;
};

export const generateModelSwapImages = async (base64Image: string, productName: string, category: string, count: number = 4) => {
  if (!ai) throw new Error("Gemini API key not configured");

  const prompt = `Based on this product image (a ${productName} ${category}), generate a high-quality lifestyle image of a cool model wearing this exact item in a stylish urban setting. The model should be diverse in ethnicity and gender. The image should look like a professional streetwear lookbook photo. Maintain the key design elements of the product.`;

  // We want to generate requested number of images.
  // Using gemini-3.1-flash-image-preview for high quality.
  
  const generateOne = async (seed: number) => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
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
        console.error(`Gemini Model Gen Error (Seed ${seed}):`, error);
        if (error.message?.includes('404') || error.message?.includes('not found')) {
           const fallbackRes = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: {
               parts: [
                 { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
                 { text: prompt + ` Variant #${seed}.` }
               ]
             },
             config: { imageConfig: { aspectRatio: "3:4" } }
           });
           for (const part of fallbackRes.candidates?.[0]?.content?.parts || []) {
             if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
           }
        }
        return null;
      }
      return null;
  };

  const tasks = Array.from({ length: Math.min(Math.max(count, 1), 8) }, (_, i) => generateOne(i + 1));
  const results = await Promise.all(tasks);

  return results.filter(Boolean) as string[];
};

export const generatePromotionalImage = async (prompt: string) => {
  if (!ai) throw new Error("Gemini API key not configured");

  const fullPrompt = `${prompt}. High-quality professional product photography, minimalist urban aesthetic, streetwear vibe, 8k resolution, photorealistic.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
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
    console.error("Gemini Image Gen Error:", error);
    // Attempt fallback model if 3.1 fails
    if (error.message?.includes('404') || error.message?.includes('not found')) {
       console.log("Falling back to gemini-2.5-flash-image...");
       const fallbackRes = await ai.models.generateContent({
         model: 'gemini-2.5-flash-image',
         contents: { parts: [{ text: fullPrompt }] },
         config: { imageConfig: { aspectRatio: "1:1" } }
       });
       for (const part of fallbackRes.candidates?.[0]?.content?.parts || []) {
         if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
       }
    }
    throw error;
  }
  return null;
};

export const generateSupportReply = async (inquiry: string, customerContext: string = 'No additional context available.') => {
  if (!ai) throw new Error("Gemini API key not configured");
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
  if (!ai) throw new Error("Gemini API key not configured");
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are the StreetThreadX AI Site Monitor. 
User query: "${query}"
Context Stats: ${JSON.stringify(coreStats)}.
Respond concisely and professionally in 1-2 sentences. If asked to act on something, say you have submitted a background task.`,
  });
  return response.text;
};

export const generateAnalyticsReport = async (stats: any) => {
  if (!ai) throw new Error("Gemini API key not configured");
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze these weekly Shopify stats: ${JSON.stringify(stats)}. Provide a 2-sentence insight on performance and 1 actionable tip.`,
  });
  return response.text;
};

export const generateChatAgentResponse = async (message: string, products: Product[], customerInfo?: any, cartItems: any[] = [], imageBase64DataUrl?: string) => {
  if (!ai) throw new Error("Gemini API key not configured");
  
  const cartSummary = cartItems.length > 0 
    ? `Current Cart: ${cartItems.map(item => `${item.name} (x${item.quantity})`).join(', ')}`
    : 'Cart is empty.';
  
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
  
  const systemInstruction = `You are 'STREET THREADX Agent,' the elite customer success representative for digital streetwear powerhouse StreetThreadX. 
Your primary directive is TOTAL CUSTOMER SATISFACTION. You are not just a support agent; you are a problem-solver and brand advocate. Ensure every customer feels heard, valued, and completely satisfied with their interaction.

Your personality is professional, proactive, empathetic, and trend-aware. You are here to resolve concerns instantly, guide style choices, and ensure a seamless checkout experience.

CONVERSATIONS PRIORITIES:
1. CUSTOMER HAPPINESS: If a user has a problem, solve it with extreme prejudice towards their satisfaction.
2. PROBLEM RESOLUTION: Be proactive. If they ask about a delay, explain our processing times gently and offer a solution.
3. BRAND GUIDANCE: Act as a virtual stylist. Suggest pieces that complement their inquiries.

CORE KNOWLEDGE - PRODUCTS:
- Premium custom streetwear institution.
- Products: Heavyweight Hoodies (450GSM), Premium Organic Tees, Technical Cargos, Cyber Accessories.
- Key Collections: "Urban Pulse", "Heritage Flow", "Momentum".

CORE KNOWLEDGE - SHIPPING & LOGISTICS:
- Delivery timeframe: 2-4 solar days (Dhaka), 3-7 solar days (National).
- Order verification involves a technical handshake.

CORE KNOWLEDGE - PAYMENT & CHECKOUT (CRITICAL):
- We operate on a "50% Advance" payment model. 
- 50% upfront to initiate production/logistics. 
- 50% balance before final dispatch.
- Accepted: bKash, Nagad, Rocket, Cards.

CONVERSATION RULES:
1. THE GREETING: Professional yet welcoming.
2. EXPLAINING PAYMENTS: Always present the 50% model as a premium "Reserve" feature that guarantees their slot in our limited production runs.
3. SATISFACTION FIRST: Prioritize resolving complaints over making a sale. A happy customer is a returning customer.
4. AGENT PERSONA: Stay in character as a helpful, human-like elite support agent.
5. CONCISE RESPONSES: Max 3-4 high-impact sentences.

CUSTOMER CONTEXT:
${customerContext}`;

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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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

    const secondResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        tools,
      }
    });
    return secondResponse.text;
  }

  return response.text;
};

export const generateResponseSuggestions = async (messages: ChatMessage[]) => {
  if (!ai) throw new Error("Gemini API key not configured");
  const chatContext = messages.slice(-5).map(m => `${m.isAdmin ? 'ADMIN' : 'CUSTOMER'}: ${m.text}`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
  return JSON.parse(response.text);
};
