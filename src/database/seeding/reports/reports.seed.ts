import { DataSource } from "typeorm";
import { Report } from "../../../entities/Report.js";
import { PostgresDataSource } from "../../postgres-data-source.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ReportSeedData {
  handler: string;
  title: { en?: string; ar?: string };
  description?: { en?: string; ar?: string };
  columns?: Array<{
    key: string;
    label: { en?: string; ar?: string };
  }>;
  filters?: Array<{
    column: string;
  }>;
}

export async function seedReports(dataSource: DataSource) {
  const reportRepo = dataSource.getRepository(Report);

  // Load JSON file
  const jsonPath = path.join(__dirname, "reports-data.json");

  if (!fs.existsSync(jsonPath)) {
    console.warn(`⚠️ [ReportsSeed] JSON file not found at: ${jsonPath}`);
    return;
  }

  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const reportsSeedData: ReportSeedData[] = JSON.parse(rawData);

  console.log(
    `ℹ️ [ReportsSeed] Loaded ${reportsSeedData.length} reports from JSON`,
  );

  for (const report of reportsSeedData) {
    // Check if report already exists by handler
    const existing = await reportRepo
      .createQueryBuilder("r")
      .where("r.handler = :handler", { handler: report.handler })
      .getOne();

    if (existing) {
      // Update existing report
      existing.title = report.title;
      existing.description = report.description;
      existing.columns = report.columns;
      existing.filters = report.filters;
      await reportRepo.save(existing);
      console.log(
        `✅ [ReportsSeed] Updated report: ${report.handler} - ${report.title.en}`,
      );
    } else {
      // Create new report
      const newReport = reportRepo.create({
        handler: report.handler,
        title: report.title,
        description: report.description,
        columns: report.columns,
        filters: report.filters,
      });
      await reportRepo.save(newReport);
      console.log(
        `✅ [ReportsSeed] Inserted report: ${report.handler} - ${report.title.en}`,
      );
    }
  }
}

// Standalone runner for npm run seed-reports
async function runReportSeeding() {
  try {
    console.log("🚀 Starting reports seeding...");

    if (!PostgresDataSource.isInitialized) {
      console.log("📡 Initializing database connection...");
      await PostgresDataSource.initialize();
      console.log("✅ Database connected");
    }

    await seedReports(PostgresDataSource);
    console.log("🎉 Reports seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during reports seeding:", error);
    process.exitCode = 1;
  } finally {
    if (PostgresDataSource.isInitialized) {
      console.log("🔌 Closing database connection...");
      await PostgresDataSource.destroy();
    }
    process.exit(process.exitCode || 0);
  }
}

// Run the seeding
runReportSeeding();
