---
id: ticket-media
title: Ticket Media
sidebar_label: Media
---

# Ticket Media

File attachments for tickets and final reports. Stored in MinIO (S3-compatible).

## Upload Ticket Assets

```http
POST /api/v1/tickets/:id/media
Authorization: Bearer <token>
Content-Type: multipart/form-data

Files: files[]
```

## List Ticket Assets

```http
GET /api/v1/tickets/:id/media
Authorization: Bearer <token>
```

## Get Single Asset

```http
GET /api/v1/tickets/:id/media/:aid
Authorization: Bearer <token>
```

## Delete Asset

```http
DELETE /api/v1/tickets/:id/media/:aid
Authorization: Bearer <token>
```

## Upload Chat Media

```http
POST /api/v1/tickets/:id/chat/media
Authorization: Bearer <token>
Content-Type: multipart/form-data

Files: files[]
```

Media attached to a ticket chat message.

## Upload Final Report Media

```http
POST /api/v1/tickets/:id/final-report/media
Authorization: Bearer <token>
Content-Type: multipart/form-data

Files: files[]
```

Restricted to ADMIN, SUPER_ADMIN, and TECHNICIAN roles.
