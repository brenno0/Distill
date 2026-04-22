-- Migration 003: biblioteca de pastas e itens

CREATE TABLE IF NOT EXISTS library_folders (
    id         TEXT        PRIMARY KEY,
    name       TEXT        NOT NULL,
    parent_id  TEXT        REFERENCES library_folders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_items (
    id               TEXT        PRIMARY KEY,
    transcription_id TEXT        NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
    folder_id        TEXT        NOT NULL REFERENCES library_folders(id),
    display_name     TEXT        NOT NULL,
    thumbnail_url    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_folders_parent_id ON library_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_library_items_folder_id ON library_items(folder_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_library_items_transcription_id ON library_items(transcription_id);
CREATE INDEX IF NOT EXISTS idx_library_items_created_at ON library_items(created_at DESC);

INSERT INTO library_folders (id, name, parent_id)
VALUES ('inbox', 'Inbox', NULL)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_library_folders_updated_at ON library_folders;
CREATE TRIGGER trg_library_folders_updated_at
    BEFORE UPDATE ON library_folders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_library_items_updated_at ON library_items;
CREATE TRIGGER trg_library_items_updated_at
    BEFORE UPDATE ON library_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
