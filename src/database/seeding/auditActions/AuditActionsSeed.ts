import { AuditAction } from "../../../enums/AuditAction.enum.js";

export const auditActionsSeed = [
  {
    key: AuditAction.CREATE_ADMIN,
    name: { en: 'Create Admin', ar: 'إنشاء مسؤول' },
  },
  {
    key: AuditAction.EDIT_ADMIN,
    name: { en: 'Edit Admin', ar: 'تعديل مسؤول' },
  },
  {
    key: AuditAction.DELETE_ADMIN,
    name: { en: 'Delete Admin', ar: 'حذف مسؤول' },
  },
  {
    key: AuditAction.RETRIEVE_ADMINS,
    name: { en: 'Retrieve Admins', ar: 'استرجاع المسؤولين' },
  },
  {
    key: AuditAction.RETRIEVE_ADMIN_BY_ID,
    name: { en: 'Retrieve Admin By ID', ar: 'استرجاع مسؤول بالمعرف' },
  },
  {
    key: AuditAction.FORGOT_PASSWORD,
    name: { en: 'Forgot Password', ar: 'نسيان كلمة المرور' },
  },
  {
    key: AuditAction.VERIFY_RESET_OTP,
    name: { en: 'Verify Reset OTP', ar: 'التحقق من رمز إعادة التعيين' },
  },
  {
    key: AuditAction.RESET_PASSWORD,
    name: { en: 'Reset Password', ar: 'إعادة تعيين كلمة المرور' },
  },
  {
    key: AuditAction.USER_LOGIN,
    name: { en: 'User Login', ar: 'تسجيل دخول المستخدم' },
  },
  {
    key: AuditAction.WEBAUTHN_AUTH_OPTIONS,
    name: { en: 'WebAuthn Auth Options', ar: 'خيارات مصادقة WebAuthn' },
  },
  {
    key: AuditAction.WEBAUTHN_VERIFY,
    name: { en: 'WebAuthn Verify', ar: 'التحقق عبر WebAuthn' },
  },
  {
    key: AuditAction.CREATE_DEPARTMENT,
    name: { en: 'Create Department', ar: 'إنشاء قسم' },
  },
  {
    key: AuditAction.RETRIEVE_DEPARTMENT,
    name: { en: 'Retrieve Department', ar: 'استرجاع قسم' },
  },
  {
    key: AuditAction.UPDATE_DEPARTMENT,
    name: { en: 'Update Department', ar: 'تعديل قسم' },
  },
  {
    key: AuditAction.DELETE_DEPARTMENT,
    name: { en: 'Delete Department', ar: 'حذف قسم' },
  },
  {
    key: AuditAction.RETRIEVE_DEPARTMENT_USERS,
    name: { en: 'Retrieve Department Users', ar: 'استرجاع مستخدمي القسم' },
  },
  {
    key: AuditAction.RETRIEVE_DOMAINS,
    name: { en: 'Retrieve Domains', ar: 'استرجاع النطاقات' },
  },
  {
    key: AuditAction.CREATE_DOMAIN,
    name: { en: 'Create Domain', ar: 'إنشاء نطاق' },
  },
  {
    key: AuditAction.RETRIEVE_DOMAIN_BY_ID,
    name: { en: 'Retrieve Domain By ID', ar: 'استرجاع نطاق بالمعرف' },
  },
  {
    key: AuditAction.UPDATE_DOMAIN,
    name: { en: 'Update Domain', ar: 'تعديل نطاق' },
  },
  {
    key: AuditAction.DELETE_DOMAIN,
    name: { en: 'Delete Domain', ar: 'حذف نطاق' },
  },
  {
    key: AuditAction.TOKEN_GENERATION,
    name: { en: 'Token Generation', ar: 'إنشاء رمز المصادقة' },
  },
];
