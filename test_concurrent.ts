import { performance, monitorEventLoopDelay } from "perf_hooks";
import { PostgresDataSource, initDataSource, destroyDataSource } from "./src/database/postgres-data-source.js";
import { getCombinedChatInbox } from "./src/services/chat.service.js";
import { countUnreadNotifications, listNotifications } from "./src/services/notification.service.js";
import { getAllTicketsService } from "./src/services/tickets/Query/get-tickets.service.js";

async function run() {
  await initDataSource();
  
  const userId = "2d8fa0d0-a06f-4697-b3da-ab8555cc9c19";

  console.log("=== WARMUP ===");
  // Warm up caches
  await getCombinedChatInbox(userId);
  await getAllTicketsService(
    { id: userId, role: "Admin", permissions: [] } as any,
    { page_index: 1, page_size: 50 } as any,
    "en"
  );

  console.log("\n=== CONCURRENT EXECUTION ===");
  const histogram = monitorEventLoopDelay({ resolution: 10 });
  histogram.enable();

  const t0 = performance.now();

  await Promise.all([
    countUnreadNotifications(userId),
    listNotifications(userId, undefined, 1, 10),
    getCombinedChatInbox(userId),
    getAllTicketsService(
      { id: userId, role: "Admin", permissions: [] } as any,
      { page_index: 1, page_size: 50 } as any,
      "en"
    )
  ]);

  const t1 = performance.now();
  histogram.disable();

  console.log(`Concurrent execution took: ${(t1 - t0).toFixed(2)}ms`);
  console.log(`Event Loop Max Lag: ${(histogram.max / 1e6).toFixed(2)}ms`);

  await destroyDataSource();
}

run().catch(console.error);
