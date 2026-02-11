-- Function to safely increment product stock
-- Usage: SELECT increment_stock('product-uuid', 10);

CREATE OR REPLACE FUNCTION increment_stock(row_id UUID, amount NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock = stock + amount
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
