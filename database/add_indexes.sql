-- Speed Optimization: Database Indexes

-- 1. Index for product codes (used for lookups and barcodes)
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);

-- 2. Index for product names (used for search)
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- 3. Indexes for categorization (used for filtering in grid)
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON public.products(unit_id);

-- 4. Index for user roles (used for permission checks)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
