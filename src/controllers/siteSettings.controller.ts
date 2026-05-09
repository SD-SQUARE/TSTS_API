import { Request, Response } from "express";
import { t } from "i18next";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import {
  createAllowedEmailDomain,
  deleteAllowedEmailDomain,
  getOrCreateSiteSettings,
  listAllowedEmailDomains,
  mapSiteSettingsDto,
  updateAllowedEmailDomain,
  updateSiteLogo,
  updateSiteSettings,
} from "../services/site-settings.service.js";

export const getSiteSettingsController = async (_req: Request, res: Response) => {
  const settings = await getOrCreateSiteSettings();
  return res.status(ResponseStatus.SUCCESS).json(await mapSiteSettingsDto(settings));
};

export const updateSiteSettingsController = async (req: Request, res: Response) => {
  const minutes = Number(req.body?.unassignedTicketAlertMinutes);
  const settings = await updateSiteSettings({
    unassignedTicketAlertMinutes: Number.isFinite(minutes) ? minutes : undefined,
  });

  return res.status(ResponseStatus.SUCCESS).json(await mapSiteSettingsDto(settings));
};

export const updateSiteLogoController = async (req: Request, res: Response) => {
  if (!req.file) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t ? req.t("file_required") : "File is required" });
  }

  const settings = await updateSiteLogo(req.file);
  return res.status(ResponseStatus.SUCCESS).json(await mapSiteSettingsDto(settings));
};

export const listAllowedEmailDomainsController = async (_req: Request, res: Response) => {
  return res.status(ResponseStatus.SUCCESS).json({
    domains: await listAllowedEmailDomains(),
  });
};

export const createAllowedEmailDomainController = async (
  req: Request,
  res: Response,
) => {
  const domain = typeof req.body?.domain === "string" ? req.body.domain : "";
  if (!domain.trim()) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("email_domain_required") });
  }

  const saved = await createAllowedEmailDomain(domain);
  return res.status(ResponseStatus.CREATED).json(saved);
};

export const updateAllowedEmailDomainController = async (
  req: Request,
  res: Response,
) => {
  const domain = typeof req.body?.domain === "string" ? req.body.domain : "";
  if (!domain.trim()) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("email_domain_required") });
  }

  const saved = await updateAllowedEmailDomain(req.params.id, domain);
  if (!saved) {
    return res
      .status(ResponseStatus.NOT_FOUND)
      .json({ message: t("email_domain_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json(saved);
};

export const deleteAllowedEmailDomainController = async (
  req: Request,
  res: Response,
) => {
  const deleted = await deleteAllowedEmailDomain(req.params.id);
  if (!deleted) {
    return res
      .status(ResponseStatus.NOT_FOUND)
      .json({ message: t("email_domain_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json({ is_deleted: true });
};
