import { UserData } from "../types/UserData.js";

export const formatActor = (userData: UserData) => {
  try {
    return {
      actor: userData,
      actorText: `${userData.type} → ${userData.fullNameEn}/${userData.fullNameAr} → ${userData.id}`,
    };
  } catch {
    return { actor: null, actorText: "unknown" };
  }
};
