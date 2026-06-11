---
id: sla
title: SLA Rules
sidebar_label: SLA Rules
---

# SLA Rules

Service Level Agreement rules define response and resolution time targets.

## List SLA Rules

```http
GET /api/v1/sla-rules
```

## Get SLA Rule

```http
GET /api/v1/sla-rules/:id
```

## Create SLA Rule

```http
POST /api/v1/sla-rules
Content-Type: application/json

{
  "priority": "high",
  "responseTimeMinutes": 60,
  "resolutionTimeMinutes": 480,
  "name": "High Priority SLA"
}
```

## Update SLA Rule

```http
PUT /api/v1/sla-rules/:id
Content-Type: application/json
```

## Delete SLA Rule

```http
DELETE /api/v1/sla-rules/:id
```
