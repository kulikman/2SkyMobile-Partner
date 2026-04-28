-- Move Weekly Report documents into the "Reports" sub-folder
-- within the Wholesale Platform project under the Antwerp company

DO $$
DECLARE
  reports_folder_id uuid;
BEGIN
  SELECT f_sub.id INTO reports_folder_id
  FROM folders f_sub
  JOIN folders f_parent ON f_sub.parent_id = f_parent.id
  JOIN companies c ON f_parent.company_id = c.id
  WHERE c.slug = 'antwerp'
    AND lower(f_sub.name) = 'reports'
  LIMIT 1;

  IF reports_folder_id IS NOT NULL THEN
    UPDATE documents
    SET folder_id = reports_folder_id
    WHERE title IN (
      'Weekly Report — April 08–15, 2026',
      'Weekly Report — April 14–22, 2026'
    );
  ELSE
    RAISE NOTICE 'Reports folder not found — no documents were moved';
  END IF;
END $$;
