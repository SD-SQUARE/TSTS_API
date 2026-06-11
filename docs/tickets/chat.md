---
id: ticket-chat
title: Ticket Chat
sidebar_label: Ticket Chat
---

# Ticket Chat

Internal chat within a ticket context. Messages can have file attachments.

## Send Chat Message

```http
POST /api/v1/tickets/:id/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Issue investigated. Root cause identified."
}
```

## Get Chat Messages

```http
GET /api/v1/tickets/:id/chat
Authorization: Bearer <token>
```

Returns paginated chat messages for the ticket.

## Quick Messages

Pre-defined message templates for technicians.

### List Quick Messages
```http
GET /api/v1/tickets/quick-messages
Authorization: Bearer <token>
```

### Create Quick Message
```http
POST /api/v1/tickets/quick-messages
Authorization: Bearer <token>
Content-Type: application/json

{ "message": "Ticket escalated to Level 2." }
```

### Update Quick Message
```http
PUT /api/v1/tickets/quick-messages/:quickMessageId
Authorization: Bearer <token>
Content-Type: application/json

{ "message": "Updated message text" }
```

### Delete Quick Message
```http
DELETE /api/v1/tickets/quick-messages/:quickMessageId
Authoriation: Bearer <token>
```
