import fs from "fs";
import os from "os";
import path from "path";

type PrometheusSample = {
  labels: Record<string, string>;
  value: number;
};

const HOST_METRICS_EXPORTER_URL =
  process.env.HOST_METRICS_EXPORTER_URL?.trim() ||
  process.env.NODE_EXPORTER_URL?.trim() ||
  "";

const snapshotCpuTimes = () =>
  os.cpus().reduce(
    (acc, cpu) => {
      const total = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
      acc.idle += cpu.times.idle;
      acc.total += total;
      return acc;
    },
    { idle: 0, total: 0 },
  );

const measureCpuUsage = async (sampleMs = 150) => {
  const start = snapshotCpuTimes();
  await new Promise((resolve) => setTimeout(resolve, sampleMs));
  const end = snapshotCpuTimes();
  const idleDelta = end.idle - start.idle;
  const totalDelta = end.total - start.total;

  if (totalDelta <= 0) {
    return 0;
  }

  return Number((((totalDelta - idleDelta) / totalDelta) * 100).toFixed(1));
};

const parsePrometheusMetrics = (
  content: string,
): Map<string, PrometheusSample[]> => {
  const metrics = new Map<string, PrometheusSample[]>();
  const linePattern =
    /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{([^}]*)\})?\s+([^\s]+)$/;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(linePattern);
    if (!match) {
      continue;
    }

    const [, metricName, , labelsRaw = "", valueRaw] = match;
    const value = Number(valueRaw);

    if (!Number.isFinite(value)) {
      continue;
    }

    const labels: Record<string, string> = {};

    if (labelsRaw) {
      for (const pair of labelsRaw.split(",")) {
        const [key, rawValue] = pair.split("=");
        if (!key || rawValue === undefined) {
          continue;
        }

        labels[key.trim()] = rawValue.trim().replace(/^"|"$/g, "");
      }
    }

    const existing = metrics.get(metricName) ?? [];
    existing.push({ labels, value });
    metrics.set(metricName, existing);
  }

  return metrics;
};

const getMetricSamples = (
  metrics: Map<string, PrometheusSample[]>,
  metricName: string,
) => metrics.get(metricName) ?? [];

const sumMetricSamples = (
  metrics: Map<string, PrometheusSample[]>,
  metricName: string,
  predicate: (sample: PrometheusSample) => boolean = () => true,
) =>
  getMetricSamples(metrics, metricName)
    .filter(predicate)
    .reduce((sum, sample) => sum + sample.value, 0);

