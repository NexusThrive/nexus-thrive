-- ============================================================================
-- DIAGNÓSTICO · documentos comerciales fechados en UTC (solo lectura)
--
-- Contexto: docs/internal/historico/v10-y-etapas/hallazgo-fechas-utc-en-asientos.md
--   Antes de la corrección, el asiento contable y la cola fiscal de un documento se
--   fechaban con el día UTC del instante de emisión. Entre las 19:00 y las 24:00 de
--   Bogotá (UTC−5) ese día es el siguiente al de Colombia.
--
-- ESTE ARCHIVO NO MODIFICA NADA.
--   · Solo contiene SELECT.
--   · Corre dentro de BEGIN READ ONLY ... ROLLBACK: aunque alguien le agregara una
--     escritura, la base la rechazaría.
--   · No va en docs/prod-sql/ a propósito: no es una migración ni se corre "antes de
--     desplegar".
--
-- NO se propone un UPDATE. El libro contable es encadenado (cada asiento guarda un hash
-- que incluye su fecha) y los documentos fiscales aceptados por el proveedor no se
-- pueden reescribir. El tratamiento de cada caso lo decide la contabilidad a partir de
-- la columna «tratamiento_sugerido»; no existe una corrección masiva.
--
-- Uso (contra una COPIA o con un rol de solo lectura; nunca se ejecutó en producción):
--   psql "$DATABASE_URL" -X -f docs/diagnostico/2026-10-31-fechas-utc-documentos.sql
--
-- Salida: 1) resumen por negocio, mes y estado; 2) detalle de cada caso;
--         3) documentos fiscales con fecha distinta a la de Bogotá.
-- ============================================================================
BEGIN READ ONLY;

\echo '== 1. RESUMEN por negocio, período y estado =='
WITH caso AS (
  SELECT
    t.slug                                                          AS negocio,
    i.status::text                                                  AS estado_documento,
    (i."issueDate" AT TIME ZONE 'UTC')::date                        AS dia_utc,
    (i."issueDate" AT TIME ZONE 'America/Bogota')::date             AS dia_bogota,
    je.date::date                                                   AS fecha_asiento,
    i.total                                                         AS total
  FROM "JournalEntry" je
  JOIN "Invoice" i ON i.id::text = je."sourceId" AND i."tenantId" = je."tenantId"
  JOIN "Tenant"  t ON t.id = je."tenantId"
  WHERE je."sourceType" = 'DOCUMENT'
    AND je.date::date <> (i."issueDate" AT TIME ZONE 'America/Bogota')::date
)
SELECT
  negocio,
  to_char(fecha_asiento, 'YYYY-MM')                                 AS periodo_almacenado,
  to_char(dia_bogota,    'YYYY-MM')                                 AS periodo_correcto,
  (to_char(fecha_asiento, 'YYYY-MM') <> to_char(dia_bogota, 'YYYY-MM')) AS cruza_periodo,
  estado_documento,
  CASE WHEN fecha_asiento = dia_utc AND dia_utc <> dia_bogota
       THEN 'AFECTADO_POR_DIA_UTC' ELSE 'REVISAR_OTRA_CAUSA' END    AS clasificacion,
  count(*)                                                          AS asientos,
  sum(total)                                                        AS valor_documentos
FROM caso
GROUP BY 1, 2, 3, 4, 5, 6
ORDER BY negocio, periodo_almacenado, estado_documento;

