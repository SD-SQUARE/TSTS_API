---
id: api-integrations
title: API Integrations
sidebar_label: API Integrations
---

API Integrations let administrators issue scoped keys for trusted external systems. A key can be limited by API zone and HTTP method, so an integration can be granted only the surface it actually needs.

## Create A Key

Open **Settings > API Integrations** and choose **Create API Key**.

Required fields:

- **Name**: a recognizable system or vendor name.
- **Zones**: the product areas the external system can call.
- **Methods**: the allowed HTTP methods.
- **Expires At**: optional, but recommended for vendor or temporary access.

The generated key is shown once. Store it in the external system immediately. TSTS stores only a SHA-256 hash of the key and cannot display the raw key later.

## Authentication

Send the key with `X-API-Key`:

```bash
curl https://your-tsts-host/api/v1/api-integrations/scope \
  -H "X-API-Key: tsts_live_xxxxxxxxxx_secret"
```

You may also use the `Authorization` header with the `ApiKey` scheme:

```bash
curl https://your-tsts-host/api/v1/tickets \
  -H "Authorization: ApiKey tsts_live_xxxxxxxxxx_secret"
```

## Scope Endpoint

External systems can discover the active scope of their key:

```http
GET /api/v1/api-integrations/scope
X-API-Key: tsts_live_xxxxxxxxxx_secret
```

Response:

```json
{
  "apiKey": {
    "id": "uuid",
    "name": "ERP Sync",
    "keyPrefix": "xxxxxxxxxx",
    "zones": ["tickets", "lookups"],
    "methods": ["GET", "POST"],
    "isActive": true
  },
  "zones": [
    {
      "key": "tickets",
      "label": "Tickets",
      "paths": ["/api/v1/tickets"]
    }
  ],
  "methods": ["GET", "POST"]
}
```

## Available Zones

- `tickets`: `/api/v1/tickets`
- `knowledge_base`: `/api/v1/knowledge-base`
- `custom_forms`: `/api/v1/custom-forms`
- `reports`: `/api/v1/reports`
- `lookups`: universities, domains, departments, specializations, problems, SLA rules, and lookup endpoints
- `notifications`: `/api/v1/notifications`

## Nginx

The frontend Nginx image proxies `/api/` to the backend, including `/api/v1/api-integrations/*`. It forwards `Authorization` and `X-API-Key` headers by default. Keep `CORS_ORIGINS` updated for external systems that call the API host directly instead of same-origin Nginx.

## Revocation

Revoking a key marks it inactive and soft-deletes the row. Existing external calls using that key immediately fail with `401` or `403`.
