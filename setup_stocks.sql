-- 2. Create Stock Tables

-- Product Stock
CREATE TABLE IF NOT EXISTS product_stocks (
    id SERIAL PRIMARY KEY,
    size_id INT NOT NULL REFERENCES perfume_sizes(id) ON DELETE CASCADE,
    store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(size_id, store_id)
);

-- Bottle Stock
CREATE TABLE IF NOT EXISTS bottle_stocks (
    id SERIAL PRIMARY KEY,
    bottle_id INT NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
    store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bottle_id, store_id)
);

-- Bibit Stock
CREATE TABLE IF NOT EXISTS bibit_stocks (
    id SERIAL PRIMARY KEY,
    bibit_id INT NOT NULL REFERENCES bibit(id) ON DELETE CASCADE,
    store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    stock_ml DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bibit_id, store_id)
);

-- 3. Migration Script (Populate data)
DO $
DECLARE
    main_store_id INT;
BEGIN
    -- We assume the first store is the main one where existing stocks will be migrated
    SELECT id INTO main_store_id FROM stores WHERE name = 'Condet' LIMIT 1;

    IF main_store_id IS NOT NULL THEN
        -- Migrate Product Stocks
        INSERT INTO product_stocks (size_id, store_id, stock)
        SELECT id, main_store_id, COALESCE(stock, 0)
        FROM perfume_sizes
        ON CONFLICT (size_id, store_id) DO UPDATE SET stock = EXCLUDED.stock;

        -- Migrate Bottle Stocks
        INSERT INTO bottle_stocks (bottle_id, store_id, stock)
        SELECT id, main_store_id, COALESCE(stock, 0)
        FROM bottles
        ON CONFLICT (bottle_id, store_id) DO UPDATE SET stock = EXCLUDED.stock;

        -- Migrate Bibit Stocks (User requested default 3)
        INSERT INTO bibit_stocks (bibit_id, store_id, stock_ml)
        SELECT id, main_store_id, 3
        FROM bibit
        ON CONFLICT (bibit_id, store_id) DO UPDATE SET stock_ml = EXCLUDED.stock_ml;
    END IF;
END $;
