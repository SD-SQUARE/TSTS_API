import { Request, Response } from "express";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { KnowledgeItem } from "../entities/KnowledgeItem.js";
import { Media } from "../entities/Media.js";
import { Ticket } from "../entities/Ticket.js";
import {
  TicketFinalReport,
  TicketFinalReportKnowledgeDraft,
} from "../entities/TicketFinalReport.js";
import { TicketFinalReportHistory } from "../entities/TicketFinalReportHistory.js";
import { User } from "../entities/User.js";
import { getFullNameByLang } from "../helpers/UserPersonalData.helper.js";
import { uploadFilesWithUniqueKey } from "../helpers/ImagesHelper.js";
import { ITicketAssetDto } from "../interfaces/ticket-media/ITicketAssetDto.js";
import { Lang } from "../types/lang.types.js";
import { getPresignedUrl } from "../utils/storage.js";
import logger from "../utils/logger.js";
import { uuidValidationSchema } from "../validation/shared/uuidSchema.js";
import { uploadTicketMediaSchema } from "../validation/tickets/media/upload-ticket-media-schema.js";
import { IMAGE_PATHS } from "../constants/imagePathes.js";

type FinalReportPayload = {
  title_en?: string | null;
  title_ar?: string | null;
  content_en?: string | null;
  content_ar?: string | null;
  knowledgeDraft?: TicketFinalReportKnowledgeDraft | null;
};

const reportRepo = PostgresDataSource.getRepository(TicketFinalReport);
const historyRepo = PostgresDataSource.getRepository(TicketFinalReportHistory);
const ticketRepo = PostgresDataSource.getRepository(Ticket);
const mediaRepo = PostgresDataSource.getRepository(Media);
const knowledgeRepo = PostgresDataSource.getRepository(KnowledgeItem);

const trimMaybe = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const stripHtml = (value?: string | null) =>
  (value || "")
    .replace(/<(.|\n)*?>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const summarizeContent = (value?: string | null, maxLength = 180) => {
  const stripped = stripHtml(value);
  if (!stripped) {
    return undefined;
  }

  if (stripped.length <= maxLength) {
    return stripped;
  }

  return `${stripped.slice(0, maxLength).trim()}...`;
};

const sanitizeKnowledgeDraft = (value: unknown): TicketFinalReportKnowledgeDraft | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const draft = value as Record<string, unknown>;

  const normalized: TicketFinalReportKnowledgeDraft = {
    title_en: trimMaybe(draft.title_en),
    title_ar: trimMaybe(draft.title_ar),
    description_en: trimMaybe(draft.description_en),
    description_ar: trimMaybe(draft.description_ar),
    specialization_en: trimMaybe(draft.specialization_en),
    specialization_ar: trimMaybe(draft.specialization_ar),
    content_en: trimMaybe(draft.content_en),
    content_ar: trimMaybe(draft.content_ar),
  };

  if (Object.values(normalized).every((item) => item === undefined)) {
    return undefined;
  }

  return normalized;
};

const extractFinalReportPayload = (body: Record<string, unknown>): FinalReportPayload => ({
  title_en: trimMaybe(body.title_en),
  title_ar: trimMaybe(body.title_ar),
  content_en: trimMaybe(body.content_en),
  content_ar: trimMaybe(body.content_ar),
  knowledgeDraft: sanitizeKnowledgeDraft(body.knowledgeDraft) ?? undefined,
});

const getUserDisplayName = (user: User | null | undefined, lang: Lang) => {
  if (!user) {
    return "";
  }

  return (
    getFullNameByLang(user, lang) ||
    getFullNameByLang(user, lang === "ar" ? "en" : "ar") ||
    user.email
  );
};

const buildUserSearchWhereClause = (alias: string, parameterName: string) => `(
  COALESCE("${alias}"."email", '') ILIKE :${parameterName}
  OR COALESCE("${alias}"."fullName"->>'en', '') ILIKE :${parameterName}
  OR COALESCE("${alias}"."fullName"->>'ar', '') ILIKE :${parameterName}
  OR CONCAT_WS(
    ' ',
    NULLIF(COALESCE("${alias}"."firstName"->>'en', ''), ''),
    NULLIF(COALESCE("${alias}"."midName"->>'en', ''), ''),
    NULLIF(COALESCE("${alias}"."lastName"->>'en', ''), '')
  ) ILIKE :${parameterName}
  OR CONCAT_WS(
    ' ',
    NULLIF(COALESCE("${alias}"."firstName"->>'ar', ''), ''),
    NULLIF(COALESCE("${alias}"."midName"->>'ar', ''), ''),
    NULLIF(COALESCE("${alias}"."lastName"->>'ar', ''), '')
  ) ILIKE :${parameterName}
)`;

