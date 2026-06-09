---
id: websockets
title: WebSockets
sidebar_label: WebSockets
---

# WebSockets (Socket.IO)

Real-time communication via Socket.IO for notifications, chat, and live ticket updates.

## Connection

The Socket.IO server attaches to the HTTP/HTTPS server. Connect with the standard Socket.IO client, passing the JWT token in the auth handshake.

```js
import { io } from "socket.io-client";

const socket = io("https://tsts.example.com", {
  auth: { token: "Bearer <access_token>" }
});
```

## Events

### Room Assignment
On connection, users are automatically joined to:
- `user:{userId}` - personal notification room
- `broadcast` - system-wide broadcast room
- Ticket-specific rooms for tickets the user is associated with

### Notification Events
Listen on the user room for real-time notifications:
```js
socket.on("notification", (data) => {
  console.log("New notification:", data);
});
```

### Chat Events
Listen for incoming messages in personal, group, and team chat rooms.

## Authentication

Socket.IO connections are authenticated using JWT tokens passed during the handshake. The middleware extracts user data from the token and attaches it to `socket.data.user`.
