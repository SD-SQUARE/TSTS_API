---
id: permission-profiles
title: Permission Profiles
sidebar_label: Permission Profiles
---

# Permission Profiles

Assign granular permission sets to users via profiles.

## List Profiles

```http
GET /api/v1/permissions/profile
```

## Get Profile

```http
GET /api/v1/permissions/profile/:id
```

## Create Profile

```http
POST /api/v1/permissions/profile
Content-Type: application/json

{
  "name": "Technician Basic",
  "permissions": ["tickets.read", "tickets.update", "chat.send"]
}
```

## Update Profile

```http
PUT /api/v1/permissions/profile/:id
Content-Type: application/json
```

## Delete Profile

```http
DELETE /api/v1/permissions/profile/:id
```
