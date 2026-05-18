import express from "express";
import path from "path";
import Stripe from 'stripe';
import multer from 'multer';
import * as gemini from './server/gemini_service';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required.');
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Removed file upload route as it's fully client-side now


  // AI Image Routes
  app.post("/api/ai/generate-seo", async (req, res) => {
    try {
      const { productName, description, category, tags } = req.body;
      const result = await gemini.generateSEOContent(productName, description, category, tags);
      res.json(result);
    } catch (error: any) {
      console.error("SEO Gen Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/generate-description", async (req, res) => {
    try {
      const { productName, category, currentDescription } = req.body;
      const result = await gemini.generateProductDescription(productName, category, currentDescription);
      res.json({ description: result });
    } catch (error: any) {
      console.error("Desc Gen Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/generate-model-images", async (req, res) => {
    try {
      const { image, imageUrl, productName, category, count } = req.body;
      let base64Image = '';

      if (image) {
        base64Image = image.split(';base64,').pop() || '';
      } else if (imageUrl) {
        // Fetch the image bits from the URL server-side to bypass CORS
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
        const buffer = await response.arrayBuffer();
        base64Image = Buffer.from(buffer).toString('base64');
      }

      if (!base64Image) throw new Error("No image data provided");
      
      const images = await gemini.generateModelSwapImages(base64Image, productName, category, count || 4);
      res.json({ images });
    } catch (error: any) {
      console.error("AI Model Generation error:", error);
      if (error.message?.includes('RESOURCE_EXHAUSTED')) {
         return res.status(429).json({ error: "RESOURCE_EXHAUSTED", originalError: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/generate-promo-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      const image = await gemini.generatePromotionalImage(prompt);
      if (!image) throw new Error("Model returned no image");
      res.json({ image });
    } catch (error: any) {
      console.error("Promo Gen Error:", error);
      if (error.message?.includes('RESOURCE_EXHAUSTED')) {
         return res.status(429).json({ error: "RESOURCE_EXHAUSTED", originalError: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/generate-support-reply", async (req, res) => {
    try {
      const { inquiry, customerContext } = req.body;
      const result = await gemini.generateSupportReply(inquiry, customerContext);
      res.json({ reply: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/generate-chat-response", async (req, res) => {
    try {
      const { message, products, customerInfo, cartItems, imageBase64DataUrl } = req.body;
      const result = await gemini.generateChatAgentResponse(message, products, customerInfo, cartItems, imageBase64DataUrl);
      res.json({ response: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/generate-suggestions", async (req, res) => {
    try {
      const { messages } = req.body;
      const result = await gemini.generateResponseSuggestions(messages);
      res.json({ suggestions: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/generate-monitor-reply", async (req, res) => {
    try {
      const { query, coreStats } = req.body;
      const result = await gemini.generateAgentMonitorReply(query, coreStats);
      res.json({ reply: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/generate-analytics", async (req, res) => {
    try {
      const { stats } = req.body;
      const result = await gemini.generateAnalyticsReport(stats);
      res.json({ report: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });



  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      const { items, customerEmail, shippingCost } = req.body;
      let stripeApiKey = process.env.STRIPE_SECRET_KEY;
      
      const origin = req.headers.origin || req.headers.referer || (req.protocol + '://' + req.get('host'));
      
      // If no valid stripe key is provided, we simulate a checkout session for demo purposes
      const isValidStripeKey = stripeApiKey && stripeApiKey.startsWith('sk_') && stripeApiKey !== 'sk_test_12345';
      
      if (!isValidStripeKey) {
        console.log("No valid Stripe API key found. Using mock checkout flow.");
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        return res.json({ url: `${origin}?checkout=success` });
      }

      const stripe = getStripe();

      const lineItems = items.map((item: any) => {
        return {
          price_data: {
            currency: 'bdt',
            product_data: {
              name: item.name,
              images: [item.images[0]],
              metadata: {
                size: item.selectedSize,
                color: item.selectedColor,
              }
            },
            unit_amount: Math.ceil((item.price * 100) / 2), // 50% of item price
          },
          quantity: item.quantity,
        };
      });

      if (shippingCost > 0) {
        lineItems.push({
          price_data: {
            currency: 'bdt',
            product_data: {
              name: 'Shipping (50% Advance)',
            },
            unit_amount: Math.ceil((shippingCost * 100) / 2), // 50% of shipping
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${origin}?checkout=success`,
        cancel_url: `${origin}?checkout=canceled`,
        customer_email: customerEmail,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("GLOBAL_ERROR_HANDLER:", err);
    res.status(500).json({ 
      error: "INTERNAL_SERVER_ERROR", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
