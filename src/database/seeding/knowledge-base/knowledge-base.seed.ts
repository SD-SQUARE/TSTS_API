import { DataSource } from "typeorm";
import { KnowledgeItem } from "../../../entities/KnowledgeItem.js";
import { knowledgeBaseData } from "./knowledge-base-data-set.js";

export async function seedKnowledgeBase(dataSource: DataSource): Promise<void> {
  const knowledgeRepo = dataSource.getRepository(KnowledgeItem);

  console.log("📚 [KnowledgeBaseSeed] Starting knowledge base seeding...");

  let created = 0;
  let skipped = 0;

  for (const data of knowledgeBaseData) {
    // Check if item already exists
    const existing = await knowledgeRepo.findOne({
      where: { title: data.title },
    });

    if (existing) {
      console.log(`ℹ️ [KnowledgeBaseSeed] Item already exists: ${data.title}`);
      skipped++;
      continue;
    }

    // Create knowledge item with specialization as string
    const item = knowledgeRepo.create({
      title: data.title,
      description: data.description,
      content: data.content.trim(),
      specialization: data.specializationName,
    });

    await knowledgeRepo.save(item);
    console.log(`✅ [KnowledgeBaseSeed] Created: ${data.title}`);
    created++;
  }

  console.log(
    `📚 [KnowledgeBaseSeed] Completed: ${created} created, ${skipped} skipped`,
  );
}
