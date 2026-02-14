import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DataSource } from "typeorm";

import { Domain } from "../../../../entities/Domain.js";
import { University } from "../../../../entities/University.js";
import { Department } from "../../../../entities/Department.js";

type CapitalDomainJsonItem = {
  name_ar: string;
  name_en: string;
};

const CAPITAL_UNIVERSITY_EN_NAME = "Capital University";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ JSON is in the same folder as this seeder file
const JSON_PATH = path.join(__dirname, "capital-university-domains.json");

const normalizeName = (s: string) => s.trim().replace(/\s+/g, " ");

export async function seedCapitalUniversityDomains(ds: DataSource) {
  const domainRepo = ds.getRepository(Domain);
  const uniRepo = ds.getRepository(University);
  const depRepo = ds.getRepository(Department);

  console.log(
    "🌱 Starting Capital University domains + departments seeding...",
  );

  // 1) find university
  const university = await uniRepo
    .createQueryBuilder("u")
    .where("u.name->>'en' = :name", { name: CAPITAL_UNIVERSITY_EN_NAME })
    .getOne();

  if (!university) {
    throw new Error(`University "${CAPITAL_UNIVERSITY_EN_NAME}" not found`);
  }

  // 2) read json
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`JSON file not found: ${JSON_PATH}`);
  }

  const items = JSON.parse(
    fs.readFileSync(JSON_PATH, "utf-8"),
  ) as CapitalDomainJsonItem[];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Capital domains JSON is empty or invalid.");
  }

  let domainCreated = 0,
    domainSkipped = 0,
    deptCreated = 0,
    deptSkipped = 0;

  for (const item of items) {
    const en = normalizeName(item.name_en);
    const ar = normalizeName(item.name_ar);

    if (!en || !ar) {
      console.log("⚠️ Skipping invalid item:", item);
      continue;
    }

    // 3) create/find domain in this university
    let domain = await domainRepo
      .createQueryBuilder("d")
      .where("d.universityId = :uniId", { uniId: university.id })
      .andWhere("(d.name->>'en' = :en OR d.name->>'ar' = :ar)", { en, ar })
      .getOne();

    if (!domain) {
      domain = domainRepo.create({
        name: { en, ar },
        university, // relation object ok
      });

      domain = await domainRepo.save(domain);
      console.log(`✅ Domain created: ${en}`);
      domainCreated++;
    } else {
      console.log(`⏭️ Domain exists: ${en}`);
      domainSkipped++;
    }

    // 4) create matching department under this domain (same name)
    const existingDept = await depRepo
      .createQueryBuilder("dep")
      .where("dep.domainId = :domainId", { domainId: domain.id })
      .andWhere("(dep.name->>'en' = :en OR dep.name->>'ar' = :ar)", { en, ar })
      .getOne();

    if (existingDept) {
      console.log(`⏭️ Department exists for domain "${en}"`);
      deptSkipped++;
      continue;
    }

    const department = depRepo.create({
      name: { en, ar }, // Department.name allows {en, ar?}; passing ar is fine
      domain, // relation object ok
    });

    await depRepo.save(department);
    console.log(`✅ Department created: ${en}`);
    deptCreated++;
  }

  console.log(
    `🎉 Done. Domains: created=${domainCreated}, skipped=${domainSkipped}. Departments: created=${deptCreated}, skipped=${deptSkipped}`,
  );
}
