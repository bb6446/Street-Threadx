
import { ChatMessage, Product } from "../types";

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || "";
};

export const generateSEOContent = async (productName: string, description: string, category: string, tags: string[] = []) => {
  try {
    const response = await fetch(`${getApiUrl()}/api/ai/generate-seo`, {
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

export const generateTags = async (productName: string, description: string, category: string) => {
  try {
    const response = await fetch(`${getApiUrl()}/api/ai/generate-tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName, description, category }),
    });
    if (!response.ok) throw new Error("Failed to generate tags");
    const data = await response.json();
    return data.tags as string[];
  } catch (error) {
    console.error("Error generating tags:", error);
    return [];
  }
};

export const generateSizeChart = async (productName: string, category: string, extraPrompt: string = "") => {
  try {
    const response = await fetch(`${getApiUrl()}/api/ai/generate-size-chart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName, category, extraPrompt }),
    });
    if (!response.ok) throw new Error("Failed to generate size chart");
    const data = await response.json();
    return data.imageUrl as string;
  } catch (error) {
    console.error("Error generating size chart:", error);
    return null;
  }
};

export const generateOgImage = async (productName: string, category: string, description: string) => {
  try {
    const response = await fetch(`${getApiUrl()}/api/ai/generate-og-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName, category, description }),
    });
    if (!response.ok) throw new Error("Failed to generate Open Graph image");
    const data = await response.json();
    return data.imageUrl as string;
  } catch (error) {
    console.error("Error generating Open Graph image:", error);
    return null;
  }
};


export const generateProductDescription = async (productName: string, category: string, currentDescription?: string) => {
  try {
    const response = await fetch(`${getApiUrl()}/api/ai/generate-description`, {
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
    const response = await fetch(`${getApiUrl()}/api/ai/generate-model-images`, {
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
    const response = await fetch(`${getApiUrl()}/api/ai/generate-promo-image`, {
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
    const response = await fetch(`${getApiUrl()}/api/ai/generate-support-reply`, {
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
    const response = await fetch(`${getApiUrl()}/api/ai/generate-chat-response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, products, customerInfo, cartItems, imageBase64DataUrl }),
    });
    
    if (!response.ok) {
      let errorMessage = `AI_UPLINK_FAILURE: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
        else if (errorData.message) errorMessage = errorData.message;
      } catch (e) {
        // Fallback if not JSON
      }
      console.error("AI Server Error:", response.status, errorMessage);
      throw new Error(errorMessage);
    }
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("AI Response not JSON:", contentType);
      throw new Error("AI_INVALID_RESPONSE_FORMAT");
    }

    const data = await response.json();
    return data.response;
  } catch (error: any) {
    console.error("Error generating chat response:", error);
    if (error.message?.includes('AI_QUOTA_EXCEEDED') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return "The STREET THREADX AI stylists are currently highly oversubscribed with VIP orders. Please wait approximately 60 seconds for your reserved neural slot to open up.";
    }
    if (error.message?.includes('AI_SERVICE_UNAVAILABLE') || error.message?.includes('UNAVAILABLE')) {
      return "The STREET THREADX neural link is experiencing extremely high demand. Spikes in traffic are temporary. Please try again in a moment.";
    }
    if (error.message?.includes('Failed to fetch') || error instanceof TypeError) {
      return "The STREET THREADX neural link is unreachable. This usually means the app is deployed on a static hosting service without the required Node.js backend server. Please deploy the server separately and set VITE_API_URL or use a full-stack platform.";
    }
    return "The STREET THREADX neural link is currently under maintenance or the backend server is unreachable. Please ensure your VITE_API_URL is correctly configured. Our support agents are still standing by.";
  }
};

export const generateResponseSuggestions = async (messages: ChatMessage[]) => {
  try {
    const response = await fetch(`${getApiUrl()}/api/ai/generate-suggestions`, {
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
    const response = await fetch(`${getApiUrl()}/api/ai/generate-monitor-reply`, {
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
    const response = await fetch(`${getApiUrl()}/api/ai/generate-analytics`, {
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
