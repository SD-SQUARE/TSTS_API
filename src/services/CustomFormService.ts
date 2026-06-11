import ExcelJS from "exceljs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { CustomForm, FormResponse, Ticket } from "../entities/index.js";
import { AppError } from "../utils/AppError.js";

const customFormRepo = PostgresDataSource.getRepository(CustomForm);
const formResponseRepo = PostgresDataSource.getRepository(FormResponse);
const ticketRepo = PostgresDataSource.getRepository(Ticket);

const SHARE_TOKEN_SCOPE = "custom-form-share";
const SHARE_TOKEN_SECRET =
  process.env.CUSTOM_FORM_SHARE_SECRET ||
  `${process.env.JWT_SECRET || "supersecret"}:custom-form-share`;
const DEFAULT_SHARE_HOURS = 72;

const fieldTypesWithOptions = new Set([
  "dropdown",
  "single_choice",
  "multiple_choice",
]);

export class CustomFormService {
  private static normalizeOptionalString(value: any, maxLength?: number) {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    return maxLength ? trimmed.slice(0, maxLength) : trimmed;
  }

  private static normalizeLocalizedPair(
    source: any,
    baseKey: string,
    maxLength: number,
    fallback?: string,
  ) {
    const legacy = this.normalizeOptionalString(source?.[baseKey], maxLength);
    const en =
      this.normalizeOptionalString(source?.[`${baseKey}_en`], maxLength) ||
      legacy ||
      this.normalizeOptionalString(source?.[`${baseKey}_ar`], maxLength) ||
      fallback ||
      "";
    const ar =
      this.normalizeOptionalString(source?.[`${baseKey}_ar`], maxLength) ||
      legacy ||
      en ||
      fallback ||
      "";

    return {
      en,
      ar,
      value: en || ar || legacy || fallback || "",
    };
  }

  private static normalizeFormSettings(settings: any = {}) {
    const submitLabel = this.normalizeLocalizedPair(
      settings,
      "submitLabel",
      80,
      "Submit",
    );
    const successTitle = this.normalizeLocalizedPair(
      settings,
      "successTitle",
      120,
      "Response received",
    );
    const successDescription = this.normalizeLocalizedPair(
      settings,
      "successDescription",
      280,
      "Thanks for filling out this form.",
    );

    return {
      title_en: this.normalizeOptionalString(settings?.title_en, 255),
      title_ar: this.normalizeOptionalString(settings?.title_ar, 255),
      description_en: this.normalizeOptionalString(settings?.description_en, 2000),
      description_ar: this.normalizeOptionalString(settings?.description_ar, 2000),
      submitLabel: submitLabel.value,
      submitLabel_en: submitLabel.en,
      submitLabel_ar: submitLabel.ar,
      successTitle: successTitle.value,
      successTitle_en: successTitle.en,
      successTitle_ar: successTitle.ar,
      successDescription: successDescription.value,
      successDescription_en: successDescription.en,
      successDescription_ar: successDescription.ar,
    };
  }

  private static normalizeFields(fields: any[] = []) {
    return (Array.isArray(fields) ? fields : []).map((field: any, index) => {
      const fieldId = this.normalizeOptionalString(field?.id, 100) ||
        `field_${index + 1}`;
      const fieldType = this.normalizeOptionalString(field?.type, 50) ||
        "short_text";
      const rawOptions = Array.isArray(field?.options) ? field.options : [];
      const supportsOptions = fieldTypesWithOptions.has(fieldType);

      const options = supportsOptions
        ? rawOptions
            .map((option: any, optionIndex: number) => {
              if (typeof option === "string") {
              const label = this.normalizeOptionalString(option, 255);
              if (!label) return null;

              return {
                id: `${fieldId}_option_${optionIndex + 1}`,
                label,
                label_en: label,
                label_ar: label,
              };
            }

              const labelPair = this.normalizeLocalizedPair(
                {
                  label: option?.label ?? option?.value,
                  label_en: option?.label_en,
                  label_ar: option?.label_ar,
                },
                "label",
                255,
              );
              if (!labelPair.value) return null;

              return {
                id:
                  this.normalizeOptionalString(option?.id, 100) ||
                  `${fieldId}_option_${optionIndex + 1}`,
                label: labelPair.value,
                label_en: labelPair.en,
                label_ar: labelPair.ar,
              };
            })
            .filter(Boolean)
        : [];
      const labelPair = this.normalizeLocalizedPair(
        field,
        "label",
        255,
        `Question ${index + 1}`,
      );
      const descriptionPair = this.normalizeLocalizedPair(
        field,
        "description",
        1000,
      );
      const placeholderPair = this.normalizeLocalizedPair(
        field,
        "placeholder",
        255,
      );

      return {
        id: fieldId,
        type: fieldType,
        label: labelPair.value,
        label_en: labelPair.en,
        label_ar: labelPair.ar,
        description: descriptionPair.value || null,
        description_en: descriptionPair.en || null,
        description_ar: descriptionPair.ar || null,
        placeholder: placeholderPair.value || null,
        placeholder_en: placeholderPair.en || null,
        placeholder_ar: placeholderPair.ar || null,
        required: Boolean(field?.required),
        options,
        settings: {
          min:
            typeof field?.settings?.min === "number"
              ? field.settings.min
              : undefined,
          max:
            typeof field?.settings?.max === "number"
              ? field.settings.max
              : undefined,
          minSelections:
            typeof field?.settings?.minSelections === "number"
              ? field.settings.minSelections
              : undefined,
          maxSelections:
            typeof field?.settings?.maxSelections === "number"
              ? field.settings.maxSelections
              : undefined,
        },
      };
    });
  }

