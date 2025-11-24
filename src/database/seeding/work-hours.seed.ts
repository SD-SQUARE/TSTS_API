import { DataSource } from "typeorm";
import { UserStatus } from "../../enums/UserStatus.enum.js";
import { WorkHour } from "../../entities/WorkHour.js";

const workHoursSeedData: Array<{
  startTime: string;
  endTime: string;
  status: UserStatus;
}> = [
  {
    startTime: "08:00",
    endTime: "16:00",
    status: UserStatus.ACTIVE,
  },
  {
    startTime: "16:00",
    endTime: "00:00",
    status: UserStatus.ACTIVE,
  },
];

export async function seedWorkHours(dataSource: DataSource) {
  const whRepo = dataSource.getRepository(WorkHour);

  for (const wh of workHoursSeedData) {
    const existing = await whRepo
      .createQueryBuilder("w")
      .where("w.startTime = :start AND w.endTime = :end", {
        start: wh.startTime,
        end: wh.endTime,
      })
      .andWhere("w.deletedAt IS NULL")
      .getOne();

    if (existing) {
      existing.status = wh.status;
      await whRepo.save(existing);
      console.log(`✅ [WorkHour] Updated: ${wh.startTime} - ${wh.endTime}`);
    } else {
      const newWh = whRepo.create(wh);
      await whRepo.save(newWh);
      console.log(`✅ [WorkHour] Inserted: ${wh.startTime} - ${wh.endTime}`);
    }
  }
}