const buildDefaultKnowledgeDraft = (report: TicketFinalReport) => {
  const ticketSpecialization = (report.ticket as any)?.specialization;
  const specializationEn =
    report.knowledgeDraft?.specialization_en ||
    ticketSpecialization?.name?.en ||
    "";
  const specializationAr =
    report.knowledgeDraft?.specialization_ar ||
    ticketSpecialization?.name?.ar ||
    "";

  const titleEn =
    report.knowledgeDraft?.title_en ||
    report.title_en ||
    report.title_ar ||
    (report.ticket as any)?.title ||
    "";
  const titleAr =
    report.knowledgeDraft?.title_ar ||
    report.title_ar ||
    report.title_en ||
    (report.ticket as any)?.title ||
    "";

  const contentEn =
    report.knowledgeDraft?.content_en ||
    report.content_en ||
    report.content_ar ||
    (report.ticket as any)?.description ||
    "";
  const contentAr =
    report.knowledgeDraft?.content_ar ||
    report.content_ar ||
    report.content_en ||
    (report.ticket as any)?.description ||
    "";

  return {
    title_en: titleEn,
    title_ar: titleAr,
    description_en:
      report.knowledgeDraft?.description_en ||
      summarizeContent(contentEn) ||
      summarizeContent((report.ticket as any)?.description) ||
      "",
    description_ar:
      report.knowledgeDraft?.description_ar ||
      summarizeContent(contentAr) ||
      summarizeContent((report.ticket as any)?.description) ||
      "",
    specialization_en: specializationEn,
    specialization_ar: specializationAr,
    content_en: contentEn,
    content_ar: contentAr,
  } satisfies TicketFinalReportKnowledgeDraft;
};

const mapAttachment = async (media: Media): Promise<ITicketAssetDto> => ({
  id: media.id,
  fileName: media.name,
  mime: media.mime ?? null,
  url: await getPresignedUrl(process.env.MINIO_BUCKET, media.url, 3600),
});

const mapFinalReportResponse = async (
  report: TicketFinalReport,
  lang: Lang,
) => {
  const attachments = await Promise.all((report.attachments || []).map(mapAttachment));
  const knowledgeDraft = buildDefaultKnowledgeDraft(report);

  return {
    id: report.id,
    ticketId: (report.ticket as any)?.id,
    ticketNumber: (report.ticket as any)?.ticket_number ?? null,
    ticketTitle: (report.ticket as any)?.title ?? "",
    author: report.author
      ? {
          id: report.author.id,
          name: getUserDisplayName(report.author, lang),
        }
      : null,
    title_en: report.title_en ?? "",
    title_ar: report.title_ar ?? "",
    content_en: report.content_en ?? "",
    content_ar: report.content_ar ?? "",
    knowledgeDraft,
    attachments,
    publishedKnowledgeItemId: report.publishedKnowledgeItemId ?? null,
    publishedAt: report.publishedAt?.toISOString?.() ?? null,
    createdAt: report.createdAt?.toISOString?.() ?? null,
    updatedAt: report.updatedAt?.toISOString?.() ?? null,
  };
};

const recordHistory = async (
  report: TicketFinalReport,
  actorId: string | undefined,
  action: string,
  payload?: Record<string, unknown>,
) => {
  const entry = historyRepo.create({
    report,
    actor: actorId ? ({ id: actorId } as User) : null,
    action,
    payload: payload ?? null,
  });

  await historyRepo.save(entry);
};

const findReportByTicketId = async (ticketId: string) =>
  reportRepo.findOne({
    where: {
      ticket: { id: ticketId } as Ticket,
    } as any,
    relations: {
      ticket: {
        specialization: true,
      },
      author: true,
      attachments: true,
    } as any,
  });

const findReportById = async (reportId: string) =>
  reportRepo.findOne({
    where: { id: reportId },
    relations: {
      ticket: {
        specialization: true,
      },
      author: true,
      attachments: true,
    } as any,
  });

const ensureTicketExists = async (ticketId: string) =>
  ticketRepo.findOne({
    where: { id: ticketId },
    relations: {
      specialization: true,
    } as any,
  });

