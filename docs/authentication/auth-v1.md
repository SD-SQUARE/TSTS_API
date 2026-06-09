---
id: auth-v1
title: Authentication v1
sidebar_label: Auth v1
---

# Authentication (v1)

Legacy session-based authentication with cookie refresh tokens.

## Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@university.edu",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOi...",
  "email": "user@university.edu",
  "permissions": ["tickets.create", "tickets.read"]
}
```

Sets an HTTP-only `refresh_token` cookie valid for 7 days.

## Logout

```http
POST /api/v1/auth/logout
```

Clears the refresh token on the server and removes the client cookie.

## Refresh Token

```http
GET /api/v1/auth/refresh-token/:userId
```

Issues a new refresh token cookie for the given user.

## CSRF Token

```http
GET /api/v1/auth/csrf-token
```

Returns a CSRF token for form submissions. CSRF middleware is enabled only in production.
