#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2846fa93f5ee846dcf42dba8e60faefe63342403e0e16fc32b528daad89ae102/contract';
import startContract from '../../snapshots/2846fa93f5ee846dcf42dba8e60faefe63342403e0e16fc32b528daad89ae102/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/7ca85a657075cbc98dd866cda4f1c89583287f6f9b9844cc562ad2d1d0247e00/contract';
import endContract from '../../snapshots/7ca85a657075cbc98dd866cda4f1c89583287f6f9b9844cc562ad2d1d0247e00/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'BusinessConversation',
        columns: [
          col('channel', 'text', {
            notNull: true,
            default: lit('WHATSAPP'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('connectionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contactHandle', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contactName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastInboundAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('lastMessageAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unread', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'BusinessMessage',
        columns: [
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('conversationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('direction', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('externalId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('RECEIVED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BusinessConversation',
        constraint: 'BusinessConversation_tenantId_channel_contactHandle_key',
        columns: ['tenantId', 'channel', 'contactHandle'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BusinessMessage',
        constraint: 'BusinessMessage_tenantId_externalId_key',
        columns: ['tenantId', 'externalId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusinessConversation',
        index: 'BusinessConversation_tenantId_customerId_idx_302ad259',
        columns: ['tenantId', 'customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusinessConversation',
        index: 'BusinessConversation_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusinessConversation',
        index: 'BusinessConversation_tenantId_status_lastMessageAt_idx_bee5e13b',
        columns: ['tenantId', 'status', 'lastMessageAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusinessMessage',
        index: 'BusinessMessage_conversationId_idx_669215a6',
        columns: ['conversationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusinessMessage',
        index: 'BusinessMessage_tenantId_conversationId_createdAt_idx_3e214dca',
        columns: ['tenantId', 'conversationId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusinessMessage',
        index: 'BusinessMessage_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusinessConversation',
        foreignKey: {
          name: 'BusinessConversation_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusinessMessage',
        foreignKey: {
          name: 'BusinessMessage_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusinessMessage',
        foreignKey: {
          name: 'BusinessMessage_conversationId_fkey',
          columns: ['conversationId'],
          references: { schema: 'public', table: 'BusinessConversation', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'BusinessConversation' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'BusinessMessage' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