const ensureReportForTicket = async (ticketId: string, actorId?: string) => {
  const existing = await findReportByTicketId(ticketId);
  if (existing) {
    return existing;
  }

  const ticket = await ensureTicketExists(ticketId);
  if (!ticket || !actorId) {
    return null;
  }

  const created = reportRepo.create({
    ticket,
    author: { id: actorId } as User,
  });
  const saved = await reportRepo.save(created);
  return findReportById(saved.id);
};

const saveReportPayload = async (
  report: TicketFinalReport,
  payload: FinalReportPayload,
  actorId?: string,
) => {
  if (payload.title_en !== undefined) {
    report.title_en = payload.title_en ?? null;
  }
  if (payload.title_ar !== undefined) {
    report.title_ar = payload.title_ar ?? null;
  }
  if (payload.content_en !== undefined) {
    report.content_en = payload.content_en ?? null;
  }
  if (payload.content_ar !== undefined) {
    report.content_ar = payload.content_ar ?? null;
  }
  if (payload.knowledgeDraft !== undefined) {
    report.knowledgeDraft = payload.knowledgeDraft ?? null;
  }
  if (actorId) {
    report.author = { id: actorId } as User;
  }

  return reportRepo.save(report);
};

const parsePositiveInt = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const getTicketFinalReportController = async (req: any, res: Response) => {
  const ticketId = req.params.id;
  const lang = (req.language || "en") as Lang;
  const isValid = uuidValidationSchema.safeParse(ticketId);

  if (!ticketId || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("ticket.invalid_id") });
  }

  const report = await findReportByTicketId(ticketId);
  if (!report) {
    return res.status(ResponseStatus.SUCCESS).json(null);
  }

  return res.status(ResponseStatus.SUCCESS).json(await mapFinalReportResponse(report, lang));
};

export const upsertTicketFinalReportController = async (req: any, res: Response) => {
  const ticketId = req.params.id;
  const lang = (req.language || "en") as Lang;
  const actorId = req.user?.id as string | undefined;
  const isValid = uuidValidationSchema.safeParse(ticketId);

  if (!ticketId || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("ticket.invalid_id") });
  }

  const payload = extractFinalReportPayload(req.body || {});
  let report = await ensureReportForTicket(ticketId, actorId);

  if (!report) {
    return res
      .status(ResponseStatus.NOT_FOUND)
      .json({ message: "Ticket not found." });
  }

  const action = report.title_en || report.title_ar || report.content_en || report.content_ar
    ? "updated"
    : "created";

  report = await saveReportPayload(report, payload, actorId);
  await recordHistory(report, actorId, action, {
    title_en: report.title_en,
    title_ar: report.title_ar,
    has_content_en: Boolean(report.content_en),
    has_content_ar: Boolean(report.content_ar),
    has_knowledge_draft: Boolean(report.knowledgeDraft),
  });

  const fresh = await findReportById(report.id);
  return res
    .status(action === "created" ? ResponseStatus.CREATED : ResponseStatus.SUCCESS)
    .json(await mapFinalReportResponse(fresh as TicketFinalReport, lang));
};

export const uploadTicketFinalReportMediaController = async (
  req: any,
  res: Response,
) => {
  const ticketId = req.params.id;
  const actorId = req.user?.id as string | undefined;
  const lang = (req.language || "en") as Lang;
  const isValid = uuidValidationSchema.safeParse(ticketId);

  if (!ticketId || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("ticket.invalid_id") });
  }

  const validation = uploadTicketMediaSchema.safeParse({
    files: req.files,
  });

  if (!validation.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("ticket.at_least_one_file_required") });
  }

  const report = await ensureReportForTicket(ticketId, actorId);
  if (!report) {
    return res
      .status(ResponseStatus.NOT_FOUND)
      .json({ message: "Ticket not found." });
  }

  const files = Array.isArray(req.files) ? req.files : [];
  const savedMedia = await Promise.all(
    files.map(async (file: any) => {
      const safeKey = await uploadFilesWithUniqueKey(
        IMAGE_PATHS.FinalReportMedia,
        report.id,
        file,
      );

      const media = mediaRepo.create({
        name: file.originalname,
        mime: file.mimetype || null,
        url: safeKey,
        finalReport: report,
      });

      return mediaRepo.save(media);
    }),
  );

  await recordHistory(report, actorId, "attachments_uploaded", {
    count: savedMedia.length,
    files: savedMedia.map((item) => item.name),
  });

  const response = await Promise.all(savedMedia.map(mapAttachment));
  logger.info("[server][ticket-final-report] attachments uploaded", {
    reportId: report.id,
    ticketId,
    count: response.length,
  });

  return res.status(ResponseStatus.SUCCESS).json(response);
};

