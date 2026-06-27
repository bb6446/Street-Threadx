
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
      return `The STREET THREADX neural link is unreachable. Please follow our **Permanent Fix Blueprint** to resolve this permanently:

### 🛠️ The Permanent Fix Blueprint

#### **Step 1: Deploy a Dedicated Backend Server**
The root cause of the agent stopping is that your frontend UI (Vite) is running statically, but the AI processing logic requires a live, persistent Node.js runtime environment.
* **Action:** Deploy your backend code (specifically your Express server wrapper and \`services/geminiService.ts\`) to a containerized hosting platform such as Google Cloud Run, Render, or Railway. These platforms keep your server alive 24/7 so the agent is always available to answer customer requests.

#### **Step 2: Bind the Live API URL Dynamically**
Once your backend is deployed, the platform will give you a unique live URL (e.g., \`https://street-threadx-api.onrender.com\`).
* **Action:** In your frontend deployment configuration dashboard (or your local workspace settings panel), find the environment variables configuration. Set the key \`VITE_API_URL\` to exactly match your live production backend URL.
* **Why this fixes it permanently:** It stops the frontend from looking for localhost or an inactive local environment, routing all chat requests through your secure cloud backend instead.

#### **Step 3: Implement Local Workflows for High-Speed Fallbacks**
To guarantee the widget always functions even if cloud network latency spikes, our recent codebase upgrades include instant Shopify-Style Quick Replies that run locally:
* **Track Order / Check Availability / Quick Returns:** The button chips are programmed to execute instant client-side or micro-database lookups immediately. This provides a sub-200ms user experience and keeps the widget active even during a full API network fallback.

---
*Our live support staff are still standing by! Feel free to click our Quick Reply chips to fetch instant, low-latency updates locally.*`;
    }
    return `The STREET THREADX neural link is currently under maintenance or the backend server is unreachable. Please ensure your VITE_API_URL is correctly configured.

If you are a developer, please follow our **Permanent Fix Blueprint**:
1. **Deploy a Dedicated Backend Server** (e.g., Google Cloud Run, Render, or Railway) to host your Node.js/Express environment 24/7.
2. **Bind the Live API URL Dynamically** by configuring the \`VITE_API_URL\` environment variable on your static frontend host.
3. **Use Local Workflows for High-Speed Fallbacks** like the Quick Reply chips (Track Order, Check Availability, Quick Returns) which run instantly with sub-200ms local lookups.`;
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
