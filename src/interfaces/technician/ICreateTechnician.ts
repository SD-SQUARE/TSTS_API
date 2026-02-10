export interface CreateTechnicianBody {
  image?: string; // optional – can be ignore in code if you only use req.file

  email: string;
  password: string;
  user_type: string;

  first_name_en: string;
  mid_name_en: string;
  last_name_en: string;

  first_name_ar: string;
  mid_name_ar: string;
  last_name_ar: string;

  ssn: string;

  university: string; // now a plain string
  domain: string; // now a plain string

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

export interface CreateTechnicianMapped {
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

  ssn: string;

  university: string;
  domain: string;

  phones: string[];
  mobiles: string[];

  allowedSpecializations: string[];

  permissionProfile: string;
  extraPermissions: string[];
  revokedPermissions: string[];

  jobEn: string;
  jobAr: string;
}
