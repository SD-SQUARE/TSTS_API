CREATE OR REPLACE FUNCTION get_domain_dept_spec_problem_report(
    p_lang TEXT DEFAULT 'en',
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL,
    p_domain_ids UUID[] DEFAULT NULL,
    p_department_ids UUID[] DEFAULT NULL,
    p_specialization_ids UUID[] DEFAULT NULL,
    p_problem_ids UUID[] DEFAULT NULL,
    p_limit INT DEFAULT NULL,
    p_offset INT DEFAULT NULL
)
RETURNS TABLE (
    domain_id UUID,
    domain_name TEXT,
    department_id UUID,
    department_name TEXT,
    specialization_id UUID,
    specialization_name TEXT,
    problem_id UUID,
    problem_name TEXT,
    ticket_count BIGINT
)
AS $$
BEGIN
    -- Validate language parameter
    IF p_lang NOT IN ('en', 'ar') THEN
        p_lang := 'en';
    END IF;

    RETURN QUERY
    SELECT 
        dom.id AS domain_id,
        COALESCE(dom.name->>p_lang, dom.name->>'en', '') AS domain_name,
        dept.id AS department_id,
        COALESCE(dept.name->>p_lang, dept.name->>'en', '') AS department_name,
        spec.id AS specialization_id,
        COALESCE(spec.name->>p_lang, spec.name->>'en', '') AS specialization_name,
        prob.id AS problem_id,
        COALESCE(prob.name->>p_lang, prob.name->>'en', '') AS problem_name,
        COUNT(t.id)::BIGINT AS ticket_count
    FROM tickets t
    INNER JOIN users u ON t."requesterId" = u.id AND u."deletedAt" IS NULL
    INNER JOIN user_departments ud ON ud."userId" = u.id AND ud."deletedAt" IS NULL
    INNER JOIN departments dept ON ud."departmentId" = dept.id AND dept."deletedAt" IS NULL
    INNER JOIN domains dom ON dept."domainId" = dom.id AND dom."deletedAt" IS NULL
    LEFT JOIN specializations spec ON t."specializationId" = spec.id AND spec."deletedAt" IS NULL
    LEFT JOIN problems prob ON t."problemId" = prob.id AND prob."deletedAt" IS NULL
    WHERE t."deletedAt" IS NULL
        AND (p_start_date IS NULL OR t."createdAt" >= p_start_date)
        AND (p_end_date IS NULL OR t."createdAt" <= p_end_date)
        AND (p_domain_ids IS NULL OR dom.id = ANY(p_domain_ids))
        AND (p_department_ids IS NULL OR dept.id = ANY(p_department_ids))
        AND (p_specialization_ids IS NULL OR spec.id = ANY(p_specialization_ids))
        AND (p_problem_ids IS NULL OR prob.id = ANY(p_problem_ids))
    GROUP BY dom.id, dom.name, dept.id, dept.name, spec.id, spec.name, prob.id, prob.name
    ORDER BY 
        COALESCE(dom.name->>p_lang, dom.name->>'en', '') ASC NULLS LAST,
        COALESCE(dept.name->>p_lang, dept.name->>'en', '') ASC NULLS LAST,
        COALESCE(spec.name->>p_lang, spec.name->>'en', '') ASC NULLS LAST,
        COALESCE(prob.name->>p_lang, prob.name->>'en', '') ASC NULLS LAST
    LIMIT CASE WHEN p_limit IS NOT NULL THEN p_limit END
    OFFSET COALESCE(p_offset, 0);
END;
$$ LANGUAGE plpgsql;
