export interface PermissionProfileDto {
  id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  permissions: {
    "key": string;
    "name_en": string;
    "name_ar": string;
  }[];
}