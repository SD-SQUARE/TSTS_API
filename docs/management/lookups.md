---
id: lookups
title: Lookups
sidebar_label: Lookups
---

# Lookups (Read-Only Reference Data)

Lookup endpoints provide lightweight reference data for dropdowns, filters, and autocomplete fields.

## Users

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/lockups/users` | All active users |
| `GET /api/v1/lockups/requesters` | All requesters |
| `GET /api/v1/lockups/technicians` | All technicians |
| `GET /api/v1/lockups/admins` | All admins |

## Academic Structure

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/lockups/universities` | All universities |
| `GET /api/v1/lockups/universities/:id/domains` | Domains for a university |
| `GET /api/v1/lockups/domains` | All domains |
| `GET /api/v1/lockups/domains/:id/departments` | Departments for a domain |
| `GET /api/v1/lockups/departments` | All departments |
| `GET /api/v1/lockups/specializations` | All specializations |

## Groups & Teams

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/lockups/groups` | All groups |
| `GET /api/v1/lockups/groups/:groupId/technicians` | Technicians in a group |
| `GET /api/v1/lockups/groups/:groupId/non-members-technicians` | Technicians NOT in a group |
| `GET /api/v1/lockups/teams` | All teams |

## Tickets

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/lockups/ticket/problems` | All problem types |
| `GET /api/v1/lockups/specializations/:id/problems` | Problems for specialization |
| `GET /api/v1/lockups/ticket/:id` | Tickets for a user |
| `GET /api/v1/lockups/ticket/:id/activities` | Activity types for a ticket |
| `GET /api/v1/lockups/ticket/:id/activity-users` | Users involved in ticket activities |

## Permissions & Audit

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/lockups/permissions` | All permissions |
| `GET /api/v1/lockups/permissions/system` | System-level permissions |
| `GET /api/v1/lockups/actions` | All audit action types |
