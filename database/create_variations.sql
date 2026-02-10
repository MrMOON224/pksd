-- =============================================
-- Product Variations Schema
-- =============================================

-- Create variation_types table (e.g., "Pcs", "Size", "Color")
CREATE TABLE IF NOT EXISTS public.variation_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create variation_options table (e.g., "01", "02", "03" for Pcs)
CREATE TABLE IF NOT EXISTS public.variation_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variation_type_id UUID NOT NULL REFERENCES public.variation_types(id) ON DELETE CASCADE,
    option_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(variation_type_id, option_value)
);

-- Create product_variations junction table (links products to their variations)
CREATE TABLE IF NOT EXISTS public.product_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variation_option_id UUID NOT NULL REFERENCES public.variation_options(id) ON DELETE CASCADE,
    sku TEXT,
    price_adjustment NUMERIC DEFAULT 0,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, variation_option_id)
);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS
ALTER TABLE public.variation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variation_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

-- Variation Types: Allow all authenticated users to read
CREATE POLICY "Allow read access to all authenticated users"
    ON public.variation_types FOR SELECT
    TO authenticated
    USING (true);

-- Variation Types: Only admins can manage
CREATE POLICY "Only admins can manage variation types"
    ON public.variation_types FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Variation Options: Allow all authenticated users to read
CREATE POLICY "Allow read access to all authenticated users"
    ON public.variation_options FOR SELECT
    TO authenticated
    USING (true);

-- Variation Options: Only admins can manage
CREATE POLICY "Only admins can manage variation options"
    ON public.variation_options FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Product Variations: Allow all authenticated users to read
CREATE POLICY "Allow read access to all authenticated users"
    ON public.product_variations FOR SELECT
    TO authenticated
    USING (true);

-- Product Variations: Only admins can manage
CREATE POLICY "Only admins can manage product variations"
    ON public.product_variations FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- =============================================
-- Sample Data
-- =============================================

-- Insert sample variation types
INSERT INTO public.variation_types (name, description) VALUES
    ('Pcs', 'Piece variations (01, 02, 03, etc.)'),
    ('Size', 'Size variations (S, M, L, XL)'),
    ('Color', 'Color variations')
ON CONFLICT (name) DO NOTHING;

-- Insert sample variation options for Pcs
INSERT INTO public.variation_options (variation_type_id, option_value)
SELECT 
    vt.id,
    opt.value
FROM public.variation_types vt
CROSS JOIN (VALUES
    ('Pcs', '01'),
    ('Pcs', '02'),
    ('Pcs', '03'),
    ('Pcs', '04'),
    ('Pcs', '05'),
    ('Pcs', '06'),
    ('Size', 'S'),
    ('Size', 'M'),
    ('Size', 'L'),
    ('Size', 'XL'),
    ('Size', 'XXL'),
    ('Color', 'Red'),
    ('Color', 'Blue'),
    ('Color', 'Green'),
    ('Color', 'Black'),
    ('Color', 'White')
) AS opt(type_name, value)
WHERE vt.name = opt.type_name
ON CONFLICT (variation_type_id, option_value) DO NOTHING;
