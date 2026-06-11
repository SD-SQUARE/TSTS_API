import { PostgresDataSource, initDataSource, destroyDataSource } from "./src/database/postgres-data-source.js";
import { getCombinedChatInbox, listPersonalConversations, listGroupConversations, listTeamConversations } from "./src/services/chat.service.js";
import { performance } from "perf_hooks";

async function run() {
  await initDataSource();
  
  const userId = "2d8fa0d0-a06f-4697-b3da-ab8555cc9c19";

  console.log("=== WARMUP ===");
  await listPersonalConversations(userId);

  console.log("\n=== TESTING INBOX PERFORMANCE ===");
  const t0 = performance.now();
  const personal = await listPersonalConversations(userId);
  const t1 = performance.now();
  
  const t2 = performance.now();
  const combined = await getCombinedChatInbox(userId);
  const t3 = performance.now();

  console.log(`listPersonalConversations took: ${(t1 - t0).toFixed(2)}ms`);
  console.log(`getCombinedChatInbox took: ${(t3 - t2).toFixed(2)}ms`);

  await destroyDataSource();
}

run().catch(console.error);