  private static buildDisplayName(user: any) {
    if (!user) return null;

    if (user.fullName?.en) return user.fullName.en;
    if (user.fullName?.ar) return user.fullName.ar;

    const englishName = [
      user.firstName?.en,
      user.midName?.en,
      user.lastName?.en,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (englishName) return englishName;

    const arabicName = [
      user.firstName?.ar,
      user.midName?.ar,
      user.lastName?.ar,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (arabicName) return arabicName;

    return user.email || null;
  }

  private static serializeForm(form: CustomForm) {
    const settings = this.normalizeFormSettings(form.settings);

    return {
      id: form.id,
      title: form.title,
      title_en: settings.title_en || form.title,
      title_ar: settings.title_ar || form.title,
      description: form.description || "",
      description_en: settings.description_en || form.description || "",
      description_ar: settings.description_ar || form.description || "",
      fields: this.normalizeFields(form.fields),
      settings,
      isGlobal: Boolean(form.isGlobal),
      ticketId: form.ticketId || null,
      token: form.token,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      responseCount:
        Number(
          (form as any).responseCount ??
            (form as any).responsesCount ??
            (form.responses?.length || 0),
        ) || 0,
      creator: form.creator
        ? {
            id: form.creator.id,
            email: form.creator.email,
            displayName: this.buildDisplayName(form.creator),
          }
        : null,
    };
  }

  private static async ensureTicketExists(ticketId?: string | null) {
    if (!ticketId) return null;

    const ticket = await ticketRepo.findOne({
      where: { id: ticketId },
    });

    if (!ticket) throw new AppError("Ticket not found", 404);

    return ticket;
  }

  private static async getFormEntityById(id: string) {
    const form = await customFormRepo
      .createQueryBuilder("form")
      .leftJoinAndSelect("form.creator", "creator")
      .leftJoinAndSelect("form.ticket", "ticket")
      .loadRelationCountAndMap("form.responseCount", "form.responses")
      .where("form.id = :id", { id })
      .getOne();

    if (!form) throw new AppError("Form not found", 404);

    form.fields = this.normalizeFields(form.fields);
    form.settings = this.normalizeFormSettings(form.settings);

    return form;
  }

  private static createShareToken(form: CustomForm, expiresInHours: number) {
    return jwt.sign(
      {
        scope: SHARE_TOKEN_SCOPE,
        formId: form.id,
        version: form.token,
      },
      SHARE_TOKEN_SECRET,
      {
        expiresIn: expiresInHours * 60 * 60,
      },
    );
  }

  private static verifyShareToken(token: string) {
    try {
      const payload = jwt.verify(token, SHARE_TOKEN_SECRET) as any;

      if (payload?.scope !== SHARE_TOKEN_SCOPE || !payload?.formId) {
        throw new AppError("Form not found or link expired", 404);
      }

      return payload;
    } catch (error) {
      throw new AppError("Form not found or link expired", 404);
    }
  }

  private static isEmptyAnswer(value: any) {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;

    return false;
  }

  private static validateAndNormalizeAnswer(field: any, rawValue: any) {
    if (this.isEmptyAnswer(rawValue)) {
      if (field.required) {
        throw new AppError(`${field.label} is required`, 400);
      }

      return null;
    }

    if (field.type === "short_text" || field.type === "long_text") {
      if (typeof rawValue !== "string") {
        throw new AppError(`${field.label} must be text`, 400);
      }

      return rawValue.trim();
    }

    if (field.type === "email") {
      if (typeof rawValue !== "string") {
        throw new AppError(`${field.label} must be a valid email`, 400);
      }

      const value = rawValue.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(value)) {
        throw new AppError(`${field.label} must be a valid email`, 400);
      }

      return value;
    }

    if (field.type === "number") {
      const numericValue =
        typeof rawValue === "number" ? rawValue : Number(rawValue);

      if (!Number.isFinite(numericValue)) {
        throw new AppError(`${field.label} must be a valid number`, 400);
      }

      if (
        typeof field.settings?.min === "number" &&
        numericValue < field.settings.min
      ) {
        throw new AppError(
          `${field.label} must be greater than or equal to ${field.settings.min}`,
          400,
        );
      }

      if (
        typeof field.settings?.max === "number" &&
        numericValue > field.settings.max
      ) {
        throw new AppError(
          `${field.label} must be less than or equal to ${field.settings.max}`,
          400,
        );
      }

      return numericValue;
    }

    if (field.type === "date") {
      if (typeof rawValue !== "string") {
        throw new AppError(`${field.label} must be a valid date`, 400);
      }

      const parsedDate = new Date(rawValue);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new AppError(`${field.label} must be a valid date`, 400);
      }

      return parsedDate.toISOString().slice(0, 10);
    }

    if (field.type === "dropdown" || field.type === "single_choice") {
      if (typeof rawValue !== "string") {
        throw new AppError(`${field.label} has an invalid selection`, 400);
      }

      const matchedOption = field.options.find(
        (option: any) =>
          option.id === rawValue || option.label === rawValue.trim(),
      );

      if (!matchedOption) {
        throw new AppError(`${field.label} has an invalid selection`, 400);
      }

      return matchedOption.id;
    }

    if (field.type === "multiple_choice") {
      if (!Array.isArray(rawValue)) {
        throw new AppError(`${field.label} must be a list of selections`, 400);
      }

      const normalizedValues = Array.from(
        new Set(
          rawValue
            .map((value) =>
              typeof value === "string" ? value.trim() : String(value),
            )
            .filter(Boolean),
        ),
      );

      const validOptionIds = new Set(
        field.options.map((option: any) => option.id),
      );
      const hasInvalidSelection = normalizedValues.some(
        (value) => !validOptionIds.has(value),
      );

      if (hasInvalidSelection) {
        throw new AppError(`${field.label} has an invalid selection`, 400);
      }

      if (
        typeof field.settings?.minSelections === "number" &&
        normalizedValues.length < field.settings.minSelections
      ) {
        throw new AppError(
          `${field.label} requires at least ${field.settings.minSelections} selections`,
          400,
        );
      }

      if (
        typeof field.settings?.maxSelections === "number" &&
        normalizedValues.length > field.settings.maxSelections
      ) {
        throw new AppError(
          `${field.label} allows at most ${field.settings.maxSelections} selections`,
          400,
        );
      }

      return normalizedValues;
    }

    return rawValue;
  }