export const listFinalReportsController = async (req: any, res: Response) => {
  const lang = (req.language || "en") as Lang;
  const title = typeof req.query.title === "string" ? req.query.title.trim() : "";
  const author = typeof req.query.author === "string" ? req.query.author.trim() : "";
  const startDate =
    typeof req.query.startDate === "string" ? req.query.startDate : undefined;
  const endDate =
    typeof req.query.endDate === "string" ? req.query.endDate : undefined;
  const page = parsePositiveInt(req.query.page) || 1;
  const limit = parsePositiveInt(req.query.limit) || 10;

  const qb = reportRepo
    .createQueryBuilder("report")
    .leftJoinAndSelect("report.ticket", "ticket")
    .leftJoinAndSelect("ticket.specialization", "specialization")
    .leftJoinAndSelect("report.author", "author")
    .where("report.deletedAt IS NULL");

  if (title) {
    qb.andWhere(
      `(
        report.title_en ILIKE :title
        OR report.title_ar ILIKE :title
        OR ticket.title ILIKE :title
      )`,
      { title: `%${title}%` },
    );
  }

  if (author) {
    qb.andWhere(buildUserSearchWhereClause("author", "author"), {
      author: `%${author}%`,
    });
  }

  if (startDate) {
    qb.andWhere("report.createdAt >= :startDate", { startDate });
  }
  if (endDate) {
    qb.andWhere("report.createdAt <= :endDate", { endDate: `${endDate}T23:59:59.999Z` });
  }

  qb.orderBy("report.updatedAt", "DESC")
    .skip((page - 1) * limit)
    .take(limit);

  const [reports, total] = await qb.getManyAndCount();
  const items = await Promise.all(reports.map((report) => mapFinalReportResponse(report, lang)));

  return res.status(ResponseStatus.SUCCESS).json({
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};

export const getFinalReportByIdController = async (req: any, res: Response) => {
  const reportId = req.params.reportId;
  const lang = (req.language || "en") as Lang;
  const isValid = uuidValidationSchema.safeParse(reportId);

  if (!reportId || !isValid.success) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: "Invalid final report id.",
    });
  }

  const report = await findReportById(reportId);
  if (!report) {
    return res.status(ResponseStatus.NOT_FOUND).json({
      message: "Final report not found.",
    });
  }

  return res.status(ResponseStatus.SUCCESS).json(await mapFinalReportResponse(report, lang));
};

export const updateFinalReportByIdController = async (req: any, res: Response) => {
  const reportId = req.params.reportId;
  const lang = (req.language || "en") as Lang;
  const actorId = req.user?.id as string | undefined;
  const isValid = uuidValidationSchema.safeParse(reportId);

  if (!reportId || !isValid.success) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: "Invalid final report id.",
    });
  }

  const report = await findReportById(reportId);
  if (!report) {
    return res.status(ResponseStatus.NOT_FOUND).json({
      message: "Final report not found.",
    });
  }

  const payload = extractFinalReportPayload(req.body || {});
  const saved = await saveReportPayload(report, payload, actorId);
  await recordHistory(saved, actorId, "draft_updated", {
    has_knowledge_draft: Boolean(saved.knowledgeDraft),
  });

  const fresh = await findReportById(saved.id);
  return res.status(ResponseStatus.SUCCESS).json(await mapFinalReportResponse(fresh as TicketFinalReport, lang));
};

export const getFinalReportHistoryController = async (req: any, res: Response) => {
  const reportId = req.params.reportId;
  const lang = (req.language || "en") as Lang;
  const actor = typeof req.query.actor === "string" ? req.query.actor.trim() : "";
  const startDate =
    typeof req.query.startDate === "string" ? req.query.startDate : undefined;
  const endDate =
    typeof req.query.endDate === "string" ? req.query.endDate : undefined;
  const isValid = uuidValidationSchema.safeParse(reportId);

  if (!reportId || !isValid.success) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: "Invalid final report id.",
    });
  }

  const qb = historyRepo
    .createQueryBuilder("history")
    .leftJoinAndSelect("history.actor", "actor")
    .leftJoinAndSelect("history.report", "report")
    .where("report.id = :reportId", { reportId })
    .andWhere("history.deletedAt IS NULL");

  if (actor) {
    qb.andWhere(buildUserSearchWhereClause("actor", "actor"), {
      actor: `%${actor}%`,
    });
  }

  if (startDate) {
    qb.andWhere("history.createdAt >= :startDate", { startDate });
  }
  if (endDate) {
    qb.andWhere("history.createdAt <= :endDate", {
      endDate: `${endDate}T23:59:59.999Z`,
    });
  }

  qb.orderBy("history.createdAt", "DESC");

  const items = await qb.getMany();

  return res.status(ResponseStatus.SUCCESS).json(
    items.map((item) => ({
      id: item.id,
      action: item.action,
      actor: item.actor
        ? {
            id: item.actor.id,
            name: getUserDisplayName(item.actor, lang),
          }
        : null,
      payload: item.payload ?? null,
      createdAt: item.createdAt?.toISOString?.() ?? null,
    })),
  );
};

