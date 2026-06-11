export interface ProblemDto  {
  id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;

  specialization: {
    id: string;
    name_en: string;
    name_ar: string;
    description_en?: string;
    description_ar?: string;
    review_required: boolean;
  };

  review_required: boolean;
}