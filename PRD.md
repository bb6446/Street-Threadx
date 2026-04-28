# Product Requirements Document (PRD): STREET THREADX.

## 1. Project Overview
**STREET THREADX.** is a premium, high-performance e-commerce platform engineered for modern streetwear enthusiasts. The application combines a minimalist, brutalist storefront with a powerful, AI-driven administrative suite to manage inventory, orders, and customer engagement with maximum efficiency.

## 2. Target Audience
- **Consumers:** Urban nomads and streetwear collectors looking for high-quality, limited-run apparel.
- **Administrators:** Boutique owners and staff who require real-time analytics, smart inventory management, and AI-assisted content generation.

## 3. Core Features

### 3.1 Storefront (B2C)
- **Product Matrix:** A responsive grid displaying premium apparel with advanced filtering by category (Hoodies, T-Shirts, etc.) and color.
- **Deep Linking:** Support for direct product sharing via URL hashes (e.g., `#product=1`).
- **Dynamic Cart System:** Real-time cart management with size selection and quantity adjustments.
- **Streamlined Checkout:** A single-page checkout flow capturing customer information and providing order confirmation.
- **Review System:** Customer-driven feedback loop with ratings and comments for every product.
- **Support HQ:** Dedicated modules for Shipping, Returns, and Sizing metrics.

### 3.2 Admin Dashboard (B2B/Internal)
- **Real-time Analytics Suite:** KPI cards for revenue, conversion rates, and AOV, complemented by graphical trends (Area/Pie charts).
- **Advanced Product Manager:**
    - **Multi-step Wizard:** Identity, Inventory, Media, and SEO steps.
    - **Variant Management:** Granular control over Size/Color combinations with individual stock and SKU tracking.
    - **AI Content Generation:** Automated product descriptions and SEO metadata (Title/Description) using Gemini API.
    - **Bulk Actions:** CSV uploads and mass status/price updates.
- **Order Life-cycle Management:**
    - **Order Creation:** Manual order entry for phone/in-person sales.
    - **Status Tracking:** Workflow management from PENDING to SHIPPED/DELIVERED.
    - **Secure Deletion:** Protected removal process with confirmation prompts.
- **Smart Inventory System:** Quick-edit stock tables with automated low-stock alerts and "Stock Boost" capabilities.
- **Security & RBAC:** Secure login with simulated Two-Factor Authentication (RSA) and Role-Based Access Control (SUPER_ADMIN, EDITOR, SUPPORT).
- **Global Activity Logs:** Real-time audit trail of all administrative actions.
- **Social Settings Module:** Centralized control for social media links, visibility toggles, and referral traffic tracking.

## 4. Technical Stack
- **Frontend:** React 18+ with TypeScript.
- **Styling:** Tailwind CSS (Brutalist/High-Contrast aesthetic).
- **State Management:** React Hooks (useState, useMemo, useEffect).
- **Charts:** Recharts for data visualization.
- **Icons:** Lucide React.
- **AI Integration:** Google Gemini API (@google/genai) for content and SEO.
- **Animations:** Framer Motion (motion/react).

## 5. Design Philosophy
- **Aesthetic:** "Digital Brutalism" — high contrast, heavy borders, monospace accents, and bold typography (Inter/JetBrains Mono).
- **UX:** Action-oriented interfaces. Admin tools prioritize density and speed, while the storefront focuses on product photography and effortless conversion.
- **Responsiveness:** Mobile-first architecture ensuring full functionality on all device classes.

## 6. Future Roadmap
- **Persistence:** Integration with Firestore for real-time database synchronization.
- **Authentication:** Migration to Firebase Auth for secure, multi-user sessions.
- **Payment Gateway:** Integration with Stripe or SSLCommerz for live transactions.
- **Advanced AI:** Automated image tagging and visual search capabilities.
