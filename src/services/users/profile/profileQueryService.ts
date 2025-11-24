import { Specialization } from "../../../entities/Specialization.js";
import { UserType } from "../../../enums/UserType.enum.js";
import {
  parsePageIndex,
  parsePageSize,
} from "../../../helpers/paginationHelper.js";
import { IPagination } from "../../../interfaces/shared/IPagination.js";
import { toGroupDto } from "../../../mappers/groups/toGroupDto.js";
import { toSpecializationDto } from "../../../mappers/specializations/toSpecializationDto.js";
import { userRepository } from "../../../repositories/UserRepository.js";
import { getAdminByIdService } from "../admin/adminQueryService.js";
import { getRequesterByIdService } from "../requester/requesterQueryService.js";
import { getTechnicianByIdService } from "../technician/technicianQueryService.js";

export const getUserProfileByType = async (id, lang: "ar" | "en") => {
  const userType = await userRepository.getUserTypeByUserId(id);

  if (userType == UserType.ADMIN) {
    return await getAdminByIdService(id, lang);
  } else if (userType == UserType.REQUESTER) {
    return await getRequesterByIdService(id, lang);
  } else if (userType == UserType.TECHNICIAN) {
    return await getTechnicianByIdService(id, lang);
  } else return null;
};

export const getMyProfile = async (id, lang: "ar" | "en") => {
  const userType = await userRepository.getUserTypeByUserId(id);
  if (userType == UserType.ADMIN || userType == UserType.SUPER_ADMIN) {
    return await getAdminByIdService(id, lang);
  } else if (userType == UserType.REQUESTER) {
    return await getRequesterByIdService(id, lang);
  } else if (userType == UserType.TECHNICIAN) {
    return await getTechnicianByIdService(id, lang);
  } else return null;
};

export const fetchUserGroupsService = async (
  userId: string,
  query: IPagination,
  lang: "ar" | "en"
) => {
  query.page_index = parsePageIndex(query?.page_index);
  query.page_size = parsePageSize(query?.page_size);

  const [groups, total] = await userRepository.getUserGroups(userId, query);

  const dtoList = await Promise.all(groups.map((g) => toGroupDto(g, lang)));

  return {
    groups: dtoList,
    meta_data: {
      total,
      ...query,
    },
  };
};

export const fetchUserSpecializationsService = async (
  userId: string,
  query: IPagination,
  lang: "ar" | "en"
) => {
  query.page_index = parsePageIndex(query?.page_index);
  query.page_size = parsePageSize(query?.page_size);

  const [specs, total] = await userRepository.getUserSpecializations(
    userId,
    query
  );

  const dtoList = await Promise.all(
    specs.map((g) => toSpecializationDto(g, lang))
  );

  return {
    specializations: dtoList,
    meta_data: {
      total,
      ...query,
    },
  };
};
