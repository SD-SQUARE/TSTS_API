import { readFileSync, writeFileSync } from "fs";
import { getHostIp } from "./network.utils";

async function main() {
  const HOST_IP = getHostIp();
  const FROM = `./secrets/.env.stagging`;

  const TARGETS = [`./docker/.env`, `./.env`, `./tests/.env.test`];

  try {
    // 1. Read the original content
    let content = readFileSync(FROM, "utf8");

    // 2. Regex to find any IP-like string or specific old IP and replace with new HOST_IP
    // This targets the existing IP pattern (__HOST_IP__) in your file
    const oldIpPattern = /__HOST_IP__/g;
    const updatedContent = content.replace(oldIpPattern, HOST_IP);

    // 3. Write the updated content to all paths
    for (const path of TARGETS) {
      writeFileSync(path, updatedContent);
    }

    console.log(`✅ Successfully updated IP to ${HOST_IP} in all .env files.`);
  } catch (err) {
    console.error("❌ Failed to process .env files:", err);
    process.exit(1);
  }
}

main();
