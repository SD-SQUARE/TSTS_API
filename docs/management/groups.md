---
id: groups
title: Groups
sidebar_label: Groups
---

# Groups

Organize technicians into functional support groups.

## Create Group

```http
POST /api/v1/groups
Content-Type: application/json

{
  "name": "Network Support",
  "description": "Handles network-related tickets"
}
```

## List Groups

```http
GET /api/v1/groups
```

## Get Group

```http
GET /api/v1/groups/:id
```

## Edit Group

```http
PUT /api/v1/groups/:id
Content-Type: application/json
```

## Delete Group

```http
DELETE /api/v1/groups/:id
```

## Get Group Users

```http
GET /api/v1/groups/:id/users
```

## Assign Users to Group

```http
POST /api/v1/groups/:id/assign
Content-Type: application/json

{
  "userIds": ["uuid1", "uuid2"]
}
```

Upserts group assignments (replaces existing assignments with the provided list).
