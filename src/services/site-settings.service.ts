import { ILike, IsNull } from "typeorm";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { AllowedEmailDomain } from "../entities/AllowedEmailDomain.js";
import { SiteSetting } from "../entities/SiteSetting.js";
import { uploadFilesWithUniqueKey } from "../helpers/ImagesHelper.js";
import { getPresignedUrl } from "../utils/storage.js";

const siteSettingRepo = PostgresDataSource.getRepository(SiteSetting);
const emailDomainRepo = PostgresDataSource.getRepository(AllowedEmailDomain);

const normalizeDomain = (value: string) =>
    value.trim().toLowerCase().replace(/^@+/, "");

export const getOrCreateSiteSettings = async () => {
    let settings = await siteSettingRepo.findOne({
        where: { deletedAt: IsNull() },
        order: { createdAt: "ASC" },
    });

    if (!settings) {
        settings = await siteSettingRepo.save(
            siteSettingRepo.create({ unassignedTicketAlertMinutes: 60 }),
        );
    }

    return settings;
};

export const mapSiteSettingsDto = async (settings: SiteSetting) => ({
    id: settings.id,
    logoPath: settings.logoPath ?? null,
    logoUrl: settings.logoPath
        ? await getPresignedUrl(process.env.MINIO_BUCKET!, settings.logoPath, 3600)
        : null,
    unassignedTicketAlertMinutes: settings.unassignedTicketAlertMinutes,
    aiAssistantEnabled: settings.aiAssistantEnabled ?? true,
    aiModelName: settings.aiModelName ?? null,
    aiApiKey: settings.aiApiKey ? "***" + settings.aiApiKey.slice(-4) : null, // Mask API key
    aiChatUrl: settings.aiChatUrl ?? null,
});

export const updateSiteSettings = async (payload: {
    unassignedTicketAlertMinutes?: number;
    aiAssistantEnabled?: boolean;
    aiModelName?: string | null;
    aiApiKey?: string | null;
    aiChatUrl?: string | null;
}) => {
    const settings = await getOrCreateSiteSettings();

    if (typeof payload.unassignedTicketAlertMinutes === "number") {
        settings.unassignedTicketAlertMinutes = Math.max(
            1,
            Math.floor(payload.unassignedTicketAlertMinutes),
        );
    }

    if (typeof payload.aiAssistantEnabled === "boolean") {
        settings.aiAssistantEnabled = payload.aiAssistantEnabled;
    }

    if (payload.aiModelName !== undefined) {
        settings.aiModelName = payload.aiModelName?.trim() || null;
    }

    if (payload.aiApiKey !== undefined) {
        settings.aiApiKey = payload.aiApiKey?.trim() || null;
    }

    if (payload.aiChatUrl !== undefined) {
        settings.aiChatUrl = payload.aiChatUrl?.trim() || null;
    }

    return siteSettingRepo.save(settings);
};

export const updateSiteLogo = async (file: Express.Multer.File) => {
    const settings = await getOrCreateSiteSettings();
    settings.logoPath = await uploadFilesWithUniqueKey(
        "site/logos",
        "logo",
        file,
    );
    return siteSettingRepo.save(settings);
};

export const listAllowedEmailDomains = async () => {
    const rows = await emailDomainRepo.find({
        where: { deletedAt: IsNull() },
        order: { domain: "ASC" },
    });

    return rows.map((row) => ({
        id: row.id,
        domain: row.domain,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    }));
};

export const createAllowedEmailDomain = async (domain: string) => {
    const normalized = normalizeDomain(domain);
    const existing = await emailDomainRepo.findOne({
        where: { domain: ILike(normalized) },
        withDeleted: true,
    } as any);

    if (existing) {
        existing.domain = normalized;
        existing.deletedAt = null;
        return emailDomainRepo.save(existing);
    }

    return emailDomainRepo.save(emailDomainRepo.create({ domain: normalized }));
};

export const updateAllowedEmailDomain = async (id: string, domain: string) => {
    const row = await emailDomainRepo.findOne({ where: { id } });
    if (!row) return null;

    row.domain = normalizeDomain(domain);
    return emailDomainRepo.save(row);
};

export const deleteAllowedEmailDomain = async (id: string) => {
    const row = await emailDomainRepo.findOne({ where: { id } });
    if (!row) return false;

    await emailDomainRepo.softRemove(row);
    return true;
};

export const getAllowedEmailDomainNames = async () => {
    const rows = await emailDomainRepo.find({
        select: ["domain"],
        where: { deletedAt: IsNull() },
    });

    return rows.map((row) => row.domain);
};

export const isEmailAllowedByDomainSettings = async (email?: string | null) => {
    if (!email) return true;

    const allowedDomains = await getAllowedEmailDomainNames();
    if (!allowedDomains.length) return true;

    const domain = email.split("@").pop()?.toLowerCase() ?? "";
    return allowedDomains.includes(domain);
};

export const getAiSettings = async () => {
    const settings = await getOrCreateSiteSettings();

    // Resolve the chat URL: DB value takes priority, then env, then default.
    // If running in Docker and the URL points to localhost:11434, remap to
    // host.docker.internal (Windows/Mac Docker Desktop) or the OLLAMA_HOST env.
    let chatUrl = settings.aiChatUrl || process.env.OLLAMA_HOST || "http://localhost:11434";

    // When inside Docker, localhost:11434 refers to the container itself — not the host.
    // Remap to host.docker.internal if OLLAMA_HOST env is set to a container-friendly URL.
    const isInsideDocker = process.env.OLLAMA_HOST && !process.env.OLLAMA_HOST.includes("localhost");
    if (
        isInsideDocker &&
        settings.aiChatUrl &&
        settings.aiChatUrl.includes("localhost")
    ) {
        // User stored localhost in DB but we're in Docker — use the env value instead
        chatUrl = process.env.OLLAMA_HOST!;
    }

    return {
        enabled: settings.aiAssistantEnabled ?? true,
        modelName: settings.aiModelName || process.env.OLLAMA_MODEL || "llama3.2",
        apiKey: settings.aiApiKey || null,
        chatUrl,
    };
};
