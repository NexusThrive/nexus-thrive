#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7380d3584abeb2a1be88350b70e14ccfbcb069d723497dfffa8ac51fb86e0279/contract';
import endContract from '../../snapshots/7380d3584abeb2a1be88350b70e14ccfbcb069d723497dfffa8ac51fb86e0279/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/91ef0b6e6902ebad2385ea9ac22b3d4449ad6a7eae99594fd3c49c8231c83c0e/contract';
import startContract from '../../snapshots/91ef0b6e6902ebad2385ea9ac22b3d4449ad6a7eae99594fd3c49c8231c83c0e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'TenantModule',
        constraint: 'TenantModule_moduleName_check_e283a8b3',
      }),
      // ARCH-01: la suite de construcción deja de llamarse "quotes". Los
      // negocios que la usan (constructoras, carpinterías o con obras) pasan
      // a "construction"; "quotes" queda planeado para la cotización genérica.
      rawSql({
        id: 'data.TenantModule.quotesToConstruction',
        label: 'Move the construction suite from the quotes module to construction',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: "Negocios que pasan a la suite de construcción: constructoras, carpinterías y cualquier negocio que ya tenga obras (no pierde acceso a sus datos).",
            sql: "INSERT INTO \"public\".\"TenantModule\" (\"id\", \"tenantId\", \"moduleName\", \"active\", \"createdAt\", \"updatedAt\") SELECT gen_random_uuid()::text, tm.\"tenantId\", 'construction', tm.\"active\", now(), now() FROM \"public\".\"TenantModule\" tm JOIN \"public\".\"Tenant\" t ON t.\"id\" = tm.\"tenantId\" WHERE tm.\"moduleName\" = 'quotes' AND (t.\"vertical\" IN ('construction', 'carpentry') OR EXISTS (SELECT 1 FROM \"public\".\"Project\" p WHERE p.\"tenantId\" = tm.\"tenantId\")) ON CONFLICT (\"tenantId\", \"moduleName\") DO NOTHING",
          },
          {
            description: "paso 2 de la separación de construcción",
            sql: "UPDATE \"public\".\"TenantModule\" SET \"active\" = false, \"updatedAt\" = now() WHERE \"moduleName\" = 'quotes' AND \"active\"",
          },
          {
            description: "paso 3 de la separación de construcción",
            sql: "UPDATE \"public\".\"Tenant\" t SET \"contractedModules\" = array_replace(t.\"contractedModules\", 'quotes', 'construction') WHERE 'quotes' = ANY(t.\"contractedModules\") AND (t.\"vertical\" IN ('construction', 'carpentry') OR EXISTS (SELECT 1 FROM \"public\".\"Project\" p WHERE p.\"tenantId\" = t.\"id\"))",
          },
          {
            description: "paso 4 de la separación de construcción",
            sql: "UPDATE \"public\".\"Tenant\" SET \"contractedModules\" = array_remove(\"contractedModules\", 'quotes') WHERE 'quotes' = ANY(\"contractedModules\")",
          },
          {
            description: "Catálogo: la suite hereda precio, inclusión y orden de \"quotes\", y \"quotes\" queda planeado (la cotización genérica llega con el documento comercial).",
            sql: "INSERT INTO \"public\".\"ModuleSetting\" (\"module\", \"label\", \"description\", \"priceUsdCents\", \"status\", \"included\", \"order\", \"updatedAt\") SELECT 'construction', 'Obras y presupuestos', 'Obras, presupuestos y catálogo APU.', \"priceUsdCents\", 'READY', \"included\", \"order\", now() FROM \"public\".\"ModuleSetting\" WHERE \"module\" = 'quotes' ON CONFLICT (\"module\") DO NOTHING",
          },
          {
            description: "paso 6 de la separación de construcción",
            sql: "UPDATE \"public\".\"ModuleSetting\" SET \"status\" = 'PLANNED', \"label\" = 'Cotizaciones', \"description\" = 'Cotizaciones comerciales con tu catálogo (próximamente).', \"updatedAt\" = now() WHERE \"module\" = 'quotes'",
          },
          {
            description: "paso 7 de la separación de construcción",
            sql: "UPDATE \"public\".\"VerticalSetting\" SET \"modules\" = array_replace(\"modules\", 'quotes', 'construction'), \"recommended\" = array_replace(\"recommended\", 'quotes', 'construction'), \"updatedAt\" = now() WHERE \"vertical\" IN ('construction', 'carpentry')",
          },
          {
            description: "paso 8 de la separación de construcción",
            sql: "UPDATE \"public\".\"VerticalSetting\" SET \"modules\" = array_remove(\"modules\", 'quotes'), \"recommended\" = array_remove(\"recommended\", 'quotes'), \"updatedAt\" = now() WHERE \"vertical\" NOT IN ('construction', 'carpentry') AND ('quotes' = ANY(\"modules\") OR 'quotes' = ANY(\"recommended\"))",
          },
          {
            description: "paso 9 de la separación de construcción",
            sql: "UPDATE \"public\".\"BenefitCode\" SET \"modules\" = array_replace(\"modules\", 'quotes', 'construction') WHERE 'quotes' = ANY(\"modules\")",
          },
        ],
        postcheck: [
          {
            description: 'verify no tenant keeps the quotes module active',
            sql: 'SELECT NOT EXISTS (SELECT 1 FROM "public"."TenantModule" WHERE "moduleName" = \'quotes\' AND "active") AS "result"',
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
