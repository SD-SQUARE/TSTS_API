---
id: work-hours
title: Work Hours
sidebar_label: Work Hours
---

# Work Hours

Define working hours for scheduling and SLA calculations.

## List Work Hours

```http
GET /api/v1/work-hours
```

## Create Work Hours

```http
POST /api/v1/work-hours
Content-Type: application/json

{
  "dayOfWeek": "MONDAY",
  "startTime": "09:00",
  "endTime": "17:00",
  "timezone": "Africa/Cairo"
}
```

## Get Work Hours

```http
GET /api/v1/work-hours/:id
```

## Update Work Hours

```http
PUT /api/v1/work-hours/:id
Content-Type: application/json
```

## Delete Work Hours

```http
DELETE /api/v1/work-hours/:id
```
