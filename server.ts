import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Stripe initialization (Lazy)
  let stripe: Stripe | null = null;
  const getStripe = () => {
    if (!stripe && process.env.STRIPE_SECRET_KEY) {
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { items, customerEmail, shippingCost } = req.body;
      const stripeClient = getStripe();

      if (!stripeClient) {
        // Fallback for demo if no key is provided
        return res.status(200).json({ 
          url: null, 
          message: "Stripe not configured. This is a demo fallback. In production, provide STRIPE_SECRET_KEY." 
        });
      }

      const lineItems = items.map((item: any) => ({
        price_data: {
          currency: "bdt",
          product_data: {
            name: item.name,
            images: item.images ? [item.images[0]] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));

      // Add shipping as a line item
      if (shippingCost > 0) {
        lineItems.push({
          price_data: {
            currency: "bdt",
            product_data: {
              name: "Shipping Fee",
            },
            unit_amount: Math.round(shippingCost * 100),
          },
          quantity: 1,
        });
      }

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        customer_email: customerEmail,
        success_url: `${req.headers.origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/?payment=cancelled`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Session Error:", error);
      res.status(500).json({ error: error.message });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
