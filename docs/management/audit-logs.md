---
id: audit-logs
title: Audit Logs
sidebar_label: Audit Logs
---

# Audit Logs

Comprehensive audit trail for all system activities.

## List Audit Logs

```http
GET /api/v1/audit-logs?page=1&limit=20
Authorization: Bearer <token>
```

Filtered by entity type, action, date range, etc.

## Get Audit Log Entry

```http
GET /api/v1/audit-logs/:id
Authorization: Bearer <token>
```

Returns a single audit log entry with full metadata including:
- Actor (user who performed the action)
- Action type (CREATE, UPDATE, DELETE, LOGIN, etc.)
- Target entity and ID
- Timestamp
- Request metadata (IP, user-agent, etc.)
