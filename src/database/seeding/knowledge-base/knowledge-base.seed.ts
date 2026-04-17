import { DataSource } from "typeorm";
import { KnowledgeItem } from "../../../entities/KnowledgeItem.js";
import { knowledgeBaseData } from "./knowledge-base-data-set.js";

export async function seedKnowledgeBase(dataSource: DataSource): Promise<void> {
  const knowledgeRepo = dataSource.getRepository(KnowledgeItem);

  console.log("KnowledgeBaseSeed: starting knowledge base seeding...");

  let created = 0;
  let skipped = 0;

  for (const data of knowledgeBaseData) {
    const existing = await knowledgeRepo.findOne({
      where: { title_en: data.title },
    });

    if (existing) {
      console.log(`KnowledgeBaseSeed: item already exists: ${data.title}`);
      skipped++;
      continue;
    }

    const trimmedContent = data.content.trim();
    const item = knowledgeRepo.create({
      title_en: data.title,
      title_ar: data.title,
      description_en: data.description,
      description_ar: data.description,
      content_en: trimmedContent,
      content_ar: trimmedContent,
      specialization_en: data.specializationName,
      specialization_ar: data.specializationName,
    });

    await knowledgeRepo.save(item);
    console.log(`KnowledgeBaseSeed: created: ${data.title}`);
    created++;
  }

  console.log(
    `KnowledgeBaseSeed: completed: ${created} created, ${skipped} skipped`,
  );
}
