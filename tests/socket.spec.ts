// tests/socket.test.ts
import http from "http";
import io from "socket.io-client";

import { initSocket } from "../src/config/socket.js";
import {
  notificationMessage,
  notificationUser,
  ticket,
} from "../src/services/socket.service.js";

let server: http.Server;
let clientSocket: any;
let userId: string;


beforeAll((done) => {
  server = http.createServer();
  initSocket(server);

  server.listen(() => {
    const port = (server.address() as any).port;
    userId = "00d53802-93a0-4213-a729-10555798929e";

    clientSocket = io(`http://localhost:${port}`, {
      auth: {
        token: "Bearer " + "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjp7ImZpcnN0Ijp7ImFyIjoi2YXYs9iq2K7Yr9mFIiwiZW4iOiJSZXF1ZXN0ZXIifSwibWlkIjp7ImFyIjoi2YbYtTExMCIsImVuIjoibWlkMTEwIn0sImxhc3QiOnsiYXIiOiLYsdmC2YUgMTEwIiwiZW4iOiIjMTEwIn19LCJpZCI6IjAwZDUzODAyLTkzYTAtNDIxMy1hNzI5LTEwNTU1Nzk4OTI5ZSIsImVtYWlsIjoicmVxdWVzdGVyMTEwQGV4YW1wbGUuY29tIiwicm9sZSI6IlJlcXVlc3RlciIsInBlcm1pc3Npb25fcHJvZmlsZSI6e30sImlhdCI6MTc2NTM4NTY3MCwiZXhwIjoxNzY1NDcyMDcwfQ.tlwWypgbSiFNUA0h-_kESjS7GQ8eRDEqTBy1ut3QA0g",
      },
      transports: ["websocket"],
    });

    clientSocket.on("connect", () => {
      done();
    });
  });
});

afterAll((done) => {
  if (clientSocket && clientSocket.connected) {
    clientSocket.disconnect();
  }
  server.close(done);
});

describe("Socket.IO Connection & Events", () => {
  test("should connect (rooms handled server-side)", () => {
    // Just assert connected; room membership is part of server logic
    expect(clientSocket.connected).toBe(true);
  });

  test("notificationMessage should emit to broadcast room", (done) => {
    const message = "hello everyone";

    clientSocket.on("test_broadcast", (data: any) => {
      expect(data.message).toBe(message);
      done();
    });

    notificationMessage("test_broadcast", { message });
  });

   test("should emit notification to user room when no ticketId", (done) => {
      const eventName = "personal_message";
      const payload = { userId, message: "Hello User" };
  
      // Listen on the user room
      clientSocket.once(eventName, (data: any) => {
        expect(data.userId).toBe(userId);
        expect(data.message).toBe("Hello User");
        done();
      });
  
      // Join the user room first
      clientSocket.emit("join_user_room", { userId });
  
      setTimeout(() => {
        notificationUser(eventName, payload);
      }, 50);
    });
  
    test("should assign user to ticket room and emit event when ticketId exists", (done) => {
      const ticketId = "ticket456";
      const eventName = "ticket_assigned";
      const payload = { userId, ticketId, message: "You have a new ticket" };
  
      const ticketRoom = `ticket:${ticketId}`;
  
      // Listen for the event in the ticket room
      clientSocket.once(eventName, (data: any) => {
        expect(data.userId).toBe(userId);
        expect(data.ticketId).toBe(ticketId);
        expect(data.message).toBe("You have a new ticket");
        done();
      });
  
      // Join user room first (so server can move user into ticket room)
      clientSocket.emit("join_user_room", { userId });
  
      setTimeout(() => {
        notificationUser(eventName, payload);
      }, 50);
    });
  
    test("should do nothing if userId is missing", (done) => {
      const payload = { message: "No userId" };
      const eventName = "fail_event";
  
      let received = false;
  
      clientSocket.once(eventName, () => {
        received = true;
      });
  
      notificationUser(eventName, payload);
  
      setTimeout(() => {
        expect(received).toBe(false);
        done();
      }, 100);
    });
  

  
  
    test("should emit 'ticket_event' to ticket:123 room", (done) => {
    const ticketId = "123";
    const eventName = "ticket_event";
    const payload = { ticketId, message: "Hello Ticket" };

    // Safety timeout
    const timeout = setTimeout(() => {
      done(new Error("Test timed out waiting for ticket_event"));
    }, 2000);

    // 1. Listen FIRST
    clientSocket.once(eventName, (data: any) => {
      clearTimeout(timeout);
      expect(data.ticketId).toBe("123");
      expect(data.message).toBe("Hello Ticket");
      done();
    });

    // 2. Join room
    clientSocket.emit("join_ticket_room", { ticketId });

    // 3. Emit after delay
    setTimeout(() => {
      ticket(eventName, payload);
    }, 200);
  });

  test("should emit 'ticket_updated' to ticket:456 room", (done) => {
    const ticketId = "456";
    const eventName = "ticket_updated";
    const payload = { ticketId, status: "closed" };

    const timeout = setTimeout(() => {
      done(new Error("Test timed out waiting for ticket_updated"));
    }, 2000);

    clientSocket.once(eventName, (data: any) => {
      clearTimeout(timeout);
      expect(data.ticketId).toBe("456");
      expect(data.status).toBe("closed");
      done();
    });

    clientSocket.emit("join_ticket_room", { ticketId });
    setTimeout(() => {
      ticket(eventName, payload);
    }, 200);
  });

});
