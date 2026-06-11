import { performance, monitorEventLoopDelay } from "perf_hooks";
import { PostgresDataSource, initDataSource, destroyDataSource } from "./src/database/postgres-data-source.js";
import { userTicketsId } from "./src/helpers/userTicketListener.Helper.js";

async function run() {
  await initDataSource();
  
  const userId = "90b76d36-2b83-4f32-a86d-b2524ef8dc35";

  const histogram = monitorEventLoopDelay({ resolution: 10 });
  histogram.enable();

  console.log("=== STARTING userTicketsId ===");
  const t0 = performance.now();
  
  const tickets = await userTicketsId(userId);
  
  const t1 = performance.now();
  console.log(`userTicketsId took: ${(t1 - t0).toFixed(2)}ms`);
  console.log(`Found tickets count: ${tickets.length}`);

  // Mock socket.join
  const joined = new Set();
  const socket = {
    join: (room: string) => joined.add(room)
  };

  const t2 = performance.now();
  tickets.forEach(room => socket.join(room));
  const t3 = performance.now();
  console.log(`socket.join forEach took: ${(t3 - t2).toFixed(2)}ms`);

  histogram.disable();
  console.log(`Event Loop Max Lag: ${(histogram.max / 1e6).toFixed(2)}ms`);
  console.log(`Event Loop Mean Lag: ${(histogram.mean / 1e6).toFixed(2)}ms`);

  await destroyDataSource();
}

run().catch(console.error);
