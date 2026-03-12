export interface CreateRequesterBody {
  image?: string;

  email: string;
  password: string;
  user_type: string;

  first_name_en: string;
  mid_name_en: string;
  last_name_en: string;

  first_name_ar: string;
  mid_name_ar: string;
  last_name_ar: string;

  full_name_en: string;
  full_name_ar: string;

  ssn: string;

  university: string;
  domain: string;
  departments: string[];

  contacts: {
    phones: string[];
    mobiles: string[];
  };

  allowed_specializations: string[];

  permission_profile: string;
  extra_permissions: string[];
  revoked_permissions: string[];

  job_en: string;
  job_ar: string;
}

// What you actually want to work with in your service / DB layer
export interface CreateRequesterMapped {
  image?: Express.Multer.File | undefined;

  email: string;
  password: string;
  userType: string;

  firstNameEn: string;
  midNameEn: string;
  lastNameEn: string;

  firstNameAr: string;
  midNameAr: string;
  lastNameAr: string;

  fullNameEn: string;
  fullNameAr: string;

  ssn: string;

  university: string;
  domain: string;
  departments: string[];

  phones: string[];
  mobiles: string[];

  allowedSpecializations: string[];

  permissionProfile: string;
  extraPermissions: string[];
  revokedPermissions: string[];

  jobEn: string;
  jobAr: string;
}
