---
id: ticket-final-report
title: Final Reports
sidebar_label: Final Reports
---

# Ticket Final Reports

Final reports document the resolution of a ticket. They can include media attachments and can be used as a source for AI-generated knowledge base articles.

All endpoints are restricted to ADMIN, SUPER_ADMIN, and TECHNICIAN roles.

## Get Final Report

```http
GET /api/v1/tickets/:id/final-report
Authorization: Bearer <token>
```

## Upsert Final Report

```http
PUT /api/v1/tickets/:id/final-report
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Detailed resolution notes...",
  "resolutionType": "fixed"
}
```

Creates or updates the final report for a ticket.

## Upload Report Media

```http
POST /api/v1/tickets/:id/final-report/media
Authorization: Bearer <token>
Content-Type: multipart/form-data

Files: files[]
```
