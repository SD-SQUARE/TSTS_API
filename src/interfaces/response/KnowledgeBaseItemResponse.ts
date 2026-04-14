export interface KnowledgeBaseItemResponse {
  id: string;

  title: {
    en: string;
    ar: string;
  };

  description: {
    en: string;
    ar: string;
  };

  specialization: {
    en: string;
    ar: string;
  };

  content?: {
    en?: string;
    ar?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}