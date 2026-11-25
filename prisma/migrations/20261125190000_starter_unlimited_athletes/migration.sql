-- The default plan no longer caps athlete records; other plan limits remain configured.
UPDATE "plans"
SET "maxAthletes" = NULL,
    "description" = CASE
      WHEN "name" = 'Starter' THEN 'Plano gratuito com limites de eventos e inscrições por evento; atletas sem limite.'
      ELSE "description"
    END
WHERE "isDefault" = TRUE;