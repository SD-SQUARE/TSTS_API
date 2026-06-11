---
id: trusted-devices
title: Trusted Devices
sidebar_label: Trusted Devices
---

# Trusted Devices (WebAuthn)

WebAuthn-based trusted device registration and management for passwordless authentication.

All endpoints require authentication (`/api/v1/trusted-devices`).

## List My Devices

```http
GET /api/v1/trusted-devices
```

Returns the list of WebAuthn trusted devices for the authenticated user.

## Get Registration Options

```http
POST /api/v1/trusted-devices/options
```

Returns WebAuthn registration options (challenge, RP info, user info). The challenge is stored in the session.

## Register Device

```http
POST /api/v1/trusted-devices/verify
Content-Type: application/json

{
  "credential": { "..." }
}
```

Verifies and registers a new WebAuthn trusted device for the authenticated user.

## Remove Device

```http
DELETE /api/v1/trusted-devices/:id
```

Removes a trusted device (user-owned).

## Admin: List All Devices

```http
GET /api/v1/trusted-devices/admin-view
```

Lists all trusted devices across the system (admin/super-admin only).

## Admin: Remove Any Device

```http
DELETE /api/v1/trusted-devices/admin-view/:id
```

Force-removes any trusted device (admin/super-admin only).
