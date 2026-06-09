---
id: chat
title: System Chat
sidebar_label: Chat
---

# System Chat

Real-time messaging system with personal, group, and team conversations. All endpoints require authentication and are restricted to ADMIN, TECHNICIAN, and SUPER_ADMIN roles.

## Personal Chat

### Send Message
```http
POST /api/v1/chat/personal/:userId/messages
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields: message
Files: attachments[] (optional)
```

### Get Messages
```http
GET /api/v1/chat/personal/:userId/messages
Authorization: Bearer <token>
```

### List Conversations
```http
GET /api/v1/chat/personal/conversations
Authorization: Bearer <token>
```

### Unread Count
```http
GET /api/v1/chat/personal/unread-count
Authorization: Bearer <token>
```

## Group Chat

### Send Message
```http
POST /api/v1/chat/group/:groupId/messages
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Get Messages
```http
GET /api/v1/chat/group/:groupId/messages
Authorization: Bearer <token>
```

### List Group Conversations
```http
GET /api/v1/chat/group/conversations
Authorization: Bearer <token>
```

## Team Chat

### Send Message
```http
POST /api/v1/chat/team/:teamId/messages
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Get Messages
```http
GET /api/v1/chat/team/:teamId/messages
Authorization: Bearer <token>
```

### List Team Conversations
```http
GET /api/v1/chat/team/conversations
Authorization: Bearer <token>
```

## Combined Inbox

```http
GET /api/v1/chat/conversations
Authorization: Bearer <token>
```

Returns a unified inbox of all personal, group, and team conversations.
