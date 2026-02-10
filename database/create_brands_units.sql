-- =============================================
-- Brands and Units Schema
-- =============================================

-- 1. Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Units Table (for both Base Units and others)
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,       -- e.g., "Piece", "Kilogram", "Box"
    short_name TEXT NOT NULL,        -- e.g., "pc", "kg", "bx"
    allow_decimals BOOLEAN DEFAULT false, -- e.g., true for kg, false for pcs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add columns to Products table
DO $$ 
BEGIN
    -- Link Product to Brand
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'brand_id') THEN
        ALTER TABLE public.products ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;
    END IF;

    -- Link Product to Unit (Base Unit)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'unit_id') THEN
        ALTER TABLE public.products ADD COLUMN unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Brands Policies
CREATE POLICY "Allow read access to all authenticated users" ON public.brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage brands" ON public.brands FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- Units Policies
CREATE POLICY "Allow read access to all authenticated users" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage units" ON public.units FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- =============================================
-- Sample Data
-- =============================================

-- Sample Brands
INSERT INTO public.brands (name, description) VALUES
    ('Generic', 'Unbranded or generic items'),
    ('Samsung', 'Electronics manufacturer'),
    ('Apple', 'Consumer electronics'),
    ('Nestle', 'Food and drink processing'),
    ('Nike', 'Footwear and apparel')
ON CONFLICT (name) DO NOTHING;

-- Sample Units
INSERT INTO public.units (name, short_name, allow_decimals) VALUES
    ('Piece', 'pc', false),
    ('Kilogram', 'kg', true),
    ('Gram', 'g', true),
    ('Liter', 'l', true),
    ('Milliliter', 'ml', true),
    ('Box', 'bx', false),
    ('Pack', 'pk', false),
    ('Dozen', 'dz', false),
    ('Meter', 'm', true)
ON CONFLICT (name) DO NOTHING;
