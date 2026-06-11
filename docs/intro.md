---
id: intro
title: TSTS API Documentation
sidebar_label: Overview
---

The **TSTS API** is a RESTful service built with Express.js, TypeORM, and PostgreSQL that powers a comprehensive **Ticketing & Service Tracking System**. It manages tickets, users, groups, knowledge base, chat, notifications, reporting, and AI-assisted support.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js with TypeScript |
| Framework | Express.js 5.x |
| ORM | TypeORM (PostgreSQL + MongoDB) |
| Validation | Zod schemas |
| Auth | JWT + WebAuthn + Microsoft SSO |
| Real-time | Socket.IO |
| Storage | MinIO (S3-compatible) |
| Caching | Redis / ioredis |
| PDF | Puppeteer |
| AI | Ollama (Llama 3.2) |

## API Versions

| Version | Base Path | Description |
|---------|-----------|-------------|
| v2 Auth | `/api/v2/auth` | Latest auth with WebAuthn + SSO |
| v1 | `/api/v1` | Main API surface |
| AI | `/api/v1/ai-assistant` | AI-assisted ticket creation & chat |
| Desktop | `/api/v1/desktop` | Electron desktop app endpoints |

## Quick Start

```
# Start databases
npm run db:start

# Run migrations
npm run migration:run
npm run mongo:migration:run

# Seed local data
npm run seed:local

# Start dev server
npm run dev
```

The API is available at `http://localhost:3000` by default.

## Authentication

Most endpoints require a **Bearer token**:

```
Authorization: Bearer <access_token>
```

API integrations use the `X-API-Key` header:

```
X-API-Key: tsts_live_xxxxxxxxxx_secret
```

## Rate Limiting

**1000 requests per 15 minutes** per IP address.

## Error Format

Standard error:

```json
{"error": "Human-readable message"}
```

Validation errors:

```json
{"errors": [{"path": ["field"], "message": "Validation message"}]}
```

## i18n

The API supports internationalization. Responses can be localized by setting the appropriate language via i18next middleware.
