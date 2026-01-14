import { UserData } from "../types/UserData.js";

export const formatActor = (userData: UserData) => {
  try {
    const displayName =
      userData.fullNameEn || userData.fullNameAr || userData.email;
    return {
      actor: userData,
      actorText: `${userData.type}-${displayName}-${userData.id}`,
    };
  } catch {
    return { actor: null, actorText: "unknown" };
  }
};
