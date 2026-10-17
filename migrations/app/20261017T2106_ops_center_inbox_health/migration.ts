#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4d479615e0086909de7d497934e19f33bcc4486ef01df3b954278498796f6fba/contract';
import endContract from '../../snapshots/4d479615e0086909de7d497934e19f33bcc4486ef01df3b954278498796f6fba/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/81e83fb69f41e879f55f151fbec685f0b43b52036cde68fc6523c63229ba41f5/contract';
import startContract from '../../snapshots/81e83fb69f41e879f55f151fbec685f0b43b52036cde68fc6523c63229ba41f5/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'InboxConversation',
        columns: [
          col('assigneeId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('channel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contactHandle', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contactName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
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
          col('subject', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ticketId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('unread', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'InboxConversation_channel_check_a1390589',
            "\"channel\" IN ('WHATSAPP', 'EMAIL')",
          ),
          checkExpression(
            'InboxConversation_status_check_403d7b80',
            "\"status\" IN ('OPEN', 'PENDING', 'CLOSED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'InboxMessage',
        columns: [
          col('authorName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('authorStaffId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('conversationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('delivery', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('direction', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('externalId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SatisfactionSurvey',
        columns: [
          col('answeredAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('assigneeId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('comment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nps', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('score', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('sentAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ticketId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'InboxConversation',
        constraint: 'InboxConversation_channel_contactHandle_key',
        columns: ['channel', 'contactHandle'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'InboxMessage',
        constraint: 'InboxMessage_externalId_key',
        columns: ['externalId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'SatisfactionSurvey',
        constraint: 'SatisfactionSurvey_ticketId_key',
        columns: ['ticketId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'SatisfactionSurvey',
        constraint: 'SatisfactionSurvey_token_key',
        columns: ['token'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'InboxConversation',
        index: 'InboxConversation_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'InboxConversation',
        index: 'InboxConversation_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'InboxMessage',
        index: 'InboxMessage_conversationId_idx_669215a6',
        columns: ['conversationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SatisfactionSurvey',
        index: 'SatisfactionSurvey_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'InboxMessage',
        foreignKey: {
          name: 'InboxMessage_conversationId_fkey',
          columns: ['conversationId'],
          references: { schema: 'public', table: 'InboxConversation', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
