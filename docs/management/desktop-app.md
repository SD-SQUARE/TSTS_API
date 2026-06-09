---
id: desktop-app
title: Desktop App
sidebar_label: Desktop App
---

# Desktop App (Electron)

Endpoints supporting the TSTS Electron desktop application for requesters.

## Download Installer

```http
GET /api/v1/desktop/download
```

Serves the TSTS Desktop installer (.exe) as a download.

## App Info

```http
GET /api/v1/desktop/info
```

Returns metadata about the latest desktop build:
```json
{
  "available": true,
  "filename": "TSTS-Desktop-Setup.exe",
  "platform": "Windows 10/11 (64-bit)",
  "size": "85.3 MB",
  "features": [
    "Remote control via RustDesk",
    "Native desktop experience",
    "Automatic RustDesk installation"
  ]
}
```

## Register Device

```http
POST /api/v1/desktop/register-device
Content-Type: application/json

{
  "email": "requester@university.edu",
  "rustdeskId": "123456789"
}
```

Registers a RustDesk ID to a requester account for remote support.
Only REQUESTER accounts can register devices.
