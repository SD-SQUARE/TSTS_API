import { ReqUserPayload } from "../types/ReqUserPayload.js";
import { UserData } from "../types/UserData.js";

export class TokenHelper {
  private constructor() {}

  private static join(parts: Array<string | undefined | null>): string {
    return parts
      .map((p) => (p ?? "").trim())
      .filter(Boolean)
      .join(" ");
  }

  static getUserFromReqUser(user: ReqUserPayload): UserData {
    if (!user?.id || !user?.email || !user?.role) {
      throw new Error("USER_INVALID_PAYLOAD");
    }

    const name = user.name;

    const fullNameEn = name
      ? this.join([name.first?.en, name.mid?.en, name.last?.en])
      : "";

    const fullNameAr = name
      ? this.join([name.first?.ar, name.mid?.ar, name.last?.ar])
      : "";

    return {
      id: String(user.id),
      email: String(user.email),
      type: String(user.role),
      permission_profile: (user.permission_profile ?? {}) as Record<
        string,
        unknown
      >,
      fullNameEn,
      fullNameAr,
    };
  }
}
