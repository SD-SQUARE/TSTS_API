---
id: notifications
title: Notifications
sidebar_label: Notifications
---

# Notifications

Real-time notification system with read tracking, bulk operations, and broadcast support.

All endpoints require authentication.

## List Notifications

```http
GET /api/v1/notifications?page=1&limit=20
Authorization: Bearer <token>
```

## Get Unread Count

```http
GET /api/v1/notifications/unread-count
Authorization: Bearer <token>
```

## Get Notification

```http
GET /api/v1/notifications/:id
Authorization: Bearer <token>
```

## Mark as Read

```http
PATCH /api/v1/notifications/:id/read
Authorization: Bearer <token>
```

## Mark All as Read

```http
PATCH /api/v1/notifications/read-all
Authorization: Bearer <token>
```

## Broadcast (Admin)

```http
POST /api/v1/notifications/broadcast
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "System Maintenance",
  "message": "Planned downtime tonight at 2 AM.",
  "targetRoles": ["REQUESTER", "TECHNICIAN"]
}
```

## Delete All Notifications

```http
DELETE /api/v1/notifications
Authorization: Bearer <token>
```

### Notification Cleanup Scheduler

A background scheduler automatically cleans up old notifications. See \`startNotificationCleanupScheduler\` in the source.
