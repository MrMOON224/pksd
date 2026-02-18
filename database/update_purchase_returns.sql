-- Finalizing Purchase Returns Schema

-- 1. Add missing financial columns to purchase_returns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_returns' AND column_name='order_tax_percentage') THEN
        ALTER TABLE purchase_returns ADD COLUMN order_tax_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_returns' AND column_name='order_tax_amount') THEN
        ALTER TABLE purchase_returns ADD COLUMN order_tax_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_returns' AND column_name='discount_amount') THEN
        ALTER TABLE purchase_returns ADD COLUMN discount_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_returns' AND column_name='shipping_amount') THEN
        ALTER TABLE purchase_returns ADD COLUMN shipping_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_returns' AND column_name='paid_amount') THEN
        ALTER TABLE purchase_returns ADD COLUMN paid_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_returns' AND column_name='payment_type') THEN
        ALTER TABLE purchase_returns ADD COLUMN payment_type TEXT;
    END IF;
END $$;

-- 2. Create Purchase Return Items table
CREATE TABLE IF NOT EXISTS purchase_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID REFERENCES purchase_returns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(15,2) NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL,
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_return_items' AND policyname = 'Allow all for authenticated users on purchase_return_items') THEN
        CREATE POLICY "Allow all for authenticated users on purchase_return_items" 
        ON purchase_return_items FOR ALL TO authenticated 
        USING (true) WITH CHECK (true);
    END IF;
END $$;
