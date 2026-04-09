import session from "express-session";
import { redisClient } from "../database/redis.js";

const FALLBACK_PREFIX = "session:";
const fallbackSessions = new Map<
  string,
  { expiresAt: number; payload: string }
>();

function parseSessionPayload(payload: unknown) {
  if (typeof payload !== "string") {
    return null;
  }

  return JSON.parse(payload) as session.SessionData;
}

function getSessionTtlMs(sess?: session.SessionData) {
  const maxAge = sess?.cookie?.maxAge;
  if (typeof maxAge === "number" && maxAge > 0) {
    return maxAge;
  }

  return 5 * 60 * 1000;
}

function cleanupExpiredFallbackSession(sid: string) {
  const entry = fallbackSessions.get(sid);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    fallbackSessions.delete(sid);
    return null;
  }

  return entry;
}

class HybridSessionStore extends session.Store {
  override get(
    sid: string,
    callback: (err?: unknown, sessionData?: session.SessionData | null) => void
  ) {
    void (async () => {
      try {
        const redisKey = `${FALLBACK_PREFIX}${sid}`;

        if (redisClient.isOpen) {
          const data = await redisClient.get(redisKey);
          callback(null, parseSessionPayload(data));
          return;
        }

        const entry = cleanupExpiredFallbackSession(sid);
        callback(null, entry ? parseSessionPayload(entry.payload) : null);
      } catch (error) {
        callback(error);
      }
    })();
  }

  override set(
    sid: string,
    sess: session.SessionData,
    callback?: (err?: unknown) => void
  ) {
    void (async () => {
      try {
        const payload = JSON.stringify(sess);
        const ttlMs = getSessionTtlMs(sess);
        const redisKey = `${FALLBACK_PREFIX}${sid}`;

        if (redisClient.isOpen) {
          await redisClient.set(redisKey, payload, {
            PX: ttlMs,
          });
        } else {
          fallbackSessions.set(sid, {
            payload,
            expiresAt: Date.now() + ttlMs,
          });
        }

        callback?.();
      } catch (error) {
        callback?.(error);
      }
    })();
  }

  override destroy(sid: string, callback?: (err?: unknown) => void) {
    void (async () => {
      try {
        const redisKey = `${FALLBACK_PREFIX}${sid}`;

        fallbackSessions.delete(sid);

        if (redisClient.isOpen) {
          await redisClient.del(redisKey);
        }

        callback?.();
      } catch (error) {
        callback?.(error);
      }
    })();
  }

  override touch(
    sid: string,
    sess: session.SessionData,
    callback?: () => void
  ) {
    void (async () => {
      const ttlMs = getSessionTtlMs(sess);
      const redisKey = `${FALLBACK_PREFIX}${sid}`;

      try {
        if (redisClient.isOpen) {
          await redisClient.pExpire(redisKey, ttlMs);
        } else {
          const entry = cleanupExpiredFallbackSession(sid);
          if (entry) {
            fallbackSessions.set(sid, {
              ...entry,
              expiresAt: Date.now() + ttlMs,
            });
          }
        }
      } finally {
        callback?.();
      }
    })();
  }
}

const sessionStore = new HybridSessionStore();

export const webAuthnSessionMiddleware = session({
  name: "webauthn-session",
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.PROTOCOL === "https",
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
  },
});
