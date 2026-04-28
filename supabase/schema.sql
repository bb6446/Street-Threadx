-- supabase/schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Database Schema
-- ==========================================

-- Customers Table (Extended profiles linked to auth.users)
CREATE TABLE customers (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    shipping_address TEXT,
    billing_address TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Products Table
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    stock_level INTEGER DEFAULT 0 NOT NULL,
    category TEXT,
    collection TEXT, -- e.g., 'Drop 02 // 2024'
    size TEXT, -- e.g., 'S', 'M', 'L', 'XL'
    color TEXT,
    images TEXT[],
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Published'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Orders Table
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Order Items Table
CREATE TABLE order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 2. Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- Customers Policies
-- ------------------------------------------
-- Customers can view their own profile
CREATE POLICY "Customers can view own profile" 
    ON customers FOR SELECT 
    USING (auth.uid() = id);

-- Customers can update their own profile
CREATE POLICY "Customers can update own profile" 
    ON customers FOR UPDATE 
    USING (auth.uid() = id);

-- ------------------------------------------
-- Products Policies
-- ------------------------------------------
-- Anyone can view published products
CREATE POLICY "Anyone can view published products" 
    ON products FOR SELECT 
    USING (status = 'Published');

-- Only admins can insert/update/delete products
-- Assuming admin role is stored in JWT claims or a separate table.
-- Here we use a placeholder check for a custom claim `role` = 'admin'.
CREATE POLICY "Admins can manage products" 
    ON products FOR ALL 
    USING (auth.jwt() ->> 'role' = 'admin');

-- ------------------------------------------
-- Orders Policies
-- ------------------------------------------
-- Customers can view their own orders
CREATE POLICY "Customers can view own orders" 
    ON orders FOR SELECT 
    USING (auth.uid() = customer_id);

-- Customers can insert their own orders
CREATE POLICY "Customers can insert own orders" 
    ON orders FOR INSERT 
    WITH CHECK (auth.uid() = customer_id);

-- ------------------------------------------
-- Order Items Policies
-- ------------------------------------------
-- Customers can view their own order items
CREATE POLICY "Customers can view own order items" 
    ON order_items FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.customer_id = auth.uid()
        )
    );

-- Customers can insert their own order items
CREATE POLICY "Customers can insert own order items" 
    ON order_items FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.customer_id = auth.uid()
        )
    );

-- ==========================================
-- 3. RPC for Transactional Order Creation
-- ==========================================
-- This function allows inserting an order and its items in a single transaction.
-- It also decrements the product stock levels.

CREATE OR REPLACE FUNCTION create_order(
    p_customer_id UUID,
    p_subtotal DECIMAL,
    p_discount DECIMAL,
    p_total_amount DECIMAL,
    p_shipping_address TEXT,
    p_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
BEGIN
    -- Insert Order
    INSERT INTO orders (customer_id, subtotal, discount, total_amount, shipping_address, status)
    VALUES (p_customer_id, p_subtotal, p_discount, p_total_amount, p_shipping_address, 'pending')
    RETURNING id INTO v_order_id;

    -- Insert Order Items and Update Stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Insert item
        INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
        VALUES (
            v_order_id, 
            (v_item->>'product_id')::UUID, 
            (v_item->>'quantity')::INTEGER, 
            (v_item->>'price')::DECIMAL
        );
        
        -- Decrement stock
        UPDATE products 
        SET stock_level = stock_level - (v_item->>'quantity')::INTEGER
        WHERE id = (v_item->>'product_id')::UUID;
    END LOOP;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
