-- ============================================================================
-- NEXUS THRIVE · Control de acceso: registro de intentos fallidos
-- ============================================================================
-- Añade a la tabla de asistencia la posibilidad de guardar los escaneos que
-- NO corresponden a ningún socio (código o tarjeta desconocida, o alguien
-- probando códigos).
--
-- Antes, un escaneo sin resultado no dejaba rastro: nadie podía ver que
-- alguien estaba intentando clonar una tarjeta o adivinando códigos. Ahora
-- queda en "Asistencia" y se ve en el panel del gym.
--
-- Cambio aditivo y seguro:
--   - `customerId` pasa a admite NULL (para los intentos sin socio).
--   - `scanned` guarda lo que se escaneó (máx. 64 caracteres).
--
-- Ejecutar en el SQL Editor de Supabase ANTES de usar la versión nueva.
-- Idempotente: se puede correr más de una vez.
-- ============================================================================
BEGIN;

-- 1) Columna con lo escaneado (para los intentos sin socio).
ALTER TABLE "public"."Attendance"
  ADD COLUMN IF NOT EXISTS "scanned" text;

-- 2) El socio puede quedar vacío: un intento fallido no tiene socio.
ALTER TABLE "public"."Attendance"
  ALTER COLUMN "customerId" DROP NOT NULL;

-- ===================== Comprobación =====================
SELECT column_name, is_nullable, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'Attendance'
   AND column_name IN ('customerId', 'scanned')
 ORDER BY column_name;

COMMIT;
