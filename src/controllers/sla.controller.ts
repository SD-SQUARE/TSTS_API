import { Request, Response } from "express";
import { t } from "i18next";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import {
  deleteSlaRule,
  getSlaRuleById,
  listSlaRules,
  saveSlaRule,
} from "../services/sla.service.js";
import { Lang } from "../types/lang.types.js";

export const listSlaRulesController = async (req: Request, res: Response) => {
  const lang = (req.language || "en") as Lang;
  return res.status(ResponseStatus.SUCCESS).json({
    rules: await listSlaRules(lang),
  });
};

export const getSlaRuleController = async (req: Request, res: Response) => {
  const lang = (req.language || "en") as Lang;
  const rule = await getSlaRuleById(req.params.id, lang);
  if (!rule) {
    return res.status(ResponseStatus.NOT_FOUND).json({ message: t("sla_rule_not_found") });
  }
  return res.status(ResponseStatus.SUCCESS).json(rule);
};

export const createSlaRuleController = async (req: Request, res: Response) => {
  const saved = await saveSlaRule(req.body);
  return res.status(ResponseStatus.CREATED).json(saved);
};

export const updateSlaRuleController = async (req: Request, res: Response) => {
  const saved = await saveSlaRule(req.body, req.params.id);
  if (!saved) {
    return res.status(ResponseStatus.NOT_FOUND).json({ message: t("sla_rule_not_found") });
  }
  return res.status(ResponseStatus.SUCCESS).json(saved);
};

export const deleteSlaRuleController = async (req: Request, res: Response) => {
  const deleted = await deleteSlaRule(req.params.id);
  if (!deleted) {
    return res.status(ResponseStatus.NOT_FOUND).json({ message: t("sla_rule_not_found") });
  }
  return res.status(ResponseStatus.SUCCESS).json({ is_deleted: true });
};
