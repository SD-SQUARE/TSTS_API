---
id: problems
title: Problems
sidebar_label: Problems
---

# Problems

Problem types are linked to specializations and are used to categorize tickets.

## Create Problem

```http
POST /api/v1/problems
Content-Type: application/json

{
  "name": "Wi-Fi Not Connecting",
  "specializationId": "uuid",
  "description": "Cannot connect to campus WiFi"
}
```

## List Problems

```http
GET /api/v1/problems
```

## Get Problem

```http
GET /api/v1/problems/:id
```

## Update Problem

```http
PUT /api/v1/problems/:id
Content-Type: application/json
```

## Delete Problem

```http
DELETE /api/v1/problems/:id
```
