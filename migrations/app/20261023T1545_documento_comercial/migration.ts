#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7380d3584abeb2a1be88350b70e14ccfbcb069d723497dfffa8ac51fb86e0279/contract';
import startContract from '../../snapshots/7380d3584abeb2a1be88350b70e14ccfbcb069d723497dfffa8ac51fb86e0279/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f2f656b7d59b51bb494e9ff10a2877f6d9edd97e616e457645f43f171ee40ea3/contract';
import endContract from '../../snapshots/f2f656b7d59b51bb494e9ff10a2877f6d9edd97e616e457645f43f171ee40ea3/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('discountTotal', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('originId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('originType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('paymentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('sourceDocumentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('subtotal', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('taxTotal', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'InvoiceLine',
        column: col('discountPct', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'InvoiceLine',
        column: col('taxRatePct', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_sourceDocumentId_idx_bd8eb82f',
        columns: ['sourceDocumentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_tenantId_issueDate_idx_33d250ce',
        columns: ['tenantId', 'issueDate'],
      }),
      // Documentos de antes: sin descuentos ni impuestos, su base es el total.
      rawSql({
        id: 'data.Invoice.subtotal.backfill',
        label: 'Backfill Invoice.subtotal from total for documents without discounts or taxes',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'subtotal = total where no discount or tax was recorded',
            sql: 'UPDATE "public"."Invoice" SET "subtotal" = "total" WHERE "subtotal" = 0 AND "discountTotal" = 0 AND "taxTotal" = 0 AND "total" <> 0',
          },
        ],
        postcheck: [
          {
            description: 'verify every document has subtotal - discount + tax = total',
            sql: 'SELECT NOT EXISTS (SELECT 1 FROM "public"."Invoice" WHERE "subtotal" - "discountTotal" + "taxTotal" <> "total") AS "result"',
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
