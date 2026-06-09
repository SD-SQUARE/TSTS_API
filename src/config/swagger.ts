import swaggerJsdoc from "swagger-jsdoc";

/**
 * Enhanced OpenAPI 3.0 specification for the TSTS (Ticketing & Support Tracking System) API.
 *
 * This file centralises:
 *   - All reusable schema definitions derived from the TypeORM entities
 *   - Reusable parameters (pagination, search)
 *   - Reusable responses (standard HTTP error envelopes)
 *   - Security scheme definitions (JWT Bearer, API Key)
 *
 * Individual routers carry @openapi JSDoc annotations that are merged into
 * this base definition by swagger-jsdoc at startup.
 */
export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "TSTS API",
      version: "1.0.0",
      description:
        "Ticketing & Support Tracking System — a university IT helpdesk platform providing ticket management, " +
        "user administration, SLA tracking, reporting, chat, knowledge base, custom forms, and AI-assisted support.",
      contact: { name: "TSTS Team", email: "support@tsts.local" },
    },
    servers: [
      { url: "http://localhost:3000", description: "Local" },
      { url: "https://staging.tsts.local", description: "Staging" },
      { url: "https://api.tsts.local", description: "Production" },
    ],
    components: {
      // ---- Reusable query parameters ----
      parameters: {
        PageParam: {
          in: "query",
          name: "page",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number for paginated responses",
        },
        LimitParam: {
          in: "query",
          name: "limit",
          schema: { type: "integer", minimum: 1, maximum: 200, default: 20 },
          description: "Number of items per page (max 200)",
        },
        SearchParam: {
          in: "query",
          name: "search",
          schema: { type: "string" },
          description: "Free-text search term",
        },
      },

      // ---- Security schemes ----
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token obtained from /api/v1/auth/login or /api/v2/auth/login",
        },
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API key generated from /api/v1/api-integrations/keys",
        },
      },

      // ---- Reusable response envelopes ----
      responses: {
        BadRequest: {
          description: "Bad Request",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { message: "Invalid request data", statusCode: 400 },
            },
          },
        },
        UnauthorizedError: {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { message: "Invalid or expired token", statusCode: 401 },
            },
          },
        },
        ForbiddenError: {
          description: "Forbidden",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { message: "You do not have permission to perform this action", statusCode: 403 },
            },
          },
        },
        NotFoundError: {
          description: "Not Found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { message: "Resource not found", statusCode: 404 },
            },
          },
        },
        ConflictError: {
          description: "Conflict",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { message: "Resource already exists", statusCode: 409 },
            },
          },
        },
        ValidationError: {
          description: "Validation Error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { message: "Validation failed", statusCode: 422 },
            },
          },
        },
        InternalError: {
          description: "Internal Server Error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { message: "An unexpected error occurred", statusCode: 500 },
            },
          },
        },
      },

      // ---- Entity schemas (derived from TypeORM entities) ----
      schemas: {
        // ---------- Shared / utility ----------
        Error: {
          type: "object",
          properties: {
            message: { type: "string", example: "An error occurred" },
            statusCode: { type: "integer", example: 500 },
          },
        },
        PagedMeta: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 100 },
            totalPages: { type: "integer", example: 5 },
          },
        },
        BilingualName: {
          type: "object",
          properties: {
            en: { type: "string", example: "English Name" },
            ar: { type: "string", example: "الاسم العربي" },
          },
        },
        ApiResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Operation completed successfully" },
          },
        },

        // ---------- University ----------
        University: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { $ref: "#/components/schemas/BilingualName" },
            code: { type: "string", example: "CU" },
            logo: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Domain ----------
        Domain: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { $ref: "#/components/schemas/BilingualName" },
            code: { type: "string", example: "ENG" },
            university: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Department ----------
        Department: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { $ref: "#/components/schemas/BilingualName" },
            code: { type: "string", example: "CS" },
            domain: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Specialization ----------
        Specialization: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { $ref: "#/components/schemas/BilingualName" },
            code: { type: "string", example: "NET" },
            description: { $ref: "#/components/schemas/BilingualName", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Problem ----------
        Problem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { $ref: "#/components/schemas/BilingualName" },
            description: { $ref: "#/components/schemas/BilingualName", nullable: true },
            reviewRequired: { type: "boolean", example: false },
            specialization: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- User ----------
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
            email: { type: "string", format: "email", example: "user@example.com" },
            password: { type: "string", format: "password", writeOnly: true, example: "••••••••" },
            image: { type: "string", nullable: true, example: "https://storage.tsts.local/avatars/550e.jpg" },
            firstName: { $ref: "#/components/schemas/BilingualName" },
            midName: { $ref: "#/components/schemas/BilingualName", nullable: true },
            lastName: { $ref: "#/components/schemas/BilingualName" },
            fullName: { $ref: "#/components/schemas/BilingualName", nullable: true },
            ssn: { type: "string", example: "30001010100000", description: "Egyptian national ID (14 digits)", nullable: true },
            user_type: { type: "string", enum: ["Requester", "Admin", "Technician", "SuperAdmin"], example: "Admin" },
            contacts: { type: "object", properties: { mobile: { type: "array", items: { type: "string" } }, phone: { type: "array", items: { type: "string" } } }, nullable: true },
            rustdeskId: { type: "string", nullable: true, example: "A1B2C3D4E5F6" },
            status: { type: "string", enum: ["Active", "Inactive"], example: "Active" },
            allowProfileEdit: { type: "boolean", example: false },
            job: { $ref: "#/components/schemas/BilingualName", nullable: true },
            university: { type: "string", format: "uuid", nullable: true },
            domain: { type: "string", format: "uuid", nullable: true },
            createdAt: { type: "string", format: "date-time", example: "2026-05-29T10:00:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2026-05-29T10:00:00.000Z" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
          },
        },

        // ---------- Ticket ----------
        Ticket: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            ticket_number: { type: "integer", example: 42, description: "Auto-incrementing ticket number" },
            title: { type: "string", example: "Cannot access email" },
            description: { type: "string", example: "I am unable to log into my university email account." },
            status: { type: "string", enum: ["draft", "open", "in_progress", "pending", "closed", "resolved", "re_open", "out_of_service"], example: "open" },
            priority: { type: "string", enum: ["important/urgent", "important", "urgent", "NA"], example: "important" },
            isOutOfService: { type: "boolean", example: false },
            closeCount: { type: "integer", example: 0 },
            requester: { type: "string", format: "uuid", nullable: true },
            assignee: { type: "string", format: "uuid", nullable: true },
            specialization: { type: "string", format: "uuid", nullable: true },
            problem: { type: "string", format: "uuid", nullable: true },
            department: { type: "string", format: "uuid", nullable: true },
            groups: { type: "array", items: { type: "string", format: "uuid" } },
            createdAt: { type: "string", format: "date-time" },
            modifiedAt: { type: "string", format: "date-time" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
          },
        },

        // ---------- Ticket Activity ----------
        TicketActivity: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            action: { type: "string", enum: ["out_of_service", "info", "error", "closed", "in_progress", "assignee", "resolved", "pending", "reopened", "view", "first_open", "deleted"], example: "in_progress" },
            detail: { type: "string", example: "Changed status from Open to InProgress" },
            metadata: { type: "object", additionalProperties: true, nullable: true },
            userId: { type: "string", format: "uuid" },
            ticketId: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Ticket Review ----------
        TicketReview: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            rating: { type: "integer", minimum: 1, maximum: 5, example: 4 },
            note: { type: "string", nullable: true, example: "Great service!" },
            ticketId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Ticket Chat ----------
        TicketChat: {
          type: "object",
          properties: {
            id: { type: "integer", example: 100 },
            message: { type: "string", example: "I will look into this right away." },
            sender: { type: "string", format: "uuid" },
            senderName: { type: "string", example: "John Doe" },
            hasAttachments: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Ticket Final Report ----------
        TicketFinalReport: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            ticketId: { type: "string", format: "uuid" },
            summary: { type: "string", example: "Issue resolved by resetting the user password." },
            solutionSteps: { type: "string", example: "1. Verified identity\n2. Reset password\n3. Confirmed access" },
            published: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Ticket Quick Message ----------
        TicketQuickMessage: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title_en: { type: "string", example: "Common Response" },
            content_en: { type: "string", example: "Thank you for contacting support." },
            title_ar: { type: "string", example: "رد شائع" },
            content_ar: { type: "string", example: "شكراً لتواصلكم مع الدعم الفني." },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Group ----------
        Group: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { $ref: "#/components/schemas/BilingualName" },
            descriptions: { $ref: "#/components/schemas/BilingualName", nullable: true },
            color: { type: "string", example: "#3b82f6" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Team ----------
        Team: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { $ref: "#/components/schemas/BilingualName" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- SLA Rule ----------
        SlaRule: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "High Priority Response" },
            priority: { type: "string", enum: ["Low", "Medium", "High", "Critical"], example: "High" },
            responseTimeMinutes: { type: "integer", example: 60 },
            resolutionTimeMinutes: { type: "integer", example: 240 },
            active: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Notification ----------
        Notification: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string", example: "New Ticket Assigned" },
            body: { type: "string", example: "Ticket #42 has been assigned to you." },
            type: { type: "string", enum: ["system", "ticket", "message", "other"], example: "ticket" },
            isRead: { type: "boolean", example: false },
            userId: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Knowledge Base ----------
        KnowledgeItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string", example: "How to reset your password" },
            content: { type: "string", example: "To reset your password, go to..." },
            category: { type: "string", example: "Account Management" },
            tags: { type: "array", items: { type: "string" }, example: ["password", "account"] },
            published: { type: "boolean", example: true },
            createdBy: { type: "string", format: "uuid", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Custom Form ----------
        CustomForm: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string", example: "IT Support Request Form" },
            description: { type: "string", nullable: true, example: "Use this form to submit IT support requests." },
            fields: { type: "array", items: { type: "object" } },
            shareToken: { type: "string", nullable: true, example: "abc123share456" },
            shareUrl: { type: "string", nullable: true, example: "http://localhost:3000/forms/abc123share456" },
            createdBy: { type: "string", format: "uuid", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Form Response ----------
        FormResponse: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            formId: { type: "string", format: "uuid" },
            responses: { type: "object", additionalProperties: true },
            submittedBy: { type: "string", format: "uuid", nullable: true },
            submittedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Permission Profile ----------
        PermissionProfile: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name_en: { type: "string", example: "Full Admin" },
            name_ar: { type: "string", example: "مدير كامل" },
            description_en: { type: "string", nullable: true },
            description_ar: { type: "string", nullable: true },
            permissions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key: { type: "string", example: "tickets.create" },
                  name_en: { type: "string", example: "Create Tickets" },
                  name_ar: { type: "string", example: "إنشاء تذاكر" },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Site Setting ----------
        SiteSetting: {
          type: "object",
          properties: {
            siteName: { type: "string", example: "TSTS Support Portal" },
            logoUrl: { type: "string", example: "https://storage.tsts.local/logo.png" },
            primaryColor: { type: "string", example: "#2563eb" },
            language: { type: "string", enum: ["en", "ar"], example: "en" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Audit Log ----------
        AuditLog: {
          type: "object",
          properties: {
            id: { type: "string" },
            summary: { type: "string", nullable: true },
            actor: {
              type: "object",
              properties: {
                id: { type: "string", nullable: true },
                type: { type: "string", nullable: true },
                ipAddress: { type: "string", nullable: true },
                userAgent: { type: "string", nullable: true },
                full_name: { type: "string", nullable: true },
              },
            },
            action: { type: "string", example: "CREATE_TICKET" },
            resource: {
              type: "object",
              properties: {
                type: { type: "string", example: "Ticket" },
                id: { type: "string", example: "42" },
              },
              nullable: true,
            },
            status: { type: "string", enum: ["SUCCESS", "FAILED"], example: "SUCCESS" },
            metadata: { type: "object", additionalProperties: true, nullable: true },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  time: { type: "string", format: "date-time" },
                  action: { type: "string" },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            finishedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- API Key ----------
        ApiKey: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string", example: "Frontend Integration" },
            description: { type: "string", nullable: true },
            keyPrefix: { type: "string", example: "tsts_abc123" },
            zones: { type: "array", items: { type: "string" }, example: ["tickets", "users"] },
            methods: { type: "array", items: { type: "string" }, example: ["GET", "POST"] },
            isActive: { type: "boolean", example: true },
            expiresAt: { type: "string", format: "date-time", nullable: true },
            lastUsedAt: { type: "string", format: "date-time", nullable: true },
            lastUsedIp: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Trusted Device ----------
        TrustedDevice: {
          type: "object",
          properties: {
            id: { type: "string" },
            deviceName: { type: "string", example: "Chrome on Windows" },
            user: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            lastUsedAt: { type: "string", format: "date-time", nullable: true },
          },
        },

        // ---------- Media ----------
        Media: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            fileName: { type: "string", example: "screenshot.png" },
            mimeType: { type: "string", example: "image/png" },
            size: { type: "integer", example: 102400 },
            url: { type: "string", example: "https://storage.tsts.local/media/abc.png" },
            uploader: { type: "string", format: "uuid", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Allowed Email Domain ----------
        AllowedEmailDomain: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            domain: { type: "string", example: "university.edu" },
            active: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Work Hour ----------
        WorkHour: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            startTime: { type: "string", pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$", example: "09:00" },
            endTime: { type: "string", pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$", example: "17:00" },
            day: { type: "string", enum: ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"], example: "MONDAY" },
            status: { type: "string", enum: ["Active", "Inactive"], example: "Active" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ---------- Report (generation request) ----------
        ReportRequest: {
          type: "object",
          properties: {
            reportId: { type: "string", enum: ["specialization-tickets-count", "domain-dept-spec-problem", "requester-domain", "ticket-status-timeline", "technician-performance", "sla-compliance", "priority-distribution", "department-workload"], example: "sla-compliance" },
            startDate: { type: "string", format: "date", nullable: true },
            endDate: { type: "string", format: "date", nullable: true },
            periodType: { type: "string", nullable: true },
            filters: { type: "array", items: { type: "object", properties: { column: { type: "string" }, value: { type: "string" } } }, nullable: true },
            download: { type: "string", nullable: true },
            type: { type: "string", enum: ["json", "pdf", "csv"], default: "json" },
            page: { type: "integer", minimum: 1, nullable: true },
            limit: { type: "integer", minimum: 1, maximum: 100, nullable: true },
          },
        },

        // ---------- Recycle Bin ----------
        RecycleBinEntity: {
          type: "object",
          properties: {
            entity: { type: "string", example: "Ticket" },
            displayName: { type: "string", example: "Tickets" },
            deletedCount: { type: "integer", example: 12 },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ["src/routes/*.router.ts", "src/routes/*.routes.ts"],
});
