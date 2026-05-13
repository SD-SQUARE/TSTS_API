import { IsNull } from "typeorm";
import { redisClient } from "../database/redis.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Domain, Problem, SlaRule, Specialization, Ticket, University } from "../entities/index.js";
import { Lang } from "../types/lang.types.js";
import { redisKeys } from "../utils/redisKeys.js";
import logger from "../utils/logger.js";
import {
  invalidateTicketAnalyticsCache,
  readJsonCache,
  writeJsonCache,
} from "./tickets/ticket-cache.service.js";

const slaRuleRepo = PostgresDataSource.getRepository(SlaRule);
const ACTIVE_SLA_RULES_TTL_SECONDS = 300;

type SlaRuleSnapshot = {
  id: string;
  name?: { en?: string; ar?: string };
  maxHours: number;
  universityId: string | null;
  domainId: string | null;
  specializationId: string | null;
  problemId: string | null;
};

const getLocalizedName = (entity: any, lang: Lang) =>
  entity?.name?.[lang] || entity?.name?.en || entity?.name?.ar || "";

const resolveRelation = async <T>(value: Promise<T> | T | null | undefined) =>
  value ? await Promise.resolve(value) : null;

const getRelationId = async (value: Promise<any> | any | null | undefined) => {
  const relation = await resolveRelation<any>(value);
  return relation?.id || null;
};

const mapRuleSnapshot = async (rule: SlaRule): Promise<SlaRuleSnapshot> => ({
  id: rule.id,
  name: rule.name,
  maxHours: rule.maxHours,
  universityId: await getRelationId(rule.university),
  domainId: await getRelationId(rule.domain),
  specializationId: await getRelationId(rule.specialization),
  problemId: await getRelationId(rule.problem),
});

export const invalidateSlaCache = async () => {
  if (redisClient.isOpen) {
    try {
      // Invalidate SLA rules cache
      await redisClient.del(redisKeys.activeSlaRules);
      
      // Invalidate all ticket analytics caches since SLA affects ticket states
      await invalidateTicketAnalyticsCache();
      
      logger.info("[cache] SLA cache and ticket analytics invalidated");
    } catch (error) {
      logger.warn("[cache] failed to invalidate sla cache", {
        error: (error as Error).message,
      });
    }
  }
};

export const getActiveSlaRuleSnapshots = async () => {
  const cached = await readJsonCache<SlaRuleSnapshot[]>(redisKeys.activeSlaRules);
  if (cached) {
    return cached;
  }

  const rules = await slaRuleRepo.find({
    where: { isActive: true, deletedAt: IsNull() },
    relations: ["university", "domain", "specialization", "problem"],
  } as any);

  const snapshots = await Promise.all(rules.map(mapRuleSnapshot));
  await writeJsonCache(
    redisKeys.activeSlaRules,
    snapshots,
    ACTIVE_SLA_RULES_TTL_SECONDS,
  );

  return snapshots;
};

