---
id: ticket-reviews
title: Ticket Reviews
sidebar_label: Reviews
---

# Ticket Reviews

Requesters can review tickets after resolution.

## Create Review

```http
POST /api/v1/tickets/:id/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "comment": "Great support, resolved quickly!"
}
```

## Get Reviews

```http
GET /api/v1/tickets/:id/reviews
Authorization: Bearer <token>
```

Returns all reviews for a given ticket.
