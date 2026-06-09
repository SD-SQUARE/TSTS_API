const sidebars = {
  docs: [
    "intro",
    {
      type: "category",
      label: "Authentication",
      items: [
        "authentication/auth-v1",
        "authentication/auth-v2",
        "authentication/trusted-devices",
      ],
    },
    {
      type: "category",
      label: "Tickets",
      items: [
        "tickets/tickets",
        "tickets/ticket-media",
        "tickets/ticket-chat",
        "tickets/ticket-reviews",
        "tickets/ticket-final-report",
      ],
    },
    {
      type: "category",
      label: "Users",
      items: [
        "users/users",
        "users/user-profile",
      ],
    },
    {
      type: "category",
      label: "Chat",
      items: [
        "chat/chat",
        "chat/websockets",
      ],
    },
    {
      type: "category",
      label: "Reports",
      items: [
        "reports/reports",
      ],
    },
    {
      type: "category",
      label: "Management",
      items: [
        "management/lookups",
        "management/groups",
        "management/academic-structure",
        "management/problems",
        "management/knowledge-base",
        "management/sla",
        "management/work-hours",
        "management/permission-profiles",
        "management/custom-forms",
        "management/site-settings",
        "management/notifications",
        "management/recycle-bin",
        "management/audit-logs",
        "management/ai-assistant",
        "management/desktop-app",
      ],
    },
    {
      type: "category",
      label: "Operations",
      items: ["database-migrations"],
    },
    {
      type: "category",
      label: "Integrations",
      items: ["api-integrations"],
    },
  ],
};

export default sidebars;