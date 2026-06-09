---
id: site-settings
title: Site Settings
sidebar_label: Site Settings
---

# Site Settings

Global system configuration including branding and email domain restrictions.

## Get Settings

```http
GET /api/v1/site-settings
```

## Update Settings

```http
PATCH /api/v1/site-settings
Content-Type: application/json

{
  "siteName": "TSTS Portal",
  "primaryColor": "#0b2f63"
}
```

## Update Site Logo

```http
PATCH /api/v1/site-settings/logo
Content-Type: multipart/form-data

File: logo
```

## Allowed Email Domains

Control which email domains can register.

### List Domains
```http
GET /api/v1/site-settings/email-domains
```

### Add Domain
```http
POST /api/v1/site-settings/email-domains
Content-Type: application/json

{ "domain": "university.edu" }
```

### Update Domain
```http
PUT /api/v1/site-settings/email-domains/:id
Content-Type: application/json
```

### Remove Domain
```http
DELETE /api/v1/site-settings/email-domains/:id
```
