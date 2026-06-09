---
id: reports
title: Reports
sidebar_label: Reports
---

# Reports

Report generation and dashboard analytics. All endpoints require authentication.

## Dashboard Analytics

```http
GET /api/v1/reports/dashboard/analytics
Authorization: Bearer <token>
```

Returns high-level analytics suitable for dashboard display.

## Dashboard Statistics

```http
GET /api/v1/reports/dashboard
Authorization: Bearer <token>
```

Returns key metrics: ticket counts, resolution times, SLA compliance, etc.

## Available Reports

```http
GET /api/v1/reports
Authorization: Bearer <token>
```

Lists all available report definitions. Supports search via query parameters.

## Generate Report

```http
GET /api/v1/reports/:reportId
Authorization: Bearer <token>
```

Generates a specific report by ID. Reports are generated as PDF files using Puppeteer.
