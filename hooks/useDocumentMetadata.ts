import { useEffect } from 'react';
import { Product, ViewState, SocialSettings } from '../types';

/**
 * Custom hook to dynamically update document title and meta information
 * based on the active view, product, or category filter to improve SEO/discoverability.
 */
export function useDocumentMetadata(
  selectedProduct: Product | null,
  activeCategory: string,
  currentView: ViewState,
  socialSettings?: SocialSettings
) {
  useEffect(() => {
    // --- Default metadata values ---
    let title = 'STREET THREADX. | Premium Streetwear';
    let description = 'Premium streetwear engineered for the modern nomad. Quality materials, minimalist design, maximum impact.';
    let image = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800';
    let type = 'website';
    let robots = 'index, follow';
    let keywords = 'streetwear, fashion, premium custom apparel, Dhaka fashion, limited drop, minimalist wardrobe';

    const baseUrl = window.location.origin;
    let currentUrl = baseUrl;

    // --- Determine values based on current view/selection ---
    if (selectedProduct) {
      // 1. Viewing product details - Use stored SEO metadata if available
      title = selectedProduct.seoTitle || `${selectedProduct.name} | STREET THREADX.`;
      description = selectedProduct.seoDescription || selectedProduct.description || `Exquisite ${selectedProduct.name} by STREET THREADX. Category: ${selectedProduct.category}. Brand: ${selectedProduct.brand || 'STREET THREADX'}.`;
      currentUrl = `${baseUrl}#product=${selectedProduct.id}`;
      keywords = `${selectedProduct.name.toLowerCase()}, streetwear, premium ${selectedProduct.category.toLowerCase()}, custom ${selectedProduct.category.toLowerCase()}, limited apparel, streetthreadx`;
      
      if (selectedProduct.ogImage) {
        image = selectedProduct.ogImage;
      } else if (selectedProduct.images && selectedProduct.images.length > 0) {
        image = selectedProduct.images[0];
      }
      type = 'og:product';
    } else if (currentView === ViewState.STORE) {
      // 2. Browsing Store with filter
      if (activeCategory && activeCategory !== 'ALL') {
        currentUrl = `${baseUrl}#category=${activeCategory.toLowerCase()}`;
        // Check for category-specific SEO metadata
        const categorySeo = socialSettings?.categorySEO?.find(c => c.category.toUpperCase() === activeCategory.toUpperCase());
        
        if (categorySeo) {
          if (categorySeo.seoTitle) title = categorySeo.seoTitle;
          if (categorySeo.seoDescription) description = categorySeo.seoDescription;
          if (categorySeo.ogImage) image = categorySeo.ogImage;
        } else {
          const formattedCategory = activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1).toLowerCase();
          title = `${formattedCategory} Collection | STREET THREADX.`;
          description = `Browse the latest ${activeCategory.toLowerCase()} designs in our exclusive premium streetwear line. Designed in Dhaka, built for the streets.`;
        }
        keywords = `${activeCategory.toLowerCase()}, streetwear, clothing, fashion collection, premium streetthreadx`;
      }
    } else if (currentView === ViewState.WISHLIST) {
      // 3. User Wishlist
      title = 'My Wishlist | STREET THREADX.';
      description = 'View and track your curated collection of premium streetwear garments.';
      currentUrl = `${baseUrl}#wishlist`;
      robots = 'noindex, nofollow';
    } else if (currentView === ViewState.TRACK_ORDER) {
      // 4. Order Tracking
      title = 'Track Order | STREET THREADX.';
      description = 'Enter your Order ID to monitor shipping and delivery log status in real-time.';
      currentUrl = `${baseUrl}#track-order`;
      robots = 'noindex, nofollow';
    } else if (currentView === ViewState.CUSTOMER_PROFILE) {
      // 5. Customer Account
      title = 'My Profile | STREET THREADX.';
      description = 'Access your personal credentials, digital receipts, and historic streetwear order logs.';
      currentUrl = `${baseUrl}#profile`;
      robots = 'noindex, nofollow';
    } else if (currentView === ViewState.SUPPORT) {
      // 6. Help/Support
      title = 'Support Terminal | STREET THREADX.';
      description = 'Contact our support grid regarding payments, deliveries, sizing guides or exchange queries.';
      currentUrl = `${baseUrl}#support`;
      robots = 'noindex, nofollow';
    } else if (currentView === ViewState.ADMIN_LOGIN || currentView === ViewState.ADMIN_DASHBOARD) {
      // 7. Security Terminal / Admin Panels
      title = 'Control Panel | STREET THREADX.';
      description = 'Restricted secure access terminal. Log-in required.';
      currentUrl = `${baseUrl}#admin`;
      robots = 'noindex, nofollow';
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

    // --- Helper to update or create `<link>` tags ---
    try {
      let canonicalElement = document.querySelector('link[rel="canonical"]');
      if (!canonicalElement) {
        canonicalElement = document.createElement('link');
        canonicalElement.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalElement);
      }
      canonicalElement.setAttribute('href', currentUrl);
    } catch (e) {
      console.error('Canonical head update failed', e);
    }

    // --- Apply Updates to Head SEO Elements ---
    // Standard HTML Meta tags
    updateMetaTag('name', 'description', description);
    updateMetaTag('name', 'keywords', keywords);
    updateMetaTag('name', 'robots', robots);

    // OpenGraph Protocol (Facebook, Discord, LinkedIn, iMessage, etc.)
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:image', image);
    updateMetaTag('property', 'og:url', currentUrl);
    updateMetaTag('property', 'og:type', type);
    updateMetaTag('property', 'og:site_name', 'STREET THREADX.');

    // Twitter Card Standards
    updateMetaTag('property', 'twitter:title', title);
    updateMetaTag('property', 'twitter:description', description);
    updateMetaTag('property', 'twitter:image', image);
    updateMetaTag('property', 'twitter:url', currentUrl);
    updateMetaTag('property', 'twitter:card', 'summary_large_image');

    // --- Inject Search Engine JSON-LD Rich Schema Markups ---
    try {
      let jsonLdScript = document.getElementById('seo-structured-data');
      if (jsonLdScript) {
        jsonLdScript.remove();
      }
      
      jsonLdScript = document.createElement('script');
      jsonLdScript.setAttribute('id', 'seo-structured-data');
      jsonLdScript.setAttribute('type', 'application/ld+json');
      
      const schemaData: any = {
        "@context": "https://schema.org",
      };
      
      if (selectedProduct) {
        schemaData["@type"] = "Product";
        schemaData["name"] = selectedProduct.name;
        schemaData["image"] = image;
        schemaData["description"] = description;
        schemaData["sku"] = selectedProduct.id;
        schemaData["category"] = selectedProduct.category;
        schemaData["brand"] = {
          "@type": "Brand",
          "name": selectedProduct.brand || "STREET THREADX."
        };
        schemaData["offers"] = {
          "@type": "Offer",
          "priceCurrency": "BDT",
          "price": selectedProduct.price,
          "itemCondition": "https://schema.org/NewCondition",
          "availability": selectedProduct.stock > 0 
            ? "https://schema.org/InStock" 
            : "https://schema.org/OutOfStock",
          "url": currentUrl
        };
      } else {
        schemaData["@type"] = "WebSite";
        schemaData["name"] = "STREET THREADX.";
        schemaData["url"] = baseUrl;
        schemaData["description"] = "Premium streetwear engineered for the modern nomad. Designed in Dhaka, built for the streets.";
        schemaData["potentialAction"] = {
          "@type": "SearchAction",
          "target": `${baseUrl}?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        };
      }
      
      jsonLdScript.textContent = JSON.stringify(schemaData);
      document.head.appendChild(jsonLdScript);
    } catch (e) {
      console.error('JSON-LD injection failed', e);
    }

  }, [selectedProduct, activeCategory, currentView, socialSettings]);
}