const fetchHostMetrics = async () => {
  if (!HOST_METRICS_EXPORTER_URL) {
    return null;
  }

  const response = await fetch(HOST_METRICS_EXPORTER_URL, {
    headers: { Accept: "text/plain" },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch host metrics: ${response.status} ${response.statusText}`,
    );
  }

  return parsePrometheusMetrics(await response.text());
};

const buildHostCpuSnapshot = (metrics: Map<string, PrometheusSample[]>) => ({
  idle: sumMetricSamples(
    metrics,
    "node_cpu_seconds_total",
    (sample) => sample.labels.mode === "idle",
  ),
  total: sumMetricSamples(metrics, "node_cpu_seconds_total"),
});

const measureHostCpuUsage = async (sampleMs = 250) => {
  if (!HOST_METRICS_EXPORTER_URL) {
    return null;
  }

  const startMetrics = await fetchHostMetrics();
  if (!startMetrics) {
    return null;
  }

  const start = buildHostCpuSnapshot(startMetrics);
  await new Promise((resolve) => setTimeout(resolve, sampleMs));

  const endMetrics = await fetchHostMetrics();
  if (!endMetrics) {
    return null;
  }

  const end = buildHostCpuSnapshot(endMetrics);
  const idleDelta = end.idle - start.idle;
  const totalDelta = end.total - start.total;

  if (totalDelta <= 0) {
    return null;
  }

  return Number((((totalDelta - idleDelta) / totalDelta) * 100).toFixed(1));
};

const pickHostFilesystemSample = (
  metrics: Map<string, PrometheusSample[]>,
  metricName: string,
) => {
  const samples = getMetricSamples(metrics, metricName).filter((sample) => {
    const mountpoint = sample.labels.mountpoint || "";
    const fstype = sample.labels.fstype || "";

    return !["tmpfs", "overlay", "squashfs", "proc", "sysfs"].includes(
      fstype,
    ) && !mountpoint.startsWith("/sys") && !mountpoint.startsWith("/proc");
  });

  return (
    samples.find((sample) => sample.labels.mountpoint === "/") ??
    samples.find((sample) => sample.labels.mountpoint === "/host/rootfs") ??
    samples[0] ??
    null
  );
};

const getHostSystemInfo = async () => {
  const metrics = await fetchHostMetrics();
  if (!metrics) {
    return null;
  }

  const cpuUsagePercent = await measureHostCpuUsage();
  const cpuCores = new Set(
    getMetricSamples(metrics, "node_cpu_seconds_total").map(
      (sample) => sample.labels.cpu,
    ),
  );
  const cpuInfo = getMetricSamples(metrics, "node_cpu_info")[0];
  const unameInfo = getMetricSamples(metrics, "node_uname_info")[0];

  const memoryTotal = sumMetricSamples(metrics, "node_memory_MemTotal_bytes");
  const memoryAvailable = sumMetricSamples(
    metrics,
    "node_memory_MemAvailable_bytes",
  );
  const memoryUsed = Math.max(memoryTotal - memoryAvailable, 0);

  const diskSizeSample = pickHostFilesystemSample(
    metrics,
    "node_filesystem_size_bytes",
  );
  const diskFreeSample = diskSizeSample
    ? getMetricSamples(metrics, "node_filesystem_avail_bytes").find(
        (sample) =>
          sample.labels.mountpoint === diskSizeSample.labels.mountpoint &&
          sample.labels.device === diskSizeSample.labels.device,
      )
    : null;

  const bootTime = sumMetricSamples(metrics, "node_boot_time_seconds");
  const currentTime = sumMetricSamples(metrics, "node_time_seconds");

  return {
    generatedAt: new Date().toISOString(),
    cpu: {
      usagePercent: cpuUsagePercent ?? 0,
      cores: cpuCores.size || os.cpus().length,
      model:
        cpuInfo?.labels.model_name ||
        cpuInfo?.labels.model ||
        os.cpus()[0]?.model ||
        "Unknown",
      speedMhz: Number(cpuInfo?.labels.cpu_mhz || os.cpus()[0]?.speed || 0),
      loadAverage: [
        sumMetricSamples(metrics, "node_load1"),
        sumMetricSamples(metrics, "node_load5"),
        sumMetricSamples(metrics, "node_load15"),
      ],
    },
    memory: {
      total: memoryTotal,
      free: memoryAvailable,
      used: memoryUsed,
      usagePercent:
        memoryTotal > 0 ? Number(((memoryUsed / memoryTotal) * 100).toFixed(1)) : 0,
      processRss: process.memoryUsage().rss,
      processHeapUsed: process.memoryUsage().heapUsed,
      processHeapTotal: process.memoryUsage().heapTotal,
    },
    disk: diskSizeSample
      ? {
          path: diskSizeSample.labels.mountpoint || "/",
          total: diskSizeSample.value,
          free: diskFreeSample?.value ?? 0,
          used: Math.max(diskSizeSample.value - (diskFreeSample?.value ?? 0), 0),
          usagePercent:
            diskSizeSample.value > 0
              ? Number(
                  (
                    ((diskSizeSample.value - (diskFreeSample?.value ?? 0)) /
                      diskSizeSample.value) *
                    100
                  ).toFixed(1),
                )
              : 0,
        }
      : null,
    runtime: {
      hostname: unameInfo?.labels.nodename || os.hostname(),
      platform: unameInfo?.labels.sysname || os.platform(),
      arch: unameInfo?.labels.machine || os.arch(),
      uptimeSeconds:
        currentTime && bootTime && currentTime > bootTime
          ? currentTime - bootTime
          : os.uptime(),
      processUptimeSeconds: process.uptime(),
      nodeVersion: process.version,
      pid: process.pid,
    },
  };
};

const getDiskStats = () => {
  try {
    const diskPath = path.parse(process.cwd()).root || "/";
    const stats = fs.statfsSync(diskPath);
    const total = Number(stats.bsize) * Number(stats.blocks);
    const free = Number(stats.bsize) * Number(stats.bavail);
    const used = Math.max(total - free, 0);

    return {
      path: diskPath,
      total,
      free,
      used,
      usagePercent: total > 0 ? Number(((used / total) * 100).toFixed(1)) : 0,
    };
  } catch {
    return null;
  }
};

export const getSystemInfoService = async () => {
  try {
    const hostInfo = await getHostSystemInfo();
    if (hostInfo) {
      return hostInfo;
    }
  } catch {
    // Fall back to local runtime metrics when host exporter is unavailable.
  }

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const processMemory = process.memoryUsage();

  return {
    generatedAt: new Date().toISOString(),
    cpu: {
      usagePercent: await measureCpuUsage(),
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || "Unknown",
      speedMhz: os.cpus()[0]?.speed || 0,
      loadAverage: os.loadavg(),
    },
    memory: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      usagePercent:
        totalMemory > 0 ? Number(((usedMemory / totalMemory) * 100).toFixed(1)) : 0,
      processRss: processMemory.rss,
      processHeapUsed: processMemory.heapUsed,
      processHeapTotal: processMemory.heapTotal,
    },
    disk: getDiskStats(),
    runtime: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptimeSeconds: os.uptime(),
      processUptimeSeconds: process.uptime(),
      nodeVersion: process.version,
      pid: process.pid,
    },
  };
};
