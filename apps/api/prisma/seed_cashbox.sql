-- Создаём дефолтную кассу для существующих компаний
INSERT INTO "Cashbox" ("id", "companyId", "name", "type", "currency", "isActive", "sortOrder", "createdAt")
SELECT 
  gen_random_uuid(),
  c.id,
  'Основная касса',
  'cash',
  'RUB',
  true,
  100,
  NOW()
FROM "Company" c
WHERE NOT EXISTS (
  SELECT 1 FROM "Cashbox" cb WHERE cb."companyId" = c.id
);
