---
id: custom-forms
title: Custom Forms
sidebar_label: Custom Forms
---

# Custom Forms

Dynamic form builder with public submission support and response export.

## Public Endpoints (No Auth)

### Get Form by Token
```http
GET /api/v1/custom-forms/public/:token
```

### Submit Form
```http
POST /api/v1/custom-forms/public/:token/submit
Content-Type: application/json

{ "field1": "value1", "field2": "value2" }
```

## Authenticated Endpoints

### Create Form
```http
POST /api/v1/custom-forms
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "IT Support Request",
  "fields": [
    { "label": "Issue Type", "type": "select", "required": true },
    { "label": "Description", "type": "textarea", "required": true }
  ]
}
```

### List Forms
```http
GET /api/v1/custom-forms?page=1&limit=20
Authorization: Bearer <token>
```

### Get Form
```http
GET /api/v1/custom-forms/:id
Authorization: Bearer <token>
```

### Update Form
```http
PUT /api/v1/custom-forms/:id
Authorization: Bearer <token>
Content-Type: application/json
```

### Delete Form
```http
DELETE /api/v1/custom-forms/:id
Authorization: Bearer <token>
```

### Submit to Form (Authenticated)
```http
POST /api/v1/custom-forms/:id/submit
Authorization: Bearer <token>
Content-Type: application/json
```

### Duplicate Form to Ticket
```http
POST /api/v1/custom-forms/:id/duplicate
Authorization: Bearer <token>
Content-Type: application/json

{ "ticketId": "uuid" }
```

### Create Share Link
```http
POST /api/v1/custom-forms/:id/share-link
Authorization: Bearer <token>
Content-Type: application/json

{ "expiresAt": "2026-12-31T23:59:59Z" }
```

### Get Responses
```http
GET /api/v1/custom-forms/:id/responses
Authorization: Bearer <token>
```

### Export Responses
```http
GET /api/v1/custom-forms/:id/responses/export
Authorization: Bearer <token>
```

Exports form responses as an Excel file.
