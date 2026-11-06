import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SCHEMA_PARTS = [
  // Part 1: Basic tables
  `CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  INSERT INTO store_settings (key, value) VALUES
    ('store_name', 'Nama Toko'),
    ('store_tagline', 'Parfum Isi Ulang Premium'),
    ('store_logo', ''),
    ('store_address', 'Jl. Raya Condet No.1, Cililitan, Jakarta Timur (PVP7+MW)'),
    ('store_phone', '+62 813-8410-4147'),
    ('store_email', 'elaparfumid@gmail.com'),
    ('store_hours', 'Senin - Sabtu, 09:00 - 21:00 WIB'),
    ('store_instagram', ''),
    ('store_whatsapp', ''),
    ('store_description', 'Toko parfum isi ulang dengan AI assistant untuk menemukan aroma yang cocok.')
  ON CONFLICT (key) DO NOTHING;`,

  // Part 2: Scent families
  `CREATE TABLE IF NOT EXISTS scent_families (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    color TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  INSERT INTO scent_families (name, label, description, color, sort_order) VALUES
    ('fresh', 'Fresh & Clean', 'Aroma segar dan bersih', '#2dd4b4', 1),
    ('floral', 'Floral & Romantic', 'Aroma bunga yang romantis', '#e8899a', 2),
    ('woody', 'Woody & Earthy', 'Aroma kayu yang hangat', '#8b6914', 3),
    ('citrus', 'Citrus & Zesty', 'Aroma jeruk yang segar', '#f5c518', 4),
    ('sweet', 'Sweet & Gourmand', 'Aroma manis dan nyaman', '#d4a574', 5),
    ('aquatic', 'Aquatic & Ocean', 'Aroma laut yang menyegarkan', '#5ba4cf', 6),
    ('spicy', 'Spicy & Bold', 'Aroma rempah yang bold', '#c05668', 7),
    ('musky', 'Musky & Sensual', 'Aroma musk yang sensual', '#9b8ec4', 8)
  ON CONFLICT (name) DO NOTHING;`,

  // Part 3: Perfumes table
  `CREATE TABLE IF NOT EXISTS perfumes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    collection TEXT DEFAULT 'Signature',
    family_id INT REFERENCES scent_families(id) ON DELETE SET NULL,
    mood TEXT,
    description TEXT,
    full_description TEXT,
    notes JSONB DEFAULT '[]',
    strength TEXT DEFAULT 'Eau de Parfum',
    longevity TEXT DEFAULT '6-8 jam',
    usage_guide TEXT,
    image_url TEXT,
    images JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`,

  // Part 4: Perfume sizes
  `CREATE TABLE IF NOT EXISTS perfume_sizes (
    id SERIAL PRIMARY KEY,
    perfume_id INT NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
    size_ml INT NOT NULL,
    size_label TEXT NOT NULL,
    price BIGINT NOT NULL,
    stock INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(perfume_id, size_ml)
  );`,

  // Part 5: Other tables
  `CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY,
    full_name TEXT, phone TEXT, address TEXT,
    city TEXT, province TEXT, postal_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_code TEXT UNIQUE NOT NULL,
    customer_id UUID, customer_name TEXT, customer_phone TEXT, customer_address TEXT,
    subtotal BIGINT NOT NULL DEFAULT 0, discount BIGINT DEFAULT 0, total BIGINT NOT NULL DEFAULT 0,
    voucher_code TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','completed','cancelled')),
    payment_method TEXT, payment_proof TEXT, midtrans_id TEXT, midtrans_url TEXT, notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    perfume_id INT REFERENCES perfumes(id) ON DELETE SET NULL,
    size_id INT REFERENCES perfume_sizes(id) ON DELETE SET NULL,
    perfume_name TEXT NOT NULL, size_label TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1, price BIGINT NOT NULL, subtotal BIGINT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS custom_requests (
    id SERIAL PRIMARY KEY,
    customer_id UUID, customer_name TEXT,
    description TEXT NOT NULL, size_preference TEXT DEFAULT '30ml',
    reference_image TEXT,
    status TEXT DEFAULT 'baru' CHECK (status IN ('baru','diproses','butuh_review','selesai','dibatalkan')),
    payment_proof TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS vouchers (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'nominal')),
    value BIGINT NOT NULL, min_purchase BIGINT DEFAULT 0, max_discount BIGINT,
    quota INT DEFAULT 0, used_count INT DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT now(), valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL, email TEXT, phone TEXT, subject TEXT, message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now()
  );`,

  // Part 6: FAQ + remaining tables
  `CREATE TABLE IF NOT EXISTS faq (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL, answer TEXT NOT NULL,
    sort_order INT DEFAULT 0, is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  INSERT INTO faq (question, answer, sort_order) VALUES
    ('Apa itu parfum isi ulang?', 'Parfum isi ulang adalah parfum yang bisa dibeli dalam kemasan refill dengan berbagai ukuran. Lebih hemat dan ramah lingkungan.', 1),
    ('Bagaimana cara request racikan custom?', 'Gunakan fitur Custom Request di halaman utama. Tulis brief aroma atau upload foto parfum referensi.', 2),
    ('Berapa lama daya tahan parfum isi ulang?', 'Daya tahan berkisar 4-12 jam, tergantung jenis racikan dan konsentrasi.', 3),
    ('Apakah bisa replika parfum merek terkenal?', 'Ya, kami bisa meracik parfum yang terinspirasi dari aroma merek terkenal.', 4),
    ('Metode pembayaran apa saja?', 'Transfer bank, e-wallet, kartu kredit/debit, dan Alfamart/Indomaret via Midtrans.', 5),
    ('Berapa lama pengiriman?', 'Dalam kota 1-2 hari kerja. Luar kota 2-5 hari kerja.', 6)
  ON CONFLICT DO NOTHING;
  CREATE TABLE IF NOT EXISTS homepage_sliders (
    id SERIAL PRIMARY KEY,
    title TEXT, description TEXT, image_url TEXT,
    button_text_1 TEXT, button_link_1 TEXT, button_text_2 TEXT, button_link_2 TEXT,
    overlay_opacity DECIMAL(3,2) DEFAULT 0.4, sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS ai_chat_logs (
    id SERIAL PRIMARY KEY,
    customer_id UUID, session_id TEXT, messages JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
  );`,

  // Part 7: Sample perfumes
  `INSERT INTO perfumes (name, slug, collection, family_id, mood, description, notes, strength, longevity, is_featured) VALUES
    ('Velvet Rose Musk', 'velvet-rose-musk', 'Signature Mix', 2, 'Romantis, bersih, feminin',
     'Perpaduan rose dan white musk yang elegan.',
     '["Rose", "White musk", "Lychee", "Soft amber"]', 'Medium', '6-8 jam', TRUE),
    ('Citrus Neroli Clean', 'citrus-neroli-clean', 'Fresh Daily', 4, 'Segar, rapi, ringan',
     'Kesegaran neroli dan bergamot untuk daily wear.',
     '["Bergamot", "Neroli", "Green tea", "Clean musk"]', 'Soft', '4-6 jam', TRUE),
    ('Noir Oud Reserve', 'noir-oud-reserve', 'Premium Blend', 3, 'Mewah, bold, dewasa',
     'Karakter oud yang dalam dan patchouli yang kaya.',
     '["Oud", "Saffron", "Patchouli", "Dark vanilla"]', 'Strong', '8-10 jam', TRUE),
    ('Ocean Linen Mist', 'ocean-linen-mist', 'Clean Fresh', 6, 'Sejuk, bersih, effortless',
     'Aroma linen segar dengan sentuhan laut.',
     '["Sea salt", "Linen", "Lavender", "Soft woods"]', 'Medium', '5-7 jam', TRUE),
    ('Vanilla Skin Glow', 'vanilla-skin-glow', 'Comfort Mix', 5, 'Manis, hangat, dekat di kulit',
     'Vanilla gourmand yang warm dan nyaman.',
     '["Vanilla", "Caramel", "Milk accord", "Skin musk"]', 'Medium', '6-8 jam', FALSE),
    ('Spiced Amber Club', 'spiced-amber-club', 'Evening Mix', 7, 'Hangat, percaya diri, maskulin',
     'Rempah hangat untuk malam yang berkesan.',
     '["Cardamom", "Amber", "Tonka", "Cedar"]', 'Strong', '7-9 jam', FALSE)
  ON CONFLICT (slug) DO NOTHING;`,

  // Part 8: Perfume sizes data
  `INSERT INTO perfume_sizes (perfume_id, size_ml, size_label, price, stock)
  SELECT p.id, s.size_ml, s.size_label, s.price, s.stock
  FROM perfumes p
  CROSS JOIN (VALUES
    (10, '10ml', 15000, 50),
    (30, '30ml', 35000, 30),
    (50, '50ml', 52000, 20),
    (100, '100ml', 98000, 10)
  ) AS s(size_ml, size_label, price, stock)
  WHERE NOT EXISTS (
    SELECT 1 FROM perfume_sizes ps WHERE ps.perfume_id = p.id AND ps.size_ml = s.size_ml
  );`,

  // Part 9: RLS policies
  `ALTER TABLE perfumes ENABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read perfumes') THEN
      CREATE POLICY "Public read perfumes" ON perfumes FOR SELECT USING (TRUE);
    END IF;
  END $$;
  ALTER TABLE perfume_sizes ENABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read perfume_sizes') THEN
      CREATE POLICY "Public read perfume_sizes" ON perfume_sizes FOR SELECT USING (TRUE);
    END IF;
  END $$;
  ALTER TABLE scent_families ENABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read scent_families') THEN
      CREATE POLICY "Public read scent_families" ON scent_families FOR SELECT USING (TRUE);
    END IF;
  END $$;
  ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read store_settings') THEN
      CREATE POLICY "Public read store_settings" ON store_settings FOR SELECT USING (TRUE);
    END IF;
  END $$;
  ALTER TABLE faq ENABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read faq') THEN
      CREATE POLICY "Public read faq" ON faq FOR SELECT USING (is_active = TRUE);
    END IF;
  END $$;
  ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can send message') THEN
      CREATE POLICY "Anyone can send message" ON contact_messages FOR INSERT WITH CHECK (TRUE);
    END IF;
  END $$;
  ALTER TABLE custom_requests ENABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone insert requests') THEN
      CREATE POLICY "Anyone insert requests" ON custom_requests FOR INSERT WITH CHECK (TRUE);
    END IF;
  END $$;`,
];

export async function POST(request: Request) {
  try {
    const { secret } = await request.json();

    // Simple auth check
    if (secret !== "deploy-minyakwangi-2024") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!serviceKey) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY not set in .env.local" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      db: { schema: "public" },
    });

    const results: { part: number; status: string; error?: string }[] = [];

    for (let i = 0; i < SCHEMA_PARTS.length; i++) {
      const { error } = await supabase.rpc("exec_sql", {
        query: SCHEMA_PARTS[i],
      });

      if (error) {
        // Try direct approach via REST
        results.push({
          part: i + 1,
          status: "error",
          error: error.message,
        });
      } else {
        results.push({ part: i + 1, status: "ok" });
      }
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