export const generateKnowledgeDraftFromReportController = async (
  req: any,
  res: Response,
) => {
  const reportId = req.params.reportId;
  const lang = (req.language || "en") as Lang;
  const actorId = req.user?.id as string | undefined;
  const isValid = uuidValidationSchema.safeParse(reportId);

  if (!reportId || !isValid.success) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: "Invalid final report id.",
    });
  }

  const report = await findReportById(reportId);
  if (!report) {
    return res.status(ResponseStatus.NOT_FOUND).json({
      message: "Final report not found.",
    });
  }

  report.knowledgeDraft = buildDefaultKnowledgeDraft(report);
  const saved = await reportRepo.save(report);

  await recordHistory(saved, actorId, "ai_generated", {
    knowledgeDraft: saved.knowledgeDraft,
  });

  const fresh = await findReportById(saved.id);
  return res.status(ResponseStatus.SUCCESS).json(await mapFinalReportResponse(fresh as TicketFinalReport, lang));
};

export const publishFinalReportController = async (req: any, res: Response) => {
  const reportId = req.params.reportId;
  const actorId = req.user?.id as string | undefined;
  const isValid = uuidValidationSchema.safeParse(reportId);

  if (!reportId || !isValid.success) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: "Invalid final report id.",
    });
  }

  const report = await findReportById(reportId);
  if (!report) {
    return res.status(ResponseStatus.NOT_FOUND).json({
      message: "Final report not found.",
    });
  }

  const draft = buildDefaultKnowledgeDraft(report);

  if (
    !draft.title_en ||
    !draft.title_ar ||
    !draft.description_en ||
    !draft.description_ar ||
    !draft.specialization_en ||
    !draft.specialization_ar
  ) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message:
        "Knowledge draft needs bilingual title, summary, and specialization before publishing.",
    });
  }

  const duplicate = await knowledgeRepo
    .createQueryBuilder("item")
    .where("item.deletedAt IS NULL")
    .andWhere("item.id != :id", { id: report.publishedKnowledgeItemId || "00000000-0000-0000-0000-000000000000" })
    .andWhere("(item.title_en = :titleEn OR item.title_ar = :titleAr)", {
      titleEn: draft.title_en,
      titleAr: draft.title_ar,
    })
    .getOne();

  if (duplicate) {
    return res.status(ResponseStatus.CONFLICT).json({
      message: "A knowledge item with one of these titles already exists.",
    });
  }

  let knowledgeItem = report.publishedKnowledgeItemId
    ? await knowledgeRepo.findOne({
        where: { id: report.publishedKnowledgeItemId },
      })
    : null;

  if (!knowledgeItem) {
    knowledgeItem = knowledgeRepo.create();
  }

  knowledgeItem.title_en = draft.title_en;
  knowledgeItem.title_ar = draft.title_ar;
  knowledgeItem.description_en = draft.description_en;
  knowledgeItem.description_ar = draft.description_ar;
  knowledgeItem.specialization_en = draft.specialization_en;
  knowledgeItem.specialization_ar = draft.specialization_ar;
  knowledgeItem.content_en = draft.content_en || report.content_en || "";
  knowledgeItem.content_ar = draft.content_ar || report.content_ar || "";

  const savedKnowledgeItem = await knowledgeRepo.save(knowledgeItem);

  report.publishedKnowledgeItemId = savedKnowledgeItem.id;
  report.publishedAt = new Date();
  report.knowledgeDraft = draft;
  await reportRepo.save(report);

  await recordHistory(report, actorId, "published", {
    knowledgeItemId: savedKnowledgeItem.id,
  });

  return res.status(ResponseStatus.SUCCESS).json({
    knowledgeItemId: savedKnowledgeItem.id,
    publishedAt: report.publishedAt.toISOString(),
  });
};
