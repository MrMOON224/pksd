-- =============================================
-- Products Table Security Policies
-- =============================================

-- 1. Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.products;
DROP POLICY IF EXISTS "Only admins can manage products" ON public.products;

-- 3. Policy: Allow all authenticated users to read products
CREATE POLICY "Allow read access to all authenticated users" 
    ON public.products FOR SELECT 
    TO authenticated 
    USING (true);

-- 4. Policy: Only admins can manage products (Insert/Update/Delete)
CREATE POLICY "Only admins can manage products" 
    ON public.products FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );
