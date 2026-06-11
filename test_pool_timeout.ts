import { PostgresDataSource, initDataSource, destroyDataSource } from "./src/database/postgres-data-source.js";
import { performance, monitorEventLoopDelay } from "perf_hooks";

async function run() {
  await initDataSource();

  const histogram = monitorEventLoopDelay({ resolution: 10 });
  
  console.log("=== COLD START (Pool is empty) ===");
  histogram.enable();
  const t0 = performance.now();
  await PostgresDataSource.query("SELECT 1");
  const t1 = performance.now();
  histogram.disable();
  console.log(`Cold query took: ${(t1 - t0).toFixed(2)}ms`);
  console.log(`Event Loop Max Lag: ${(histogram.max / 1e6).toFixed(2)}ms`);

  console.log("\n=== WARM START ===");
  histogram.enable();
  const t2 = performance.now();
  await PostgresDataSource.query("SELECT 1");
  const t3 = performance.now();
  histogram.disable();
  console.log(`Warm query took: ${(t3 - t2).toFixed(2)}ms`);
  console.log(`Event Loop Max Lag: ${(histogram.max / 1e6).toFixed(2)}ms`);

  console.log("\n=== WAITING 11 SECONDS (pg default idleTimeout is 10s) ===");
  await new Promise(resolve => setTimeout(resolve, 11000));

  console.log("\n=== AFTER IDLE TIMEOUT ===");
  histogram.enable();
  const t4 = performance.now();
  await PostgresDataSource.query("SELECT 1");
  const t5 = performance.now();
  histogram.disable();
  console.log(`Query after timeout took: ${(t5 - t4).toFixed(2)}ms`);
  console.log(`Event Loop Max Lag: ${(histogram.max / 1e6).toFixed(2)}ms`);

  // Concurrency cold start test
  console.log("\n=== WAITING 11 SECONDS ===");
  await new Promise(resolve => setTimeout(resolve, 11000));
  
  console.log("\n=== CONCURRENT COLD START (7 queries) ===");
  histogram.enable();
  const t6 = performance.now();
  await Promise.all([
    PostgresDataSource.query("SELECT 1"),
    PostgresDataSource.query("SELECT 1"),
    PostgresDataSource.query("SELECT 1"),
    PostgresDataSource.query("SELECT 1"),
    PostgresDataSource.query("SELECT 1"),
    PostgresDataSource.query("SELECT 1"),
    PostgresDataSource.query("SELECT 1"),
  ]);
  const t7 = performance.now();
  histogram.disable();
  console.log(`7 Concurrent cold queries took: ${(t7 - t6).toFixed(2)}ms`);
  console.log(`Event Loop Max Lag: ${(histogram.max / 1e6).toFixed(2)}ms`);

  await destroyDataSource();
}

run().catch(console.error);
