import { Entity, Column } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { UserStatus } from "../enums/UserStatus.enum.js";
import { day } from "../enums/day.enum.type.js";

type SortOrder = "ASC" | "DESC";

export interface WorkHourPaginateOptions {
  page?: number;
  limit?: number;
  startTime?: string; 
  endTime?: string;
  status?: UserStatus | string;
  sortBy?: "startTime" | "endTime" | "createdAt" | "updatedAt";
  order?: SortOrder;
}

export interface PaginatedResult<T> {
  meta: {
    total: number;
    page_index: number;
    page_size: number;
  };
  work_hours: T[];
}

@Entity({ name: "work_hours" })
export class WorkHour extends BaseEntity {
  @Column({ type: "time" })
  startTime!: string;

  @Column({ type: "time" })
  endTime!: string;

  @Column({ type: "enum", enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;
  @Column({ type: "enum", enum: day })
  day!:day

 
  static async paginate(
    opts: WorkHourPaginateOptions = {}
  ): Promise<PaginatedResult<WorkHour>> {
    const page = Math.max(1, Math.floor(opts.page || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(opts.limit || 10))); // cap at 100
    const skip = (page - 1) * limit;

    const {
      startTime,
      endTime,
      status,
      sortBy = "createdAt",
      order = "DESC",
    } = opts;

    if (status && !Object.values(UserStatus).includes(status as UserStatus)) {
      throw new Error("Invalid status value");
    }

    const qb = this.createQueryBuilder("wh");

    if (startTime && endTime) {
      qb.andWhere("wh.startTime = :startTime", { startTime }).andWhere(
        "wh.endTime = :endTime",
        { endTime }
      );
    } else if (startTime) {
      qb.andWhere("wh.startTime = :startTime", { startTime });
    } else if (endTime) {
      qb.andWhere("wh.endTime = :endTime", { endTime });
    }

    if (status) {
      qb.andWhere("wh.status = :status", { status });
    }

    const allowedSortBy = new Set(["startTime", "endTime", "createdAt", "updatedAt"]);
    const sortColumn = allowedSortBy.has(sortBy) ? `wh.${sortBy}` : "wh.createdAt";
    const orderUpper = (order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    const total = await qb.getCount();

    const data = await qb
      .orderBy(sortColumn, orderUpper as "ASC" | "DESC")
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      work_hours:data,
      meta: {
        total,
        page_index: page,
        page_size:limit,
      },
      
    };
  }
}
