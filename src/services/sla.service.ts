import { IsNull } from "typeorm";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Domain, Problem, SlaRule, Specialization, Ticket, University } from "../entities/index.js";
import { Lang } from "../types/lang.types.js";

const slaRuleRepo = PostgresDataSource.getRepository(SlaRule);

const getLocalizedName = (entity: any, lang: Lang) =>
  entity?.name?.[lang] || entity?.name?.en || entity?.name?.ar || "";

const resolveRelation = async <T>(value: Promise<T> | T | null | undefined) =>
  value ? await Promise.resolve(value) : null;

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

  return slaRuleRepo.save(rule);
};

export const deleteSlaRule = async (id: string) => {
  const rule = await slaRuleRepo.findOne({ where: { id } });
  if (!rule) return false;

  await slaRuleRepo.softRemove(rule);
  return true;
};

export const getTicketSlaState = async (ticket: Ticket, lang: Lang) => {
  const rules = await slaRuleRepo.find({
    where: { isActive: true, deletedAt: IsNull() },
    relations: ["university", "domain", "specialization", "problem"],
  } as any);

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
    const ruleUniversity = await resolveRelation<University>(rule.university);
    const ruleDomain = await resolveRelation<Domain>(rule.domain);
    const ruleSpecialization = await resolveRelation<Specialization>(rule.specialization);
    const ruleProblem = await resolveRelation<Problem>(rule.problem);

    if (ruleUniversity && ruleUniversity.id !== requesterUniversity?.id) continue;
    if (ruleDomain && ruleDomain.id !== requesterDomain?.id) continue;
    if (ruleSpecialization && ruleSpecialization.id !== specialization?.id) continue;
    if (ruleProblem && ruleProblem.id !== problem?.id) continue;

    const specificity = [
      ruleUniversity,
      ruleDomain,
      ruleSpecialization,
      ruleProblem,
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
