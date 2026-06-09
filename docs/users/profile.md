---
id: user-profile
title: User Profile
sidebar_label: Profile
---

# User Profile

Authenticated users can view and manage their own profiles.

## My Profile

```http
GET /api/v1/users/profile/:id
Authorization: Bearer <token>
```

## View User Profile (admin)

```http
GET /api/v1/users/profile/:id/view
Authorization: Bearer <token>
```

## Update Profile Image

```http
PATCH /api/v1/users/profile/:id/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

File: image
```

## Reset User Password

```http
POST /api/v1/users/profile/:id/reset-password
Authorization: Bearer <token>
Content-Type: application/json

{ "newPassword": "secureNewPassword123" }
```

## My Groups

```http
GET /api/v1/users/profile/:id/view/groups
Authorization: Bearer <token>
```

## My Specializations

```http
GET /api/v1/users/profile/:id/view/specializations
Authorization: Bearer <token>
```

## User Groups (Admin)

```http
GET /api/v1/users/:id/groups?page=1&limit=20
Authorization: Bearer <token>
```

## User Specializations (Admin)

```http
GET /api/v1/users/:id/specializations?page=1&limit=20
Authorization: Bearer <token>
```

## User Permissions

```http
GET /api/v1/users/:id/permissions
Authorization: Bearer <token>
```

Returns the effective permission keys for any user.

## Toggle Profile Edit Access (Role)

```http
PATCH /api/v1/users/profile-edit-access/role/:role
Authorization: Bearer <token>
```

ADMIN/SUPER_ADMIN only. Toggles whether a user role can edit profiles.

## Toggle Profile Edit Access (User)

```http
PATCH /api/v1/users/profile-edit-access/:id
Authorization: Bearer <token>
```

ADMIN/SUPER_ADMIN only. Toggles whether a specific user can edit profiles.