\echo '== 2. DETALLE de cada caso =='
WITH caso AS (
  SELECT
    t.slug                                                          AS negocio,
    je."tenantId"                                                   AS tenant_id,
    i.id                                                            AS documento_id,
    i.kind || '-' || lpad(i.number::text, 6, '0')                   AS documento,
    i.status::text                                                  AS estado_documento,
    i.total                                                         AS total,
    i."issueDate"                                                   AS emitido_en,
    (i."issueDate" AT TIME ZONE 'UTC')::date                        AS dia_origen_utc,
    (i."issueDate" AT TIME ZONE 'America/Bogota')::date             AS dia_origen_bogota,
    je.date::date                                                   AS fecha_asiento_almacenada,
    je.number                                                       AS asiento_numero,
    je.event                                                        AS evento,
    EXISTS (SELECT 1 FROM "JournalEntry" r WHERE r."tenantId" = je."tenantId" AND r."reversalOfId" = je.id) AS reversado,
    f.status                                                        AS fiscal_estado,
    f.payload ->> 'issueDate'                                       AS fiscal_fecha_almacenada
  FROM "JournalEntry" je
  JOIN "Invoice" i ON i.id::text = je."sourceId" AND i."tenantId" = je."tenantId"
  JOIN "Tenant"  t ON t.id = je."tenantId"
  LEFT JOIN "FiscalDocument" f ON f."invoiceId" = i.id AND f."tenantId" = je."tenantId"
  WHERE je."sourceType" = 'DOCUMENT'
    AND je.date::date <> (i."issueDate" AT TIME ZONE 'America/Bogota')::date
)
SELECT
  c.negocio, c.documento, c.documento_id, c.estado_documento, c.total,
  c.emitido_en, c.dia_origen_utc, c.dia_origen_bogota, c.fecha_asiento_almacenada,
  (c.fecha_asiento_almacenada - c.dia_origen_bogota)                AS desfase_dias,
  c.asiento_numero, c.evento, c.reversado,
  to_char(c.fecha_asiento_almacenada, 'YYYY-MM') || ' (' || coalesce(pa.status, 'sin período') || ')' AS periodo_almacenado,
  to_char(c.dia_origen_bogota, 'YYYY-MM')         || ' (' || coalesce(pc.status, 'sin período') || ')' AS periodo_correcto,
  CASE WHEN c.fecha_asiento_almacenada = c.dia_origen_utc AND c.dia_origen_utc <> c.dia_origen_bogota
       THEN 'AFECTADO_POR_DIA_UTC' ELSE 'REVISAR_OTRA_CAUSA' END     AS clasificacion,
  c.fiscal_estado, c.fiscal_fecha_almacenada,
  CASE
    WHEN c.fecha_asiento_almacenada <> c.dia_origen_utc OR c.dia_origen_utc = c.dia_origen_bogota
      THEN 'REVISAR: la fecha almacenada no coincide con el día UTC ni con el de Bogotá; la causa no es este defecto.'
    WHEN c.estado_documento = 'VOID'
      THEN 'Documento anulado: confirmar con contabilidad si el asiento y su reverso ya compensan la diferencia de fecha.'
    WHEN c.reversado
      THEN 'Asiento ya reversado: revisar el reverso (se fecha con el día de su propia emisión) antes de decidir.'
    WHEN to_char(c.fecha_asiento_almacenada, 'YYYY-MM') <> to_char(c.dia_origen_bogota, 'YYYY-MM')
         AND (coalesce(pa.status, 'OPEN') = 'CLOSED' OR coalesce(pc.status, 'OPEN') = 'CLOSED')
      THEN 'CRUZA PERÍODO y alguno está CERRADO: decide el contador (reabrir el período o registrar ajuste en el período abierto). No editar el asiento.'
    WHEN to_char(c.fecha_asiento_almacenada, 'YYYY-MM') <> to_char(c.dia_origen_bogota, 'YYYY-MM')
      THEN 'CRUZA PERÍODO, ambos abiertos: reverso del asiento + nuevo asiento con la fecha de Bogotá, por la contabilidad.'
    ELSE 'Mismo mes: solo desplaza el día. Reverso + nuevo asiento, o dejar constancia de la diferencia.'
  END
  || CASE WHEN c.fiscal_estado = 'ACCEPTED'
          THEN ' · DOCUMENTO FISCAL YA ACEPTADO con otra fecha: no se puede cambiar; documentar.' ELSE '' END
                                                                    AS tratamiento_sugerido
FROM caso c
LEFT JOIN "AccountingPeriod" pa ON pa."tenantId" = c.tenant_id AND pa.year = extract(year  FROM c.fecha_asiento_almacenada)::int AND pa.month = extract(month FROM c.fecha_asiento_almacenada)::int
LEFT JOIN "AccountingPeriod" pc ON pc."tenantId" = c.tenant_id AND pc.year = extract(year  FROM c.dia_origen_bogota)::int          AND pc.month = extract(month FROM c.dia_origen_bogota)::int
ORDER BY c.negocio, c.fecha_asiento_almacenada, c.asiento_numero;

\echo '== 3. DOCUMENTOS FISCALES con fecha distinta a la de Bogotá =='
SELECT
  t.slug                                                            AS negocio,
  f.status                                                          AS estado_fiscal,
  i.kind || '-' || lpad(i.number::text, 6, '0')                     AS documento,
  f.payload ->> 'issueDate'                                         AS fecha_en_documento_fiscal,
  (i."issueDate" AT TIME ZONE 'America/Bogota')::date               AS dia_origen_bogota,
  CASE f.status
    WHEN 'PENDING_PROVIDER' THEN 'Aún en cola: se puede corregir el payload ANTES de enviarlo.'
    WHEN 'REJECTED'         THEN 'Rechazado: al reintentar conviene corregir la fecha primero.'
    WHEN 'ACCEPTED'         THEN 'Aceptado por el proveedor con esa fecha: no se puede cambiar; documentar.'
    ELSE 'Revisar el estado.'
  END                                                               AS tratamiento_sugerido
FROM "FiscalDocument" f
JOIN "Invoice" i ON i.id = f."invoiceId" AND i."tenantId" = f."tenantId"
JOIN "Tenant"  t ON t.id = f."tenantId"
WHERE f."invoiceId" IS NOT NULL
  AND f.payload ->> 'issueDate' <> to_char((i."issueDate" AT TIME ZONE 'America/Bogota')::date, 'YYYY-MM-DD')
ORDER BY negocio, estado_fiscal, documento;

ROLLBACK;
