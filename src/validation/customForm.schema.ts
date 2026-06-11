import { z } from "zod";

const CUSTOM_FORM_FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "number",
  "date",
  "dropdown",
  "single_choice",
  "multiple_choice",
] as const;

const choiceFieldTypes = new Set([
  "dropdown",
  "single_choice",
  "multiple_choice",
]);

const hasText = (value?: string | null) =>
  typeof value === "string" && value.trim().length > 0;

const optionSchema = z.object({
  id: z.string().trim().min(1).max(100).optional(),
  label: z.string().trim().max(255).optional(),
  label_en: z.string().trim().max(255).nullish(),
  label_ar: z.string().trim().max(255).nullish(),
}).superRefine((option, ctx) => {
  if (!hasText(option.label) && !hasText(option.label_en) && !hasText(option.label_ar)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["label"],
      message: "Option label is required in English or Arabic",
    });
  }
});

const fieldSettingsSchema = z
  .object({
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
    minSelections: z.coerce.number().int().min(0).optional(),
    maxSelections: z.coerce.number().int().min(1).optional(),
  })
  .partial()
  .optional();

const fieldSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    type: z.enum(CUSTOM_FORM_FIELD_TYPES),
    label: z.string().trim().max(255).optional(),
    label_en: z.string().trim().max(255).nullish(),
    label_ar: z.string().trim().max(255).nullish(),
    description: z.string().trim().max(1000).nullish(),
    description_en: z.string().trim().max(1000).nullish(),
    description_ar: z.string().trim().max(1000).nullish(),
    placeholder: z.string().trim().max(255).nullish(),
    placeholder_en: z.string().trim().max(255).nullish(),
    placeholder_ar: z.string().trim().max(255).nullish(),
    required: z.coerce.boolean().optional().default(false),
    options: z.array(optionSchema).optional().default([]),
    settings: fieldSettingsSchema,
  })
  .superRefine((field, ctx) => {
    const hasChoices = choiceFieldTypes.has(field.type);

    if (!hasText(field.label) && !hasText(field.label_en) && !hasText(field.label_ar)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["label"],
        message: "Question label is required in English or Arabic",
      });
    }

    if (hasChoices && field.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "At least two options are required",
      });
    }

    if (!hasChoices && field.options.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "This field type does not support options",
      });
    }

    if (
      field.type === "multiple_choice" &&
      field.settings?.maxSelections !== undefined &&
      field.settings?.minSelections !== undefined &&
      field.settings.maxSelections < field.settings.minSelections
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["settings", "maxSelections"],
        message: "Max selections must be greater than or equal to min selections",
      });
    }

    if (
      field.type === "number" &&
      field.settings?.max !== undefined &&
      field.settings?.min !== undefined &&
      field.settings.max < field.settings.min
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["settings", "max"],
        message: "Max value must be greater than or equal to min value",
      });
    }
  });

const formSettingsSchema = z
  .object({
    submitLabel: z.string().trim().min(1).max(80).optional(),
    submitLabel_en: z.string().trim().max(80).nullish(),
    submitLabel_ar: z.string().trim().max(80).nullish(),
    successTitle: z.string().trim().min(1).max(120).optional(),
    successTitle_en: z.string().trim().max(120).nullish(),
    successTitle_ar: z.string().trim().max(120).nullish(),
    successDescription: z.string().trim().min(1).max(280).optional(),
    successDescription_en: z.string().trim().max(280).nullish(),
    successDescription_ar: z.string().trim().max(280).nullish(),
  })
  .partial()
  .optional();

const baseFormSchema = z
  .object({
    title: z.string().trim().max(255).optional(),
    title_en: z.string().trim().max(255).nullish(),
    title_ar: z.string().trim().max(255).nullish(),
    description: z.string().trim().max(2000).nullish(),
    description_en: z.string().trim().max(2000).nullish(),
    description_ar: z.string().trim().max(2000).nullish(),
    fields: z.array(fieldSchema).min(1).max(100),
    settings: formSettingsSchema,
    isGlobal: z.coerce.boolean().optional().default(false),
    ticketId: z.string().uuid().nullish(),
  })
  .superRefine((value, ctx) => {
    if (!hasText(value.title) && !hasText(value.title_en) && !hasText(value.title_ar)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "Form title is required in English or Arabic",
      });
    }

    if (value.isGlobal && value.ticketId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ticketId"],
        message: "A template form cannot be attached to a ticket",
      });
    }
  });

export const createCustomFormSchema = () => baseFormSchema;

export const updateCustomFormSchema = () => baseFormSchema.partial();

export const customFormListSchema = () =>
  z.object({
    isGlobal: z
      .union([z.literal("true"), z.literal("false")])
      .optional(),
    ticketId: z.string().uuid().optional(),
  });

export const duplicateCustomFormSchema = () =>
  z.object({
    id: z.string().uuid(),
    ticketId: z.string().uuid(),
    title: z.string().trim().min(3).max(255).optional(),
  });

export const createCustomFormShareLinkSchema = () =>
  z.object({
    id: z.string().uuid(),
    expiresInHours: z.coerce.number().int().min(1).max(24 * 30).optional(),
  });
