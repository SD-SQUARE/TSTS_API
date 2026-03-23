CREATE OR REPLACE FUNCTION get_requester_domain_report(
    p_lang TEXT DEFAULT 'en',
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL,
    p_domain_ids UUID[] DEFAULT NULL,
    p_requester_ids UUID[] DEFAULT NULL,
    p_limit INT DEFAULT NULL,
    p_offset INT DEFAULT NULL
)
RETURNS TABLE (
    requester_id UUID,
    requester_name TEXT,
    domain_id UUID,
    domain_name TEXT,
    ticket_count BIGINT
)
AS $$
BEGIN
    IF p_lang NOT IN ('en', 'ar') THEN
        p_lang := 'en';
    END IF;

    RETURN QUERY
    SELECT
        u.id AS requester_id,
        COALESCE(
            NULLIF(TRIM(CONCAT(
                u."firstName"->>p_lang, ' ',
                u."midName"->>p_lang, ' ',
                u."lastName"->>p_lang
            )), ''),
            NULLIF(TRIM(CONCAT(
                u."firstName"->>'en', ' ',
                u."midName"->>'en', ' ',
                u."lastName"->>'en'
            )), '')
        ) AS requester_name,
        dom.id AS domain_id,
        COALESCE(dom.name->>p_lang, dom.name->>'en', '') AS domain_name,
        COUNT(t.id)::BIGINT AS ticket_count
    FROM tickets t
    INNER JOIN users u ON t."requesterId" = u.id AND u."deletedAt" IS NULL
    INNER JOIN user_departments ud ON ud."userId" = u.id AND ud."deletedAt" IS NULL
    INNER JOIN departments dept ON ud."departmentId" = dept.id AND dept."deletedAt" IS NULL
    INNER JOIN domains dom ON dept."domainId" = dom.id AND dom."deletedAt" IS NULL
    WHERE t."deletedAt" IS NULL
        AND (p_start_date IS NULL OR t."createdAt" >= p_start_date)
        AND (p_end_date IS NULL OR t."createdAt" <= p_end_date)
        AND (p_domain_ids IS NULL OR dom.id = ANY(p_domain_ids))
        AND (p_requester_ids IS NULL OR u.id = ANY(p_requester_ids))
    GROUP BY u.id, u."firstName", u."midName", u."lastName", dom.id, dom.name
    ORDER BY
        TRIM(CONCAT(u."firstName"->>p_lang, ' ', u."midName"->>p_lang, ' ', u."lastName"->>p_lang)) ASC,
        COALESCE(dom.name->>p_lang, dom.name->>'en', '') ASC
    LIMIT CASE WHEN p_limit IS NOT NULL THEN p_limit END
    OFFSET COALESCE(p_offset, 0);
END;
$$ LANGUAGE plpgsql;
