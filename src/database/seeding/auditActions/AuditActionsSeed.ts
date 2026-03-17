import { AuditAction } from "../../../enums/AuditAction.enum.js";

export const auditActionsSeed = [
  {
    key: AuditAction.CREATE_ADMIN,
    name: { en: "Create Admin", ar: "إنشاء مسؤول" },
  },
  {
    key: AuditAction.EDIT_ADMIN,
    name: { en: "Edit Admin", ar: "تعديل مسؤول" },
  },
  {
    key: AuditAction.DELETE_ADMIN,
    name: { en: "Delete Admin", ar: "حذف مسؤول" },
  },
  {
    key: AuditAction.RETRIEVE_ADMINS,
    name: { en: "Retrieve Admins", ar: "استرجاع المسؤولين" },
  },
  {
    key: AuditAction.RETRIEVE_ADMIN_BY_ID,
    name: { en: "Retrieve Admin By ID", ar: "استرجاع مسؤول بالمعرف" },
  },
  {
    key: AuditAction.FORGOT_PASSWORD,
    name: { en: "Forgot Password", ar: "نسيان كلمة المرور" },
  },
  {
    key: AuditAction.VERIFY_RESET_OTP,
    name: { en: "Verify Reset OTP", ar: "التحقق من رمز إعادة التعيين" },
  },
  {
    key: AuditAction.RESET_PASSWORD,
    name: { en: "Reset Password", ar: "إعادة تعيين كلمة المرور" },
  },
  {
    key: AuditAction.USER_LOGIN,
    name: { en: "User Login", ar: "تسجيل دخول المستخدم" },
  },
  {
    key: AuditAction.WEBAUTHN_AUTH_OPTIONS,
    name: { en: "WebAuthn Auth Options", ar: "خيارات مصادقة WebAuthn" },
  },
  {
    key: AuditAction.WEBAUTHN_VERIFY,
    name: { en: "WebAuthn Verify", ar: "التحقق عبر WebAuthn" },
  },
  {
    key: AuditAction.CREATE_DEPARTMENT,
    name: { en: "Create Department", ar: "إنشاء قسم" },
  },
  {
    key: AuditAction.RETRIEVE_DEPARTMENT,
    name: { en: "Retrieve Department", ar: "استرجاع قسم" },
  },
  {
    key: AuditAction.UPDATE_DEPARTMENT,
    name: { en: "Update Department", ar: "تعديل قسم" },
  },
  {
    key: AuditAction.DELETE_DEPARTMENT,
    name: { en: "Delete Department", ar: "حذف قسم" },
  },
  {
    key: AuditAction.RETRIEVE_DEPARTMENT_USERS,
    name: { en: "Retrieve Department Users", ar: "استرجاع مستخدمي القسم" },
  },
  {
    key: AuditAction.RETRIEVE_DOMAINS,
    name: { en: "Retrieve Domains", ar: "استرجاع النطاقات" },
  },
  {
    key: AuditAction.CREATE_DOMAIN,
    name: { en: "Create Domain", ar: "إنشاء نطاق" },
  },
  {
    key: AuditAction.RETRIEVE_DOMAIN_BY_ID,
    name: { en: "Retrieve Domain By ID", ar: "استرجاع نطاق بالمعرف" },
  },
  {
    key: AuditAction.UPDATE_DOMAIN,
    name: { en: "Update Domain", ar: "تعديل نطاق" },
  },
  {
    key: AuditAction.DELETE_DOMAIN,
    name: { en: "Delete Domain", ar: "حذف نطاق" },
  },
  {
    key: AuditAction.TOKEN_GENERATION,
    name: { en: "Token Generation", ar: "إنشاء رمز المصادقة" },
  },

  {
    key: AuditAction.ADD_GROUP,
    name: { en: "Add Group", ar: "إضافة مجموعة" },
  },
  {
    key: AuditAction.BULK_ASSIGN_USERS,
    name: { en: "Bulk Assign Users", ar: "تعيين مستخدمين بالجملة" },
  },
  {
    key: AuditAction.GET_GROUP,
    name: { en: "Get Group", ar: "الحصول على مجموعة" },
  },
  {
    key: AuditAction.DELETE_GROUP,
    name: { en: "Delete Group", ar: "حذف مجموعة" },
  },
  {
    key: AuditAction.GET_ALL_GROUPS,
    name: { en: "Get All Groups", ar: "الحصول على جميع المجموعات" },
  },
  {
    key: AuditAction.GET_GROUP_USERS,
    name: { en: "Get Group Users", ar: "الحصول على مستخدمي المجموعة" },
  },
  {
    key: AuditAction.EDIT_GROUP,
    name: { en: "Edit Group", ar: "تعديل مجموعة" },
  },
  {
    key: AuditAction.GET_KNOWLEDGE_ITEMS,
    name: { en: "Get Knowledge Items", ar: "الحصول على عناصر المعرفة" },
  },
  {
    key: AuditAction.GET_KNOWLEDGE_ITEM_BY_ID,
    name: {
      en: "Get Knowledge Item By ID",
      ar: "الحصول على عنصر المعرفة بالمعرف",
    },
  },
  {
    key: AuditAction.CREATE_KNOWLEDGE_ITEM,
    name: { en: "Create Knowledge Item", ar: "إنشاء عنصر معرفة" },
  },
  {
    key: AuditAction.UPDATE_KNOWLEDGE_ITEM,
    name: { en: "Update Knowledge Item", ar: "تحديث عنصر المعرفة" },
  },
  {
    key: AuditAction.DELETE_KNOWLEDGE_ITEM,
    name: { en: "Delete Knowledge Item", ar: "حذف عنصر المعرفة" },
  },
  {
    key: AuditAction.GET_PROBLEM_BY_ID,
    name: { en: "Get Problem By ID", ar: "الحصول على المشكلة بالمعرف" },
  },
  {
    key: AuditAction.GET_PROBLEMS,
    name: { en: "Get Problems", ar: "الحصول على المشكلات" },
  },
  {
    key: AuditAction.CREATE_PROBLEM,
    name: { en: "Create Problem", ar: "إنشاء مشكلة" },
  },
  {
    key: AuditAction.UPDATE_PROBLEM,
    name: { en: "Update Problem", ar: "تحديث المشكلة" },
  },
  {
    key: AuditAction.DELETE_PROBLEM,
    name: { en: "Delete Problem", ar: "حذف المشكلة" },
  },
  {
    key: AuditAction.GET_USER_PROFILE,
    name: { en: "Get User Profile", ar: "الحصول على ملف المستخدم" },
  },
  {
    key: AuditAction.RESET_USER_PASSWORD,
    name: { en: "Reset User Password", ar: "إعادة تعيين كلمة مرور المستخدم" },
  },
  {
    key: AuditAction.GET_MY_PROFILE,
    name: { en: "Get My Profile", ar: "الحصول على ملفي الشخصي" },
  },
  {
    key: AuditAction.GET_USER_GROUPS,
    name: { en: "Get User Groups", ar: "الحصول على مجموعات المستخدم" },
  },
  {
    key: AuditAction.GET_USER_SPECIALIZATIONS,
    name: { en: "Get User Specializations", ar: "الحصول على تخصصات المستخدم" },
  },
  {
    key: AuditAction.GET_AVAILABLE_REPORTS,
    name: { en: "Get Available Reports", ar: "الحصول على التقارير المتاحة" },
  },
  {
    key: AuditAction.GET_DASHBOARD_STATS,
    name: { en: "Get Dashboard Stats", ar: "الحصول على إحصائيات لوحة القيادة" },
  },
  {
    key: AuditAction.GENERATE_REPORT,
    name: { en: "Generate Report", ar: "إنشاء تقرير" },
  },
  {
    key: AuditAction.DOWNLOAD_REPORT,
    name: { en: "Download Report", ar: "تنزيل التقرير" },
  },
];
