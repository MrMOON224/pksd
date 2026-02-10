-- =============================================
-- Product Categories Management Schema
-- =============================================

-- Create main categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subcategories table
CREATE TABLE IF NOT EXISTS public.subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Add category columns to products table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'category_id') THEN
        ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'subcategory_id') THEN
        ALTER TABLE public.products ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Categories: Allow all authenticated users to read
CREATE POLICY "Allow read access to all authenticated users"
    ON public.categories FOR SELECT
    TO authenticated
    USING (true);

-- Categories: Only admins can insert/update/delete
CREATE POLICY "Only admins can manage categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Subcategories: Allow all authenticated users to read
CREATE POLICY "Allow read access to all authenticated users"
    ON public.subcategories FOR SELECT
    TO authenticated
    USING (true);

-- Subcategories: Only admins can insert/update/delete
CREATE POLICY "Only admins can manage subcategories"
    ON public.subcategories FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- =============================================
-- Sample Data (Optional)
-- =============================================

-- Insert sample main categories
INSERT INTO public.categories (name, description) VALUES
    ('Electronics', 'Electronic devices and accessories'),
    ('Groceries', 'Food and beverage items'),
    ('Clothing', 'Apparel and fashion items')
ON CONFLICT (name) DO NOTHING;

-- Insert sample subcategories
INSERT INTO public.subcategories (category_id, name, description)
SELECT 
    c.id,
    sub.name,
    sub.description
FROM public.categories c
CROSS JOIN (VALUES
    ('Electronics', 'Mobile Phones', 'Smartphones and feature phones'),
    ('Electronics', 'Laptops', 'Notebook computers'),
    ('Electronics', 'Accessories', 'Chargers, cables, cases'),
    ('Groceries', 'Beverages', 'Drinks and refreshments'),
    ('Groceries', 'Snacks', 'Chips, cookies, and treats'),
    ('Groceries', 'Dairy', 'Milk, cheese, yogurt'),
    ('Clothing', 'Men', 'Men''s apparel'),
    ('Clothing', 'Women', 'Women''s apparel'),
    ('Clothing', 'Kids', 'Children''s clothing')
) AS sub(category_name, name, description)
WHERE c.name = sub.category_name
ON CONFLICT (category_id, name) DO NOTHING;
