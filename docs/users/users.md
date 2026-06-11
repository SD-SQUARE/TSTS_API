---
id: users
title: Users
sidebar_label: Users
---

# Users

The system manages three user types: **Requesters**, **Technicians**, and **Admins** (including Super Admins).

## Requesters

### List Requesters
```http
GET /api/v1/users/requesters?page=1&limit=20
```

### Get Requester
```http
GET /api/v1/users/requesters/:id
```

### Create Requester
```http
POST /api/v1/users/requesters
Content-Type: multipart/form-data

Fields: firstName, midName, lastName, email, phone, ssn, universityId, domainId, departmentId, specializationId
File: image (optional)
```

### Edit Requester
```http
PUT /api/v1/users/requesters/:id
Content-Type: multipart/form-data
```

### Delete Requester
```http
DELETE /api/v1/users/requesters/:id
```

### Bulk Upload Requesters
```http
GET /api/v1/users/requesters/bulk-sample
POST /api/v1/users/requesters/bulk-sample
Content-Type: multipart/form-data

File: file[]
```

## Technicians

### List Technicians
```http
GET /api/v1/users/technicians?page=1&limit=20
```

### Get Technician
```http
GET /api/v1/users/technicians/:id
```

### Create Technician
```http
POST /api/v1/users/technicians
Content-Type: multipart/form-data
```

### Edit Technician
```http
PUT /api/v1/users/technicians/:id
Content-Type: multipart/form-data
```

### Delete Technician
```http
DELETE /api/v1/users/technicians/:id
```

## Admins

### List Admins
```http
GET /api/v1/users/admins?page=1&limit=20
```

### Get Admin
```http
GET /api/v1/users/admins/:id
```

### Create Admin
```http
POST /api/v1/users/admins
Content-Type: multipart/form-data
```

### Edit Admin
```http
PUT /api/v1/users/admins/:id
Content-Type: multipart/form-data
```

### Delete Admin
```http
DELETE /api/v1/users/admins/:id
```

## System Info

```http
GET /api/v1/users/system/info
```

Returns system-level information (version, environment, configuration summary).
