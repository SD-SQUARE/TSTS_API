export const redisKeys = {
  refreshToken: (userId: string) => `refresh_token:${userId}`,
  csrfToken: (userId: string) => `csrf_token:${userId}`,
  loginAttempts: (email: string) => `login_attempts:${email}`,
  lockUntil: (email: string) => `lock_until:${email}`,
  forgetPassword: (oid: string) => `forget_password:${oid}`,
  resetToken: (oid: string) => `reset_token:${oid}`,
  activeSlaRules: "sla:rules:active",
  ticketAnalyticsPrefix: "tickets:analytics",
  ticketAnalytics: (role: string, userId: string, lang: string) =>
    `tickets:analytics:${role}:${userId}:${lang}`,
};