  private static validateResponse(fields: any[], data: any) {
    const payload = data && typeof data === "object" ? data : {};
    const normalizedResponse: Record<string, any> = {};

    for (const field of fields) {
      normalizedResponse[field.id] = this.validateAndNormalizeAnswer(
        field,
        payload[field.id],
      );
    }

    return normalizedResponse;
  }

  private static formatAnswerForDisplay(field: any, rawValue: any) {
    if (rawValue === null || rawValue === undefined) return "";

    if (field.type === "multiple_choice") {
      const optionMap = new Map(
        field.options.map((option: any) => [option.id, option.label]),
      );

      return (Array.isArray(rawValue) ? rawValue : [])
        .map((value) => optionMap.get(value) || value)
        .join(", ");
    }

    if (field.type === "dropdown" || field.type === "single_choice") {
      const matchedOption = field.options.find(
        (option: any) => option.id === rawValue,
      );

      return matchedOption?.label || rawValue;
    }

    return rawValue;
  }

  private static buildWorksheetName(title: string) {
    const safeTitle = title
      .replace(/[\\/*?:[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return (safeTitle || "Responses").slice(0, 31);
  }

  static async createForm(data: any, creator: any) {
    const ticket = await this.ensureTicketExists(data.ticketId || null);
    const title = this.normalizeLocalizedPair(data, "title", 255, "Untitled form");
    const description = this.normalizeLocalizedPair(data, "description", 2000);

    const form = customFormRepo.create({
      title: title.value,
      description: description.value || null,
      fields: this.normalizeFields(data.fields),
      settings: this.normalizeFormSettings({
        ...(data.settings || {}),
        title_en: title.en,
        title_ar: title.ar,
        description_en: description.en,
        description_ar: description.ar,
      }),
      isGlobal: Boolean(data.isGlobal) && !ticket,
      ticketId: ticket?.id || null,
      ticket: ticket || null,
      creator: { id: creator.id } as any,
      token: uuidv4(),
    });

    const savedForm = await customFormRepo.save(form);
    return this.getFormById(savedForm.id);
  }

  static async getForms(filters: {
    isGlobal?: boolean;
    ticketId?: string;
    creatorId?: string;
  }) {
    const query = customFormRepo
      .createQueryBuilder("form")
      .leftJoinAndSelect("form.creator", "creator")
      .loadRelationCountAndMap("form.responseCount", "form.responses")
      .orderBy("form.createdAt", "DESC");

    if (filters.ticketId) {
      query.andWhere("form.ticketId = :ticketId", {
        ticketId: filters.ticketId,
      });
    } else if (filters.creatorId) {
      query.andWhere("creator.id = :creatorId", {
        creatorId: filters.creatorId,
      });
    }

    if (filters.isGlobal !== undefined) {
      query.andWhere("form.isGlobal = :isGlobal", {
        isGlobal: filters.isGlobal,
      });
    }

    const forms = await query.getMany();

    return forms.map((form) => this.serializeForm(form));
  }

  static async getFormById(id: string) {
    const form = await this.getFormEntityById(id);
    return this.serializeForm(form);
  }

  static async updateForm(id: string, data: any) {
    const form = await this.getFormEntityById(id);
    const ticket =
      data.ticketId !== undefined
        ? await this.ensureTicketExists(data.ticketId || null)
        : form.ticket || null;

    const nextSettings = {
      ...(form.settings || {}),
      ...(data.settings || {}),
    };

    if (
      data.title !== undefined ||
      data.title_en !== undefined ||
      data.title_ar !== undefined
    ) {
      const title = this.normalizeLocalizedPair(
        {
          title: data.title ?? form.title,
          title_en: data.title_en ?? form.settings?.title_en,
          title_ar: data.title_ar ?? form.settings?.title_ar,
        },
        "title",
        255,
        form.title || "Untitled form",
      );
      form.title = title.value;
      nextSettings.title_en = title.en;
      nextSettings.title_ar = title.ar;
    }

    if (
      data.description !== undefined ||
      data.description_en !== undefined ||
      data.description_ar !== undefined
    ) {
      const description = this.normalizeLocalizedPair(
        {
          description: data.description ?? form.description,
          description_en: data.description_en ?? form.settings?.description_en,
          description_ar: data.description_ar ?? form.settings?.description_ar,
        },
        "description",
        2000,
      );
      form.description = description.value || null;
      nextSettings.description_en = description.en;
      nextSettings.description_ar = description.ar;
    }

    if (data.fields !== undefined) {
      form.fields = this.normalizeFields(data.fields);
    }

    form.settings = this.normalizeFormSettings(nextSettings);

    if (data.isGlobal !== undefined) {
      form.isGlobal = Boolean(data.isGlobal) && !ticket;
    }

    if (data.ticketId !== undefined) {
      form.ticketId = ticket?.id || null;
      form.ticket = ticket || null;

      if (ticket) {
        form.isGlobal = false;
      }
    }

    const savedForm = await customFormRepo.save(form);
    return this.getFormById(savedForm.id);
  }

  static async deleteForm(id: string) {
    const form = await this.getFormEntityById(id);
    await customFormRepo.remove(form);
  }

  static async duplicateToTicket(
    sourceFormId: string,
    data: { ticketId: string; title?: string },
    creator: any,
  ) {
    const sourceForm = await this.getFormEntityById(sourceFormId);
    const ticket = await this.ensureTicketExists(data.ticketId);

    const duplicatedForm = customFormRepo.create({
      title: data.title?.trim() || sourceForm.title,
      description: sourceForm.description || null,
      fields: this.normalizeFields(sourceForm.fields),
      settings: this.normalizeFormSettings({
        ...sourceForm.settings,
        title_en: data.title?.trim() || sourceForm.settings?.title_en,
        title_ar: data.title?.trim() || sourceForm.settings?.title_ar,
      }),
      isGlobal: false,
      ticketId: ticket?.id || null,
      ticket: ticket || null,
      creator: { id: creator.id } as any,
      token: uuidv4(),
    });

    const savedForm = await customFormRepo.save(duplicatedForm);
    return this.getFormById(savedForm.id);
  }

  static async createShareLink(formId: string, expiresInHours?: number) {
    const form = await this.getFormEntityById(formId);
    const safeHours =
      typeof expiresInHours === "number" && Number.isFinite(expiresInHours)
        ? Math.max(1, Math.min(Math.floor(expiresInHours), 24 * 30))
        : DEFAULT_SHARE_HOURS;

    const token = this.createShareToken(form, safeHours);

    return {
      token,
      expiresAt: new Date(
        Date.now() + safeHours * 60 * 60 * 1000,
      ).toISOString(),
      expiresInHours: safeHours,
    };
  }

  static async getFormByShareToken(shareToken: string) {
    const payload = this.verifyShareToken(shareToken);
    const form = await this.getFormEntityById(payload.formId);

    if (form.token !== payload.version) {
      throw new AppError("Form not found or link expired", 404);
    }

    return {
      id: form.id,
      title: form.title,
      title_en: form.settings?.title_en || form.title,
      title_ar: form.settings?.title_ar || form.title,
      description: form.description || "",
      description_en: form.settings?.description_en || form.description || "",
      description_ar: form.settings?.description_ar || form.description || "",
      fields: this.normalizeFields(form.fields),
      settings: this.normalizeFormSettings(form.settings),
      ticketId: form.ticketId || null,
    };
  }

  private static async saveResponse(
    form: CustomForm,
    responseData: any,
    responder?: any,
  ) {
    const normalizedData = this.validateResponse(form.fields, responseData);

    const response = formResponseRepo.create({
      form: { id: form.id } as any,
      formId: form.id,
      data: normalizedData,
      responder: responder?.id ? ({ id: responder.id } as any) : null,
      responderId: responder?.id || null,
      ticket: form.ticketId ? ({ id: form.ticketId } as any) : null,
      ticketId: form.ticketId || null,
    });

    return formResponseRepo.save(response);
  }

  static async submitResponse(formId: string, responseData: any, responder?: any) {
    const form = await this.getFormEntityById(formId);
    return this.saveResponse(form, responseData, responder);
  }

  static async submitPublicResponse(shareToken: string, responseData: any) {
    const payload = this.verifyShareToken(shareToken);
    const form = await this.getFormEntityById(payload.formId);

    if (form.token !== payload.version) {
      throw new AppError("Form not found or link expired", 404);
    }

    return this.saveResponse(form, responseData);
  }

  static async getResponses(formId: string) {
    const form = await this.getFormEntityById(formId);
    const responses = await formResponseRepo.find({
      where: { formId },
      relations: ["responder"],
      order: { createdAt: "DESC" },
    });

    const fields = this.normalizeFields(form.fields);
    const columns = [
      { key: "responder", title: "Responder", type: "meta" },
      { key: "responderEmail", title: "Responder Email", type: "meta" },
      { key: "submittedAt", title: "Submitted At", type: "meta" },
      ...fields.map((field) => ({
        key: field.id,
        title: field.label,
        type: field.type,
      })),
    ];

    const normalizedResponses = responses.map((response) => {
      const answers = fields.reduce(
        (acc: Record<string, any>, field: any) => {
          acc[field.id] = this.formatAnswerForDisplay(
            field,
            response.data?.[field.id],
          );
          return acc;
        },
        {},
      );

      return {
        id: response.id,
        responder: this.buildDisplayName(response.responder) || "Public visitor",
        responderEmail: response.responder?.email || "",
        submittedAt: response.createdAt,
        createdAt: response.createdAt,
        answers,
        rawData: response.data || {},
      };
    });

    return {
      form: this.serializeForm(form),
      columns,
      responses: normalizedResponses,
      meta: {
        total: normalizedResponses.length,
      },
    };
  }

  static async exportResponsesWorkbook(formId: string) {
    const payload = await this.getResponses(formId);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TSTS";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(
      this.buildWorksheetName(payload.form.title),
    );

    const headers = payload.columns.map((column) => column.title);
    worksheet.addRow(headers);

    payload.responses.forEach((response) => {
      worksheet.addRow([
        response.responder,
        response.responderEmail,
        response.submittedAt,
        ...payload.form.fields.map(
          (field: any) => response.answers?.[field.id] ?? "",
        ),
      ]);
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 22;

    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };

    headers.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = Math.min(Math.max(header.length + 6, 18), 40);
    });

    return {
      workbook,
      title: payload.form.title,
    };
  }
}
