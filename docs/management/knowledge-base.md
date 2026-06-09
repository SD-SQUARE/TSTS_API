---
id: knowledge-base
title: Knowledge Base
sidebar_label: Knowledge Base
---

# Knowledge Base

Self-service articles that can be generated from final reports using AI.

## List Knowledge Base Items

```http
GET /api/v1/knowledge-base
Authorization: Bearer <token>
```

## Get Categories

```http
GET /api/v1/knowledge-base/categories
Authorization: Bearer <token>
```

## Get Single Item

```http
GET /api/v1/knowledge-base/:id
Authorization: Bearer <token>
```

## Create Item

```http
POST /api/v1/knowledge-base
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "How to reset password",
  "content": "Step-by-step guide...",
  "categoryId": "uuid"
}
```

Restricted to ADMIN, SUPER_ADMIN, and TECHNICIAN roles.

## Update Item

```http
PUT /api/v1/knowledge-base/:id
Authorization: Bearer <token>
Content-Type: application/json
```

Restricted to ADMIN, SUPER_ADMIN, and TECHNICIAN roles.

## Delete Item

```http
DELETE /api/v1/knowledge-base/:id
Authorization: Bearer <token>
```

Restricted to ADMIN, SUPER_ADMIN, and TECHNICIAN roles.

---

## AI-Powered Report Generator

The knowledge base integrates with final reports to generate draft knowledge articles using Ollama AI.

### List Final Reports

```http
GET /api/v1/knowledge-base/generator/reports
Authorization: Bearer <token>
```

### Get Final Report

```http
GET /api/v1/knowledge-base/generator/reports/:reportId
Authorization: Bearer <token>
```

### Update Final Report

```http
PUT /api/v1/knowledge-base/generator/reports/:reportId
Authorization: Bearer <token>
Content-Type: application/json
```

### Get Report History

```http
GET /api/v1/knowledge-base/generator/reports/:reportId/history
Authorization: Bearer <token>
```

### Generate AI Draft

```http
POST /api/v1/knowledge-base/generator/reports/:reportId/generate-ai
Authorization: Bearer <token>
```

Uses Ollama (Llama 3.2) to generate a knowledge base draft from the ticket final report.

### Publish Report to Knowledge Base

```http
POST /api/v1/knowledge-base/generator/reports/:reportId/publish
Authorization: Bearer <token>
```

Publishes the AI-generated draft as a knowledge base article.

All generator endpoints are restricted to ADMIN, SUPER_ADMIN, and TECHNICIAN roles.
