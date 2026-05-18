
import { ChatMessage, Product } from "../types";

export const generateSEOContent = async (productName: string, description: string, category: string, tags: string[] = []) => {
  try {
    const response = await fetch("/api/ai/generate-seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName, description, category, tags }),
    });
    if (!response.ok) throw new Error("Failed to generate SEO");
    return await response.json();
  } catch (error) {
    console.error("Error generating SEO content:", error);
    return { seoTitle: productName, seoDescription: description };
  }
};

export const generateProductDescription = async (productName: string, category: string, currentDescription?: string) => {
  try {
    const response = await fetch("/api/ai/generate-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName, category, currentDescription }),
    });
    if (!response.ok) throw new Error("Failed to generate description");
    const data = await response.json();
    return data.description;
  } catch (error) {
    console.error("Error generating product description:", error);
    return `Premium ${productName} from our ${category} collection.`;
  }
};

export const generateModelSwapImages = async (image: string | null, imageUrl: string | null, productName: string, category: string, count: number = 4) => {
  try {
    const response = await fetch("/api/ai/generate-model-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, imageUrl, productName, category, count }),
    });
    if (!response.ok) throw new Error("Failed to generate model images");
    const data = await response.json();
    return data.images as string[];
  } catch (error) {
    console.error("Error generating model images:", error);
    return [];
  }
};

export const generatePromotionalImage = async (prompt: string) => {
  try {
    const response = await fetch("/api/ai/generate-promo-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error("Failed to generate promo image");
    const data = await response.json();
    return data.image;
  } catch (error) {
    console.error("Error generating promo image:", error);
    return null;
  }
};

export const generateSupportReply = async (inquiry: string, customerContext: string = 'No additional context available.') => {
  try {
    const response = await fetch("/api/ai/generate-support-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inquiry, customerContext }),
    });
    if (!response.ok) throw new Error("Failed to generate support reply");
    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error("Error generating support reply:", error);
    return "Thank you for contacting StreetThreadX. We will get back to you shortly.";
  }
};

export const generateChatAgentResponse = async (message: string, products: Product[], customerInfo?: any, cartItems: any[] = [], imageBase64DataUrl?: string) => {
  try {
    const response = await fetch("/api/ai/generate-chat-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, products, customerInfo, cartItems, imageBase64DataUrl }),
    });
    if (!response.ok) throw new Error("Failed to generate chat response");
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "Aura is currently refining her technical insights. Please try again in a moment.";
  }
};

export const generateResponseSuggestions = async (messages: ChatMessage[]) => {
  try {
    const response = await fetch("/api/ai/generate-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) throw new Error("Failed to generate suggestions");
    const data = await response.json();
    return data.suggestions;
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return ["Tell me more about the collection", "How does the 50% advance work?", "What's the shipping time?"];
  }
};

export const generateAgentMonitorReply = async (query: string, coreStats: any) => {
  try {
    const response = await fetch("/api/ai/generate-monitor-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, coreStats }),
    });
    if (!response.ok) throw new Error("Failed to generate monitor reply");
    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error("Error generating monitor reply:", error);
    return "Site systems stable. Monitoring query: " + query;
  }
};

export const generateAnalyticsReport = async (stats: any) => {
  try {
    const response = await fetch("/api/ai/generate-analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats }),
    });
    if (!response.ok) throw new Error("Failed to generate analytics");
    const data = await response.json();
    return data.report;
  } catch (error) {
    console.error("Error generating analytics report:", error);
    return "Performance metrics are currently being aggregated. Growth trend remains positive.";
  }
};
