---
id: auth-v2
title: Authentication v2
sidebar_label: Auth v2
---

# Authentication (v2)

The v2 auth flow supports **WebAuthn trusted devices** and **Microsoft SSO** alongside traditional password login.

## Login

```http
POST /api/v2/auth/login
Content-Type: application/json

{
  "email": "user@university.edu",
  "password": "securePassword123"
}
```

**Response (no trusted devices):**
```json
{
  "step": "LOGGED_IN_NO_DEVICE",
  "access_token": "eyJhbGciOi...",
  "permissions": ["tickets.create"]
}
```

**Response (trusted device required):**
```json
{
  "step": "TRUSTED_DEVICE_REQUIRED",
  "userId": "uuid"
}
```

When trusted device verification is required, the client must complete the WebAuthn flow before tokens are issued.

## Microsoft SSO

```http
POST /api/v2/auth/microsoft
Content-Type: application/json

{
  "idToken": "microsoft-id-token"
}
```

Completes SSO login using a Microsoft identity token. Returns:
```json
{
  "step": "LOGGED_IN_SSO",
  "access_token": "eyJhbGciOi...",
  "permissions": ["tickets.create"]
}
```

## Get Auth Options (WebAuthn)

```http
POST /api/v2/auth/trusted-device/options
Content-Type: application/json

{
  "userId": "uuid"
}
```

Returns WebAuthn authentication options. The challenge is stored server-side in the session.

## Verify Auth (WebAuthn)

```http
POST /api/v2/auth/trusted-device/verify
Content-Type: application/json

{
  "credential": { "..." }
}
```

Verifies the WebAuthn credential against the stored challenge. On success, issues access and refresh tokens.

## Logout

```http
POST /api/v2/auth/logout
```

## Forget Password Flow

Three-step password reset:

**Step 1 - Request reset:**
```http
POST /api/v2/auth/forget-password
Content-Type: application/json

{ "email": "user@university.edu" }
```
Returns `{ "oid": "reset-operation-id" }`.

**Step 2 - Verify OTP:**
```http
POST /api/v2/auth/forget-password/verify-otp
Content-Type: application/json

{ "otp": "123456", "oid": "reset-operation-id" }
```
Returns `{ "reset_token": "temporary-reset-token" }`.

**Step 3 - Set new password:**
```http
POST /api/v2/auth/forget-password/reset-password
Content-Type: application/json

{ "reset_token": "temporary-reset-token", "password": "newPassword123" }
```