const mapRule = async (rule: SlaRule, lang: Lang) => {
  const university = await resolveRelation<University>(rule.university);
  const domain = await resolveRelation<Domain>(rule.domain);
  const specialization = await resolveRelation<Specialization>(rule.specialization);
  const problem = await resolveRelation<Problem>(rule.problem);

  return {
    id: rule.id,
    name_en: rule.name?.en || "",
    name_ar: rule.name?.ar || "",
    name: rule.name?.[lang] || rule.name?.en || rule.name?.ar || "",
    maxHours: rule.maxHours,
    isActive: rule.isActive,
    university: university
      ? { id: university.id, name: getLocalizedName(university, lang) }
      : null,
    domain: domain ? { id: domain.id, name: getLocalizedName(domain, lang) } : null,
    specialization: specialization
      ? { id: specialization.id, name: getLocalizedName(specialization, lang) }
      : null,
    problem: problem ? { id: problem.id, name: getLocalizedName(problem, lang) } : null,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
};

export const listSlaRules = async (lang: Lang) => {
  const rules = await slaRuleRepo.find({
    where: { deletedAt: IsNull() },
    relations: ["university", "domain", "specialization", "problem"],
    order: { updatedAt: "DESC" },
  } as any);

  return Promise.all(rules.map((rule) => mapRule(rule, lang)));
};

export const getSlaRuleById = async (id: string, lang: Lang) => {
  const rule = await slaRuleRepo.findOne({
    where: { id },
    relations: ["university", "domain", "specialization", "problem"],
  } as any);

  return rule ? mapRule(rule, lang) : null;
};

export const saveSlaRule = async (
  payload: {
    name_en?: string;
    name_ar?: string;
    university?: string | null;
    domain?: string | null;
    specialization?: string | null;
    problem?: string | null;
    maxHours?: number;
    isActive?: boolean;
  },
  id?: string,
) => {
  const rule = id
    ? await slaRuleRepo.findOne({ where: { id } })
    : slaRuleRepo.create();

  if (!rule) {
    return null;
  }

  rule.name = {
    en: payload.name_en?.trim() || payload.name_ar?.trim() || "SLA Rule",
    ar: payload.name_ar?.trim() || payload.name_en?.trim() || "SLA Rule",
  };
  rule.maxHours = Math.max(1, Math.floor(Number(payload.maxHours) || 1));
  rule.isActive = payload.isActive !== false;
  rule.university = payload.university ? ({ id: payload.university } as any) : null;
  rule.domain = payload.domain ? ({ id: payload.domain } as any) : null;
  rule.specialization = payload.specialization
    ? ({ id: payload.specialization } as any)
    : null;
  rule.problem = payload.problem ? ({ id: payload.problem } as any) : null;

  const saved = await slaRuleRepo.save(rule);
  await invalidateSlaCache();

  return saved;
};

export const deleteSlaRule = async (id: string) => {
  const rule = await slaRuleRepo.findOne({ where: { id } });
  if (!rule) return false;

  await slaRuleRepo.softRemove(rule);
  await invalidateSlaCache();
  return true;
};

export const getTicketSlaStateFromRules = async (
  ticket: Ticket,
  lang: Lang,
  rules: SlaRuleSnapshot[],
) => {
  if (!rules.length || !ticket.createdAt) {
    return { violated: false };
  }

  const requester = ticket.requester ? await Promise.resolve(ticket.requester) : null;
  const requesterUniversity = requester ? await resolveRelation<University>(requester.university) : null;
  const requesterDomain = requester ? await resolveRelation<Domain>(requester.domain) : null;
  const specialization = await resolveRelation<Specialization>(ticket.specialization);
  const problem = await resolveRelation<Problem>(ticket.problem);
  const ageHours = (Date.now() - new Date(ticket.createdAt).getTime()) / 36e5;

  const matches = [];
  for (const rule of rules) {
    if (rule.universityId && rule.universityId !== requesterUniversity?.id) continue;
    if (rule.domainId && rule.domainId !== requesterDomain?.id) continue;
    if (rule.specializationId && rule.specializationId !== specialization?.id) continue;
    if (rule.problemId && rule.problemId !== problem?.id) continue;

    const specificity = [
      rule.universityId,
      rule.domainId,
      rule.specializationId,
      rule.problemId,
    ].filter(Boolean).length;

    matches.push({ rule, specificity });
  }

  matches.sort((a, b) => b.specificity - a.specificity || a.rule.maxHours - b.rule.maxHours);
  const match = matches[0];

  if (!match) {
    return { violated: false, ageHours: Number(ageHours.toFixed(2)) };
  }

  return {
    violated: ageHours > match.rule.maxHours,
    ageHours: Number(ageHours.toFixed(2)),
    maxHours: match.rule.maxHours,
    ruleId: match.rule.id,
    ruleName: match.rule.name?.[lang] || match.rule.name?.en || match.rule.name?.ar || "",
  };
};

export const getTicketSlaState = async (ticket: Ticket, lang: Lang) => {
  const rules = await getActiveSlaRuleSnapshots();
  return getTicketSlaStateFromRules(ticket, lang, rules);
};
