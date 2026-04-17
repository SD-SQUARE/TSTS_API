export interface KnowledgeBaseItemResponse {
  id: string;
  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
  specialization_en?: string;
  specialization_ar?: string;
  content_en?: string;
  content_ar?: string;
  createdAt: Date;
  updatedAt: Date;
}
