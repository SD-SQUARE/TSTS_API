import { User } from "../../entities/User.js";
import { UserType } from "../../enums/UserType.enum.js";
import { UserStatus } from "../../enums/UserStatus.enum.js";
import { hashPassword } from "../../utils/secrets.js";
import { CreateTechnicianMapped } from "../../interfaces/technician/ICreateTechnician.js";

export const mapTechnicianToUserEntity = async (
  dto: CreateTechnicianMapped
): Promise<Partial<User>> => {
  const user = new User();

  user.email = dto.email;
  user.password = await hashPassword(dto.password);

  user.user_type = dto.userType as UserType;

  user.firstName = {
    en: dto.firstNameEn,
    ar: dto.firstNameAr,
  };

  user.midName = {
    en: dto.midNameEn,
    ar: dto.midNameAr,
  };

  user.lastName = {
    en: dto.lastNameEn,
    ar: dto.lastNameAr,
  };

  user.ssn = dto.ssn;

  user.contacts = {
    mobile: dto.mobiles ?? [],
    phone: dto.phones ?? [],
  };

  user.job = {
    en: dto.jobEn,
    ar: dto.jobAr,
  };

  user.status = UserStatus.ACTIVE;

  return user;
};
