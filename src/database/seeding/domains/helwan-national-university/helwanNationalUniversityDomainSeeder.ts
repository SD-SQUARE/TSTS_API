import fs from "fs";
import { Domain, University, Department } from "../../../../entities/index.js";
import { DataSource } from "typeorm";
import { resolveSeedDataFile } from "../../utils/seedFilePaths.js";

type HNUDomainJsonItem = {
  name_ar: string;
  name_en: string;
};

const HNU_UNIVERSITY_EN_NAME = "Helwan National University";

const getJsonPath = () =>
  resolveSeedDataFile(
    import.meta.url,
    ["domains", "helwan-national-university"],
    "helwan-national-university-domains.json",
  );

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export async function seedHelwanNationalUniversityDomains(
  dataSource: DataSource,
) {
  const domainRepository = dataSource.getRepository(Domain);
  const universityRepository = dataSource.getRepository(University);
  const departmentRepository = dataSource.getRepository(Department);

  console.log("🌱 Starting HNU University domains + departments seeding...");

  // 1) Load JSON file
  const jsonPath = getJsonPath();
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Domains JSON file not found at: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const items = JSON.parse(raw) as HNUDomainJsonItem[];

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Domains JSON is empty or invalid.");
  }

  // 2) Find university by English name (JSONB)
  const university = await universityRepository
    .createQueryBuilder("uni")
    .where("uni.name->>'en' = :name", { name: HNU_UNIVERSITY_EN_NAME })
    .getOne();

  if (!university) {
    throw new Error(
      `University "${HNU_UNIVERSITY_EN_NAME}" not found. Seed universities first or fix the name.`,
    );
  }

  // 3) Seed domains + matching departments
  let domainCreated = 0;
  let domainSkipped = 0;
  let deptCreated = 0;
  let deptSkipped = 0;

  for (const item of items) {
    const en = normalizeName(item.name_en);
    const ar = normalizeName(item.name_ar);

    if (!en || !ar) {
      console.log("⚠️  Skipping invalid item:", item);
      domainSkipped++;
      continue;
    }

    // Find or create domain
    let domain = await domainRepository
      .createQueryBuilder("domain")
      .where("domain.universityId = :uniId", { uniId: university.id })
      .andWhere("(domain.name->>'en' = :en OR domain.name->>'ar' = :ar)", {
        en,
        ar,
      })
      .getOne();

    if (!domain) {
      domain = domainRepository.create({
        name: { en, ar },
        description: { en, ar },
        university,
      });

      domain = await domainRepository.save(domain);
      console.log(`✅ Domain created: ${en}`);
      domainCreated++;
    } else {
      console.log(`⏭️  Domain exists: ${en}`);
      domainSkipped++;
    }

    // Create department with same name under this domain
    const existingDept = await departmentRepository
      .createQueryBuilder("dep")
      .where("dep.domainId = :domainId", { domainId: domain.id })
      .andWhere("(dep.name->>'en' = :en OR dep.name->>'ar' = :ar)", { en, ar })
      .getOne();

    if (existingDept) {
      console.log(`⏭️  Department exists for domain: ${en}`);
      deptSkipped++;
      continue;
    }

    const department = departmentRepository.create({
      name: { en, ar },
      description: { en, ar },
      domain,
    });

    await departmentRepository.save(department);
    console.log(`✅ Department created: ${en}`);
    deptCreated++;
  }

  console.log(
    `🎉 Done. Domains: created=${domainCreated}, skipped=${domainSkipped}. Departments: created=${deptCreated}, skipped=${deptSkipped}`,
  );
}
