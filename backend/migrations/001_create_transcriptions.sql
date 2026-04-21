-- Migration 001: tabela principal de transcrições

CREATE TABLE IF NOT EXISTS transcriptions (
    id             TEXT        PRIMARY KEY,
    title          TEXT        NOT NULL,
    transcription_type TEXT    NOT NULL CHECK (transcription_type IN ('meeting', 'youtube')),
    status         TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    text           TEXT,
    summary        TEXT,
    audio_path     TEXT        NOT NULL DEFAULT '',
    metadata       JSONB       NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcriptions_status     ON transcriptions (status);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions (created_at DESC);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transcriptions_updated_at ON transcriptions;
CREATE TRIGGER trg_transcriptions_updated_at
    BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
