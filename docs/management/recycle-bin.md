---
id: recycle-bin
title: Recycle Bin
sidebar_label: Recycle Bin
---

# Recycle Bin

Soft-deleted entities can be listed and restored.

## List Entity Types

```http
GET /api/v1/recycle-bin/entities
```

Returns the types of entities that have deleted records.

## List Deleted Records

```http
GET /api/v1/recycle-bin/:entity?page=1&limit=20
```

Returns deleted records of a specific entity type (e.g., `tickets`, `users`, `groups`).

## Restore Record

```http
POST /api/v1/recycle-bin/:entity/:id/restore
```

Restores a soft-deleted entity to active state.
