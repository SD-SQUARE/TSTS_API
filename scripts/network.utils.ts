import { networkInterfaces } from "os";

export const getHostIp = (): string => {
  const nets = networkInterfaces();

  const blockedName = /(vEthernet|WSL|docker|br-|vmnet|hyper-v)/i;

  let fallbackIp: string | null = null;

  for (const [name, interfaces] of Object.entries(nets)) {
    if (!interfaces || blockedName.test(name)) continue;

    for (const net of interfaces) {
      if (net.family === "IPv4" && !net.internal) {
        // Prefer Ethernet-like interfaces
        if (/^(eth|en|Ethernet)/i.test(name)) {
          return net.address;
        }

        // Save Wi-Fi / others as fallback
        fallbackIp ??= net.address;
      }
    }
  }

  return fallbackIp ?? "localhost";
};