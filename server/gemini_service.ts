
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
  if (!ai) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
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
  } catch (error: any) {
    console.error("SEO_GEN_ERROR:", error);
    if (error.message?.includes('429') || error.message?.includes('exhausted')) {
      throw new Error("AI_QUOTA_EXCEEDED: Our AI systems are currently at peak capacity. Please try again in 60 seconds.");
    }
    throw new Error(`AI_MODELS_ERROR: ${error.message}`);
  }
};

export const generateTags = async (productName: string, description: string, category: string) => {
  if (!ai) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("TAGS_GEN_ERROR:", error);
    if (error.message?.includes('429') || error.message?.includes('exhausted')) {
      throw new Error("AI_QUOTA_EXCEEDED: Our AI systems are currently at peak capacity. Please try again in 60 seconds.");
    }
    throw new Error(`AI_TAGS_ERROR: ${error.message}`);
  }
};

export const generateProductDescription = async (productName: string, category: string, currentDescription?: string) => {
  if (!ai) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");

  const prompt = `Act as a luxury streetwear brand copywriter. Write a compelling, minimal, and edgy product description for a product named "${productName}" in the category "${category}". ${currentDescription ? `Current notes/description to expand upon: "${currentDescription}".` : ""} Focus on the fit, the aesthetic vibe, and the premium feel. Keep it under 60 words. No emojis.`;
  
  try {
    const response = await ai.models.generateContent({
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

export const generateModelSwapImages = async (base64Image: string, productName: string, category: string, count: number = 4) => {
  if (!ai) throw new Error("Gemini API key not configured");

  const prompt = `Based on this product image (a ${productName} ${category}), generate a high-quality lifestyle image of a cool model wearing this exact item in a stylish urban setting. The model should be diverse in ethnicity and gender. The image should look like a professional streetwear lookbook photo. Maintain the key design elements of the product.`;

  // We want to generate requested number of images.
  // Using gemini-3.1-flash-image-preview for high quality.
  
  const generateOne = async (seed: number) => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
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
        if (error.message?.includes('429') || error.message?.includes('exhausted')) {
          return "QUOTA_ERROR";
        }
        if (error.message?.includes('404') || error.message?.includes('not found')) {
           const fallbackRes = await ai.models.generateContent({
             model: 'gemini-3.1-flash-image-preview',
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
    if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('INVALID_ARGUMENT')) {
       console.log("Falling back from failed model...");
       const fallbackRes = await ai.models.generateContent({
         model: 'gemini-3.1-flash-image-preview',
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

export const generateOgImage = async (productName: string, category: string, description: string) => {
  if (!ai) throw new Error("Gemini API key not configured");

  const fullPrompt = `A premium professional Open Graph (OG) social share banner artwork for an exclusive streetwear product named "${productName}" in category "${category}".
Details: "${description}".
The style must be an elite streetwear lookbook photography mixed with modern editorial design:
- Sleek minimalist layout showing high-fashion streetwear representation of the item.
- Visual elements/accents of cyberpunk, urban, cyber-industrial, or premium minimal aesthetic.
- Sophisticated ambient neon blue and dark slate lighting with realistic clothing fabric textures.
- Professional composition suitable for social media sharing cards (Facebook, Twitter, LinkedIn, iMessage), 8k resolution, photorealistic.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
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
    console.error("Gemini OG Image Gen Error:", error);
    if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('INVALID_ARGUMENT')) {
       console.log("Falling back from failed model for OG Image...");
       const fallbackRes = await ai.models.generateContent({
         model: 'gemini-3.1-flash-image-preview',
         contents: { parts: [{ text: fullPrompt }] },
         config: { imageConfig: { aspectRatio: "16:9" } }
       });
       for (const part of fallbackRes.candidates?.[0]?.content?.parts || []) {
         if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
       }
    }
    throw error;
  }
  return null;
};

export const generateSizeChartImage = async (productName: string, category: string, extraPrompt: string = "") => {
  if (!ai) throw new Error("Gemini API key not configured");

  const fullPrompt = `A premium professional technical size guide and measurement chart diagram for a product named "${productName}" in category "${category}". ${extraPrompt}
The style must be a minimalist streetwear industrial/techwear blueprint design:
- Sleek line-art illustration showing a silhouette/schematic of the apparel (e.g. hoodie or t-shirt) with arrow lines indicating key measurement paths (chest, height, sleeve).
- A clean, hyper-readable measurement table (showing Small, Medium, Large sizes) integrated into the design.
- Dark blueprint slate gray/black background with thin neon blue/white/cyan lines and futuristic typography.
- Professional, visually appealing, clean grid, no spelling errors, high resolution 8k graphic, photorealistic rendering of a digital catalog spec.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
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
    console.error("Gemini Size Chart Image Gen Error:", error);
    // fallback if first model attempt fails
    if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('INVALID_ARGUMENT')) {
       console.log("Falling back from failed model for size chart...");
       const fallbackRes = await ai.models.generateContent({
         model: 'gemini-3.1-flash-image-preview',
         contents: { parts: [{ text: fullPrompt }] },
         config: { imageConfig: { aspectRatio: "4:3" } }
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
  if (!ai) throw new Error("Gemini API key not configured");
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
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
    model: 'gemini-3.1-flash-lite',
    contents: `Analyze these weekly Shopify stats: ${JSON.stringify(stats)}. Provide a 2-sentence insight on performance and 1 actionable tip.`,
  });
  return response.text;
};

export const generateChatAgentResponse = async (message: string, products: Product[], customerInfo?: any, cartItems: any[] = [], imageBase64DataUrl?: string) => {
  let customAi = ai;

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
          customAi = new GoogleGenAI({
            apiKey: key,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
        }
      } else {
        try {
          const { adminDb } = await import('../firebase-admin');
          if (adminDb) {
            const doc = await adminDb.collection('settings').doc('social').get();
            if (doc.exists && doc.data()?.agentApiKey) {
              customAi = new GoogleGenAI({
                apiKey: doc.data()?.agentApiKey,
                httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
              });
            }
          }
        } catch (innerErr: any) {
          console.log("adminDb fetch failed (likely permission denied or disabled), continuing:", innerErr?.message || innerErr);
        }
      }
    }
  } catch (err: any) {
    console.log("Using default API key setup:", err?.message || err);
  }

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
  if (!ai) throw new Error("Gemini API key not configured");
  const chatContext = messages.slice(-5).map(m => `${m.isAdmin ? 'ADMIN' : 'CUSTOMER'}: ${m.text}`).join('\n');
  const response = await ai.models.generateContent({
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
  return JSON.parse(response.text);
};
