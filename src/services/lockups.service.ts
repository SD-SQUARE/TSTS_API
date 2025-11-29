import { User } from "../entities/User.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { buildPagination } from "../utils/pagination.js";

interface UsersLockupQuery {
  first_name?: string;
  mid_name?: string;
  last_name?: string;
  user_type?: string;
  page?: number;
  limit?: number;
}

const usersRepository = PostgresDataSource.getRepository(User);

export const getUsersLockupService = async (query: UsersLockupQuery) => {
  const { skip, take, meta } = buildPagination({
    page: query.page,
    limit: query.limit,
  });

  // Build query
  const qb = usersRepository
    .createQueryBuilder("user")
    .where("user.user_type != :superAdmin", { superAdmin: "SuperAdmin" });

  // Filters
  if (query.first_name) {
    qb.andWhere(
      `user.firstName->>'en' ILIKE :first_name OR user.firstName->>'ar' ILIKE :first_name`,
      { first_name: `%${query.first_name}%` }
    );
  }

  if (query.mid_name) {
    qb.andWhere(
      `user.midName->>'en' ILIKE :mid_name OR user.midName->>'ar' ILIKE :mid_name`,
      { mid_name: `%${query.mid_name}%` }
    );
  }

  if (query.last_name) {
    qb.andWhere(
      `user.lastName->>'en' ILIKE :last_name OR user.lastName->>'ar' ILIKE :last_name`,
      { last_name: `%${query.last_name}%` }
    );
  }

  if (query.user_type) {
    qb.andWhere("user.user_type = :user_type", { user_type: query.user_type });
  }

  // Get total count
  const total = await qb.getCount();

  // Get paginated results
  const users = await qb.skip(skip).take(take).getMany();

  // Map to lockup format
  const mappedUsers = users.map((u) => ({
    id: u.id,
    image: u.image || "",
    email: u.email,
    first_name: u.firstName?.en || "",
    mid_name: u.midName?.en || "",
    last_name: u.lastName?.en || "",
    user_type: u.user_type || "",
    status: u.status,
  }));

  return mappedUsers;
};
