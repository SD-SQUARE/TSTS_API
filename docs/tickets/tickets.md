---
id: tickets
title: Tickets
sidebar_label: Tickets
---

# Tickets

The core entity of the system. Tickets support full lifecycle management, file attachments, chat-based communication, reviews, analytics, and final reports.

## Create Ticket

```http
POST /api/v1/tickets
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields: title, description, priority, category, etc.
Files: media[] (optional)
```

## List Tickets

```http
GET /api/v1/tickets?page=1&limit=20&status=open
Authorization: Bearer <token>
```

Validated query params: `page`, `limit`, `status`, `priority`, `sortBy`, `sortOrder`, etc.

## Get Single Ticket

```http
GET /api/v1/tickets/:id
Authorization: Bearer <token>
```

## Edit Ticket (Admin/Technician)

```http
PUT /api/v1/tickets/:id/co-ordinate
Authorization: Bearer <token>
Content-Type: application/json

{
  "assignedTechnicianId": "uuid",
  "assignedGroupId": "uuid",
  "status": "in_progress",
  "priority": "high",
  "slaRuleId": "uuid"
}
```

Restricted to ADMIN, SUPER_ADMIN, and TECHNICIAN roles.

## Edit Ticket (Requester)

```http
PUT /api/v1/tickets/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated title",
  "description": "Updated description"
}
```

Restricted to REQUESTER role.

## Change Ticket Status

```http
PATCH /api/v1/tickets/:id/change-status
Authorization: Bearer <token>
Content-Type: application/json

{ "status": "resolved" }
```

## Delete Ticket

```http
DELETE /api/v1/tickets/:id
Authorization: Bearer <token>
```

Restricted to ADMIN and SUPER_ADMIN.

## Ticket Activities

```http
GET /api/v1/tickets/:id/activities?page=1&limit=20
Authorization: Bearer <token>
```

Returns audit trail entries related to the ticket.

## Ticket Analytics

```http
GET /api/v1/tickets/analytics
Authorization: Bearer <token>
```

Returns aggregated ticket statistics (counts by status, priority, average resolution time, etc.).
