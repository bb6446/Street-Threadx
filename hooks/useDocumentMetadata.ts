import { useEffect } from 'react';
import { Product, ViewState } from '../types';

/**
 * Custom hook to dynamically update document title and meta information
 * based on the active view, product, or category filter to improve SEO/discoverability.
 */
export function useDocumentMetadata(
  selectedProduct: Product | null,
  activeCategory: string,
  currentView: ViewState
) {
  useEffect(() => {
    // --- Default metadata values ---
    let title = 'STREET THREADX. | Premium Streetwear';
    let description = 'Premium streetwear engineered for the modern nomad. Quality materials, minimalist design, maximum impact.';
    let image = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800';
    let type = 'website';

    // --- Determine values based on current view/selection ---
    if (selectedProduct) {
      // 1. Viewing product details
      title = `${selectedProduct.name} | STREET THREADX.`;
      description = selectedProduct.description || `Exquisite ${selectedProduct.name} by STREET THREADX. Category: ${selectedProduct.category}. Brand: ${selectedProduct.brand || 'STREET THREADX'}.`;
      if (selectedProduct.images && selectedProduct.images.length > 0) {
        image = selectedProduct.images[0];
      }
      type = 'og:product';
    } else if (currentView === ViewState.STORE) {
      // 2. Browsing Store with filter
      if (activeCategory && activeCategory !== 'ALL') {
        const formattedCategory = activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1).toLowerCase();
        title = `${formattedCategory} Collection | STREET THREADX.`;
        description = `Browse the latest ${activeCategory.toLowerCase()} designs in our exclusive premium streetwear line. Designed in Dhaka, built for the streets.`;
      }
    } else if (currentView === ViewState.WISHLIST) {
      // 3. User Wishlist
      title = 'My Wishlist | STREET THREADX.';
      description = 'View and track your curated collection of premium streetwear garments.';
    } else if (currentView === ViewState.TRACK_ORDER) {
      // 4. Order Tracking
      title = 'Track Order | STREET THREADX.';
      description = 'Enter your Order ID to monitor shipping and delivery log status in real-time.';
    } else if (currentView === ViewState.CUSTOMER_PROFILE) {
      // 5. Customer Account
      title = 'My Profile | STREET THREADX.';
      description = 'Access your personal credentials, digital receipts, and historic streetwear order logs.';
    } else if (currentView === ViewState.SUPPORT) {
      // 6. Help/Support
      title = 'Support Terminal | STREET THREADX.';
      description = 'Contact our support grid regarding payments, deliveries, sizing guides or exchange queries.';
    } else if (currentView === ViewState.ADMIN_LOGIN || currentView === ViewState.ADMIN_DASHBOARD) {
      // 7. Security Terminal / Admin Panels
      title = 'Control Panel | STREET THREADX.';
      description = 'Restricted secure access terminal. Log-in required.';
    }

    // --- Update DOM Title ---
    document.title = title;

    // --- Helper to update or create `<meta>` tags ---
    const updateMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      try {
        let metaElement = document.querySelector(`meta[${attrName}="${attrValue}"]`);
        if (!metaElement) {
          metaElement = document.createElement('meta');
          metaElement.setAttribute(attrName, attrValue);
          document.head.appendChild(metaElement);
        }
        metaElement.setAttribute('content', content);
      } catch (error) {
        console.error(`Meta tag update failed for ${attrValue}:`, error);
      }
    };

    // --- Apply Updates to Head SEO Elements ---
    // Standard HTML
    updateMetaTag('name', 'description', description);

    // OpenGraph Protocol (Facebook, Discord, LinkedIn, etc.)
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:image', image);
    updateMetaTag('property', 'og:type', type);
    updateMetaTag('property', 'og:site_name', 'STREET THREADX.');

    // Twitter Card Standards
    updateMetaTag('property', 'twitter:title', title);
    updateMetaTag('property', 'twitter:description', description);
    updateMetaTag('property', 'twitter:image', image);
    updateMetaTag('property', 'twitter:card', 'summary_large_image');

  }, [selectedProduct, activeCategory, currentView]);
}
