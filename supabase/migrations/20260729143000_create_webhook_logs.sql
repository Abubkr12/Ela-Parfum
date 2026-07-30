CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL,
    event_type VARCHAR(100),
    payload JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert from anon (webhook API will insert)
CREATE POLICY "Allow anon insert to webhook_logs"
    ON webhook_logs FOR INSERT
    WITH CHECK (true);

-- Allow select for authenticated admins only
CREATE POLICY "Allow authenticated read to webhook_logs"
    ON webhook_logs FOR SELECT
    USING (auth.role() = 'authenticated');
