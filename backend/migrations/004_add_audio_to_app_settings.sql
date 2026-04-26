-- Migration 004: add audio column to app_settings

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS audio JSONB;