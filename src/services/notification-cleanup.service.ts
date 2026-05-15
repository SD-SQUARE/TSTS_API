import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Notification } from "../entities/Notification.js";
import { NotificationRead } from "../entities/NotificationRead.js";
import { LessThan } from "typeorm";
import logger from "../utils/logger.js";

const RETENTION_DAYS = 30;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run once per day

/**
 * Deletes notifications older than RETENTION_DAYS days.
 * Also removes associated NotificationRead records.
 */
export async function cleanupOldNotifications(): Promise<void> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

        const notificationRepo = PostgresDataSource.getRepository(Notification);
        const notificationReadRepo = PostgresDataSource.getRepository(NotificationRead);

        // Find old notifications
        const oldNotifications = await notificationRepo.find({
            where: { createdAt: LessThan(cutoffDate) },
            select: ["id"],
        });

        if (oldNotifications.length === 0) {
            logger.info(`[notification-cleanup] No notifications older than ${RETENTION_DAYS} days found`);
            return;
        }

        const oldIds = oldNotifications.map(n => n.id);

        // Delete associated reads first (FK constraint)
        await notificationReadRepo
            .createQueryBuilder()
            .delete()
            .where('"notificationId" IN (:...ids)', { ids: oldIds })
            .execute();

        // Delete the notifications
        await notificationRepo
            .createQueryBuilder()
            .delete()
            .where("id IN (:...ids)", { ids: oldIds })
            .execute();

        logger.info(`[notification-cleanup] Deleted ${oldNotifications.length} notifications older than ${RETENTION_DAYS} days`);
    } catch (err: any) {
        logger.error(`[notification-cleanup] Error during cleanup: ${err.message}`);
    }
}

/**
 * Starts the daily notification cleanup scheduler.
 * Runs immediately on startup, then every 24 hours.
 */
export function startNotificationCleanupScheduler(): void {
    logger.info(`[notification-cleanup] Scheduler started — notifications older than ${RETENTION_DAYS} days will be auto-deleted daily`);

    // Run immediately on startup (after a short delay to let DB connect)
    setTimeout(() => {
        cleanupOldNotifications().catch(err =>
            logger.error(`[notification-cleanup] Initial cleanup failed: ${err.message}`)
        );
    }, 30_000); // 30 second delay after startup

    // Then run every 24 hours
    setInterval(() => {
        cleanupOldNotifications().catch(err =>
            logger.error(`[notification-cleanup] Scheduled cleanup failed: ${err.message}`)
        );
    }, CLEANUP_INTERVAL_MS);
}
