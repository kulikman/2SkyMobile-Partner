-- Stage 1: Add slug fields to companies and folders, metadata jsonb to documents

-- 1. Companies: add slug (unique)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE companies ADD CONSTRAINT companies_slug_unique UNIQUE (slug);

-- 2. Folders: add slug (unique per scope)
ALTER TABLE folders ADD COLUMN IF NOT EXISTS slug text;
-- unique within same parent scope
CREATE UNIQUE INDEX IF NOT EXISTS folders_slug_company_root_idx
  ON folders (company_id, slug) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS folders_slug_parent_idx
  ON folders (parent_id, slug) WHERE parent_id IS NOT NULL;

-- 3. Documents: add metadata jsonb
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- 4. Backfill slugs from names using a temporary function
CREATE OR REPLACE FUNCTION _tmp_slugify(input text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  result text;
BEGIN
  result := lower(input);
  -- Basic Cyrillic transliteration
  result := replace(result, 'а', 'a'); result := replace(result, 'б', 'b');
  result := replace(result, 'в', 'v'); result := replace(result, 'г', 'g');
  result := replace(result, 'д', 'd'); result := replace(result, 'е', 'e');
  result := replace(result, 'ё', 'yo'); result := replace(result, 'ж', 'zh');
  result := replace(result, 'з', 'z'); result := replace(result, 'и', 'i');
  result := replace(result, 'й', 'y'); result := replace(result, 'к', 'k');
  result := replace(result, 'л', 'l'); result := replace(result, 'м', 'm');
  result := replace(result, 'н', 'n'); result := replace(result, 'о', 'o');
  result := replace(result, 'п', 'p'); result := replace(result, 'р', 'r');
  result := replace(result, 'с', 's'); result := replace(result, 'т', 't');
  result := replace(result, 'у', 'u'); result := replace(result, 'ф', 'f');
  result := replace(result, 'х', 'kh'); result := replace(result, 'ц', 'ts');
  result := replace(result, 'ч', 'ch'); result := replace(result, 'ш', 'sh');
  result := replace(result, 'щ', 'shch'); result := replace(result, 'ъ', '');
  result := replace(result, 'ы', 'y'); result := replace(result, 'ь', '');
  result := replace(result, 'э', 'e'); result := replace(result, 'ю', 'yu');
  result := replace(result, 'я', 'ya');
  -- Replace non-alphanumeric with hyphen
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  -- Trim leading/trailing hyphens
  result := trim(both '-' from result);
  RETURN result;
END;
$$;

-- Backfill company slugs (unique: append 6-char uuid suffix on conflict)
DO $$
DECLARE
  rec RECORD;
  base_slug text;
  final_slug text;
BEGIN
  FOR rec IN SELECT id, name FROM companies WHERE slug IS NULL LOOP
    base_slug := _tmp_slugify(rec.name);
    final_slug := base_slug;
    IF EXISTS (SELECT 1 FROM companies WHERE slug = final_slug AND id <> rec.id) THEN
      final_slug := base_slug || '-' || left(replace(rec.id::text, '-', ''), 6);
    END IF;
    UPDATE companies SET slug = final_slug WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Backfill folder slugs
DO $$
DECLARE
  rec RECORD;
  base_slug text;
  final_slug text;
BEGIN
  FOR rec IN SELECT id, name, parent_id, company_id FROM folders WHERE slug IS NULL LOOP
    base_slug := _tmp_slugify(rec.name);
    final_slug := base_slug;
    IF rec.parent_id IS NULL THEN
      IF EXISTS (SELECT 1 FROM folders WHERE slug = final_slug AND company_id = rec.company_id AND parent_id IS NULL AND id <> rec.id) THEN
        final_slug := base_slug || '-' || left(replace(rec.id::text, '-', ''), 6);
      END IF;
    ELSE
      IF EXISTS (SELECT 1 FROM folders WHERE slug = final_slug AND parent_id = rec.parent_id AND id <> rec.id) THEN
        final_slug := base_slug || '-' || left(replace(rec.id::text, '-', ''), 6);
      END IF;
    END IF;
    UPDATE folders SET slug = final_slug WHERE id = rec.id;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS _tmp_slugify(text);
