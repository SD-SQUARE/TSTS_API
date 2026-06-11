---
id: database-migrations
title: Database Migrations
sidebar_label: Database Migrations
---

## Postgres

- `synchronize` is now disabled by default. Use migrations for production schema changes.
- Create an empty migration: `npm run migration:create -- add-users-table`
- Generate a diff migration from entities: `npm run migration:generate -- add-users-table`
- Show migration status: `npm run migration:show`
- Run migrations locally: `npm run migration:run`
- Run migrations in production: `npm run migration:run:prod`
- Revert the latest migration: `npm run migration:revert`

Optional startup flag:

- Set `DB_RUN_MIGRATIONS=true` if you want the app process itself to run pending Postgres migrations on boot.

## Mongo

- TypeORM does not provide the same migration workflow for MongoDB, so this project now uses an explicit custom migration runner.
- Show Mongo migration status: `npm run mongo:migration:show`
- Run Mongo migrations locally: `npm run mongo:migration:run`
- Run Mongo migrations in production: `npm run mongo:migration:run:prod`

Optional startup flag:

- Set `MONGO_RUN_MIGRATIONS=true` if you want the app process itself to run pending Mongo migrations on boot.

## Production notes

- Keep `DB_SYNC=false` and `MONGO_SYNC=false` in production.
- Run `npm run migration:run:prod` before seeding relational data.
- Run `npm run mongo:migration:run:prod` before Mongo seeders that depend on indexes.
- Ansible task snippets are available in `deploy/ansible/tasks/postgres-schema.yml` and `deploy/ansible/tasks/mongo-schema.yml`.
