-- Migration 002: configuração global da aplicação (singleton)

CREATE TABLE IF NOT EXISTS app_settings (
    id                   BOOLEAN     PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
    default_llm_provider TEXT        NOT NULL,
    default_llm_model    TEXT        NOT NULL,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (id, default_llm_provider, default_llm_model)
VALUES (TRUE, 'ollama', 'llama3.1:8b')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
