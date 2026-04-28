
import { Product } from './types';

export const ACCENT_COLOR = '#0055ff';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '8',
    name: 'PREMIUM ESSENTIAL TEE - WHITE',
    price: 790,
    description: 'A timeless classic. Crafted from 100% premium organic cotton for ultimate comfort and breathability. Features a relaxed fit and reinforced stitching for longevity.',
    materials: '100% Organic Cotton, 220GSM.',
    category: 'T-Shirts',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 50,
    minStockLevel: 10,
    sizes: ['M', 'L', 'XL'],
    isNewArrival: true,
    colors: ['White'],
    status: 'Published',
    taxCategory: 'Standard',
    seoTitle: 'Essential White Organic Cotton T-Shirt | ThreadX',
    seoDescription: 'Shop our Essential White Tee. Made from 100% premium organic cotton, this t-shirt offers a perfect blend of comfort and style. Available in M, L, XL.',
    tags: ['essential', 'organic', 'white tee']
  },
  {
    id: '9',
    name: 'PREMIUM ESSENTIAL TEE - BLACK',
    price: 790,
    description: 'The ultimate wardrobe staple. Deep black hue that stays vibrant wash after wash. Made from heavyweight organic cotton with a premium hand-feel.',
    materials: '100% Organic Cotton, 220GSM.',
    category: 'T-Shirts',
    images: [
      'https://images.unsplash.com/photo-1503341504253-dff48153452a?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 50,
    minStockLevel: 10,
    sizes: ['M', 'L', 'XL'],
    isNewArrival: true,
    colors: ['Black'],
    status: 'Published',
    taxCategory: 'Standard',
    seoTitle: 'Essential Black Organic Cotton T-Shirt | ThreadX',
    seoDescription: 'Discover the Essential Black Tee by ThreadX. Heavyweight organic cotton, durable construction, and a sleek fit. Sizes M to XL available.',
    tags: ['essential', 'organic', 'black tee']
  },
  {
    id: '1',
    name: 'THREADX CORE HOODIE',
    price: 9500,
    description: 'Constructed for the modern nomad. 450GSM heavyweight armor. Architectural boxy fit. Brutalist aesthetic. Foundation of the uniform. Engineered for life in the grey.',
    materials: '100% Premium Organic Cotton Fleece. Pre-shrunk and garment dyed for a vintage hand-feel.',
    category: 'Hoodies',
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1521223890158-f9f7c3d5ded1?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 12,
    minStockLevel: 10,
    sizes: ['S', 'M', 'L', 'XL'],
    isNewArrival: true,
    isBestSeller: true,
    colors: ['Jet Black', 'Stealth Grey', 'White', 'Black'],
    status: 'Published',
    taxCategory: 'Standard',
    seoTitle: 'ThreadX Core Hoodie - Heavyweight Streetwear',
    seoDescription: 'The foundation of the modern uniform. 450GSM heavyweight organic cotton hoodie with an architectural boxy fit.'
  },
  {
    id: '6',
    name: 'NEON CREW SWEATER',
    price: 8200,
    description: 'Premium brushed loopback cotton sweater with minimalist tonal embroidery.',
    materials: '80% Cotton, 20% Polyester Blend. Features high-density tonal embroidery on chest.',
    category: 'Sweaters',
    images: [
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 25,
    minStockLevel: 5,
    sizes: ['M', 'L', 'XL'],
    isNewArrival: true,
    colors: ['Jet Black', 'Vintage White', 'White', 'Black'],
    status: 'Published',
    taxCategory: 'Standard',
    seoTitle: 'Neon Crew Sweater - Minimalist Streetwear',
    seoDescription: 'Premium loopback cotton sweater with tonal embroidery. A minimalist staple for the modern nomad.'
  },
  {
    id: '2',
    name: 'THREADX GRAPHIC TEE',
    price: 4800,
    description: 'Vintage wash oversized t-shirt with signature neon graphic print on back.',
    materials: '220GSM Single Jersey Cotton. Screen-printed using water-based eco-inks.',
    category: 'T-Shirts',
    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800'],
    stock: 45,
    minStockLevel: 15,
    sizes: ['M', 'L', 'XL'],
    isNewArrival: true,
    colors: ['Vintage White'],
    status: 'Published',
    taxCategory: 'Standard',
    seoTitle: 'ThreadX Graphic Tee - Oversized Streetwear T-Shirt',
    seoDescription: 'Oversized vintage wash t-shirt with signature neon graphics. Made from 220GSM eco-friendly cotton.'
  },
  {
    id: '7',
    name: 'OVERSIZED KNIT PULLOVER',
    price: 10500,
    description: 'Relaxed fit heavyweight knit pullover with distressed hems.',
    materials: 'Wool and Acrylic hybrid knit for maximum warmth without the itch. Hand-distressed details.',
    category: 'Sweaters',
    images: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 8,
    minStockLevel: 5,
    sizes: ['S', 'M', 'L'],
    isBestSeller: true,
    colors: ['Jet Black'],
    status: 'Published',
    taxCategory: 'Standard',
    seoTitle: 'Oversized Knit Pullover - Distressed Streetwear',
    seoDescription: 'Heavyweight knit pullover with a relaxed fit and distressed details. Warm, stylish, and brutalist.'
  },
  {
    id: '3',
    name: 'CYBER BEANIE',
    price: 3200,
    description: 'Thick ribbed knit beanie with metallic branded plate.',
    materials: '100% Recycled Poly-Acrylic knit. Branded plate crafted from zinc alloy.',
    category: 'Accessories',
    images: ['https://images.unsplash.com/photo-1576828831022-ae41d437a78e?auto=format&fit=crop&q=80&w=800'],
    stock: 5,
    minStockLevel: 10,
    sizes: ['One Size'],
    isBestSeller: true,
    colors: ['Onyx'],
    status: 'Published',
    taxCategory: 'Standard',
    seoTitle: 'Cyber Beanie - Ribbed Knit Streetwear Hat',
    seoDescription: 'Recycled poly-acrylic ribbed beanie with a metallic branded plate. The ultimate tech-wear accessory.'
  },
  {
    id: '4',
    name: 'TECH ZIP HOODIE',
    price: 12500,
    description: 'Water-repellent tech fleece with integrated face mask and asymmetric zippers.',
    materials: 'DWR-coated Technical Fleece (Polyester/Elastane). Laser-cut zippers and reinforced seams.',
    category: 'Hoodies',
    images: ['https://images.unsplash.com/photo-1529139574466-a301f3d41d92?auto=format&fit=crop&q=80&w=800'],
    stock: 20,
    minStockLevel: 10,
    sizes: ['L', 'XL'],
    isNewArrival: true,
    colors: ['Jet Black'],
    status: 'Published',
    taxCategory: 'Standard',
    seoTitle: 'Tech Zip Hoodie - Water-Repellent Performance Wear',
    seoDescription: 'Advanced tech hoodie with integrated face mask and asymmetric zippers. Engineered for performance and style.'
  },
  {
    id: '5',
    name: 'GRID LOCK CARGOS',
    price: 11000,
    description: 'Technical cargo pants with 8 pockets and adjustable ankle straps.',
    materials: 'Ripstop Cotton/Nylon blend. Reinforced knee panels and industrial-grade webbing straps.',
    category: 'Accessories',
    images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=800'],
    stock: 18,
    minStockLevel: 10,
    sizes: ['30', '32', '34'],
    colors: ['Black'],
    status: 'Published',
    taxCategory: 'Standard',
    seoTitle: 'Grid Lock Cargos - Technical Streetwear Pants',
    seoDescription: '8-pocket technical cargo pants with adjustable straps. Durable ripstop fabric for the urban explorer.'
  }
];
