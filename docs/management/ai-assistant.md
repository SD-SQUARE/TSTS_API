---
id: ai-assistant
title: AI Assistant
sidebar_label: AI Assistant
---

# AI Assistant

Powered by **Ollama (Llama 3.2)**, the AI assistant provides conversational support and automated ticket creation.

## AI Chat

```http
POST /api/v1/ai-assistant/chat
Content-Type: application/json

{
  "message": "How do I reset my password?",
  "conversationId": "uuid"
}
```

Returns an AI-generated response based on the knowledge base and system context.

## Create Ticket from AI

```http
POST /api/v1/ai-assistant/create-ticket
Content-Type: application/json

{
  "description": "I cannot access my email",
  "userId": "uuid"
}
```

AI analyzes the description, suggests priority, category, and creates a ticket.

## Health Check

```http
GET /api/v1/ai-assistant/health
```

Returns the status of the Ollama connection and model availability.
