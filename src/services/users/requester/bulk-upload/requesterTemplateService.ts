import ExcelJS from "exceljs";
import { PostgresDataSource } from "../../../../database/postgres-data-source.js";
import { University } from "../../../../entities/University.js";
import { Domain } from "../../../../entities/Domain.js";
import { Department } from "../../../../entities/Department.js";
import { Specialization } from "../../../../entities/Specialization.js";
import logger from "../../../../utils/logger.js";

// Constants
const TEMPLATE_CONSTANTS = {
  MAX_ROWS: 200,
  FIRST_DATA_ROW: 2,
  COLUMNS: {
    SSN: 1, // Column A
    EMAIL: 2, // Column B
    CONTACTS: 3, // Column C
    UNIVERSITY: 12, // Column L
    DOMAIN: 13, // Column M
    DEPARTMENT: 14, // Column N
    FIRST_SPEC: 15, // Column O
  },
  COLORS: {
    HEADER: "FF4472C4",
    TITLE: "FF0066CC",
    ERROR: "FFFF0000",
    REFERENCE_HEADER: "FFE7E6E6",
    WHITE: "FFFFFFFF",
    GRAY: "FF666666",
  },
} as const;

// Main service function
export const generateRequesterTemplateService =
  async (): Promise<ExcelJS.Workbook> => {
    logger.info("[requester-template] Generating Excel template");

    const workbook = new ExcelJS.Workbook();

    // Create sheets
    createInstructionsSheet(workbook);
    const data = await fetchTemplateData();
    const worksheet = createMainWorksheet(workbook, data.specializations);

    // Create dropdown validation sheets
    createDropdownValidationSheets(workbook, data);

    // Apply data validations
    applyDataValidations(worksheet, workbook, data);

    // Create reference sheets
    createReferenceSheets(workbook, data);

    // Apply worksheet protection
    applyWorksheetProtection(worksheet, data.specializations.length);

    logger.info("[requester-template] Template generated successfully");
    return workbook;
  };

// Helper functions
const getColumnLetter = (col: number): string => {
  let letter = "";
  while (col > 0) {
    const remainder = (col - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
};

const sanitizeRangeName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_");
};

const getBilingualName = (entity: {
  name?: { ar?: string; en?: string };
}): string => {
  return entity.name?.ar || entity.name?.en || "";
};

// Instruction content
const getInstructionContent = () => [
  {
    content: "تعليمات استخدام قالب استيراد المستخدمين (Requesters)",
    style: {
      font: {
        size: 18,
        bold: true,
        color: { argb: TEMPLATE_CONSTANTS.COLORS.TITLE },
      },
    },
  },
  { content: "" },
  {
    content: "مرحباً بك في قالب استيراد بيانات المستخدمين لنظام دعم التذاكر",
    style: { font: { size: 14, bold: true } },
  },
  {
    content:
      "هذا القالب مخصص لإضافة المستخدمين (Requesters) الذين سيقومون بإنشاء تذاكر الدعم الفني في النظام",
    style: { font: { italic: true } },
  },
  { content: "" },
  {
    content: "ما هو المستخدم (Requester)؟",
    style: {
      font: {
        size: 12,
        bold: true,
        color: { argb: TEMPLATE_CONSTANTS.COLORS.TITLE },
      },
    },
  },
  { content: "المستخدم هو الشخص الذي يمكنه:" },
  { content: "  • إنشاء تذاكر دعم فني جديدة" },
  { content: "  • متابعة حالة التذاكر الخاصة به" },
  { content: "  • التواصل مع الفنيين عبر الدردشة" },
  { content: "  • تلقي الإشعارات حول تذاكره" },
  { content: "" },
  {
    content: "الخطوات:",
    style: {
      font: {
        size: 12,
        bold: true,
        color: { argb: TEMPLATE_CONSTANTS.COLORS.TITLE },
      },
    },
  },
  { content: "1. انتقل إلى تبويب 'Requesters' لإدخال البيانات" },
  { content: "2. املأ جميع الحقول المطلوبة لكل مستخدم" },
  { content: "3. استخدم القوائم المنسدلة لاختيار الجامعة، الجهة، والقسم" },
  { content: "4. حدد التخصصات المناسبة (نعم/لا أو اتركها فارغة)" },
  { content: "5. احفظ الملف بعد الانتهاء وقم برفعه للنظام" },
  { content: "" },
  {
    content: "الحقول المطلوبة:",
    style: {
      font: {
        size: 12,
        bold: true,
        color: { argb: TEMPLATE_CONSTANTS.COLORS.TITLE },
      },
    },
  },
  { content: "• الاسم الأول (بالإنجليزية والعربية)" },
  { content: "• الاسم الأوسط (بالإنجليزية والعربية)" },
  { content: "• الاسم الأخير (بالإنجليزية والعربية)" },
  {
    content: "• البريد الإلكتروني (يجب أن يكون فريداً - سيستخدم لتسجيل الدخول)",
  },
  { content: "• الرقم القومي (14 رقم - يجب أن يكون فريداً)" },
  { content: "• الجامعة (اختر من القائمة المنسدلة)" },
  { content: "• الجهة (سيتم تصفيته تلقائياً بناءً على الجامعة المختارة)" },
  { content: "• القسم (سيتم تصفيته تلقائياً بناءً على الجهة المختارة)" },
  { content: "• رقم الاتصال" },
  { content: "• المسمى الوظيفي (بالإنجليزية والعربية)" },
  { content: "" },
  {
    content: "القوائم المنسدلة المتتالية:",
    style: {
      font: {
        size: 12,
        bold: true,
        color: { argb: TEMPLATE_CONSTANTS.COLORS.TITLE },
      },
    },
  },
  { content: "• اختر الجامعة أولاً → ستظهر الجهات الخاصة بها فقط" },
  { content: "• اختر الجهة → ستظهر الأقسام الخاصة بها فقط" },
  { content: "" },
  {
    content: "التخصصات:",
    style: {
      font: {
        size: 12,
        bold: true,
        color: { argb: TEMPLATE_CONSTANTS.COLORS.TITLE },
      },
    },
  },
  { content: "• كل تخصص له عمود منفصل باسمه العربي" },
  { content: "• اختر 'نعم' إذا كان المستخدم لديه هذا التخصص" },
  { content: "• اختر 'لا' إذا لم يكن لديه" },
  { content: "• يمكنك ترك الخلية فارغة" },
  { content: "• التخصصات تساعد في توجيه التذاكر للفنيين المتخصصين" },
  { content: "" },
  {
    content: "بعد رفع الملف:",
    style: {
      font: {
        size: 12,
        bold: true,
        color: { argb: TEMPLATE_CONSTANTS.COLORS.TITLE },
      },
    },
  },
  { content: "• سيتم إنشاء حسابات للمستخدمين في نظام دعم التذاكر" },
  { content: "• سيتمكن المستخدمون من تسجيل الدخول باستخدام بريدهم الإلكتروني" },
  { content: "• سيتمكنون من إنشاء تذاكر دعم فني ومتابعتها" },
  { content: "" },
  {
    content: "للمساعدة أو الاستفسار، يرجى التواصل مع الدعم الفني",
    style: {
      font: { italic: true, color: { argb: TEMPLATE_CONSTANTS.COLORS.GRAY } },
    },
  },
  { content: "" },
  {
    content:
      "جميع الحقوق محفوظه لمركز الاتصالات وتكنولوجيا المعلومات - جامعة العاصمة © 2026",
    style: {
      font: {
        italic: true,
        color: { argb: TEMPLATE_CONSTANTS.COLORS.GRAY },
      },
    },
  },
];

// Create instructions sheet
const createInstructionsSheet = (workbook: ExcelJS.Workbook): void => {
  const sheet = workbook.addWorksheet("Instructions");
  sheet.columns = [{ key: "content", width: 100 }];

  getInstructionContent().forEach((instruction, index) => {
    const row = sheet.getRow(index + 1);
    row.getCell(1).value = instruction.content;

    if (instruction.style?.font) {
      row.getCell(1).font = instruction.style.font;
    }

    row.getCell(1).alignment = { vertical: "middle", wrapText: true };
    row.height = 20;
  });
};

// Fetch all required data from database
const fetchTemplateData = async () => {
  const universityRepo = PostgresDataSource.getRepository(University);
  const domainRepo = PostgresDataSource.getRepository(Domain);
  const departmentRepo = PostgresDataSource.getRepository(Department);
  const specializationRepo = PostgresDataSource.getRepository(Specialization);

  const [universities, domains, departments, specializations] =
    await Promise.all([
      universityRepo.find({ select: ["id", "name"], order: { name: "ASC" } }),
      domainRepo.find({
        select: ["id", "name"],
        relations: ["university"],
        order: { name: "ASC" },
      }),
      departmentRepo.find({
        select: ["id", "name"],
        relations: ["domain"],
        order: { name: "ASC" },
      }),
      specializationRepo.find({
        select: ["id", "name"],
        order: { name: "ASC" },
      }),
    ]);

  // Load lazy relations
  const domainsWithUni = await Promise.all(
    domains.map(async (domain) => ({
      ...domain,
      university: domain.university ? await domain.university : undefined,
    })),
  );

  const departmentsWithDomain = await Promise.all(
    departments.map(async (department) => ({
      ...department,
      domain: department.domain ? await department.domain : undefined,
    })),
  );

  return {
    universities,
    domains: domainsWithUni,
    departments: departmentsWithDomain,
    specializations,
  };
};

// Define base columns for the main sheet
const getBaseColumns = () => [
  { header: "الرقم القومي (14 رقم)", key: "ssn", width: 20 },
  { header: "البريد الإلكتروني", key: "email", width: 30 },
  { header: "رقم الاتصال", key: "contacts", width: 30 },
  { header: "الاسم الأول (إنجليزي)", key: "first_name_en", width: 20 },
  { header: "الاسم الأوسط (إنجليزي)", key: "mid_name_en", width: 20 },
  { header: "الاسم الأخير (إنجليزي)", key: "last_name_en", width: 20 },
  { header: "المسمى الوظيفي (إنجليزي)", key: "job_en", width: 25 },
  { header: "الاسم الأول (عربي)", key: "first_name_ar", width: 20 },
  { header: "الاسم الأوسط (عربي)", key: "mid_name_ar", width: 20 },
  { header: "الاسم الأخير (عربي)", key: "last_name_ar", width: 20 },
  { header: "المسمى الوظيفي (عربي)", key: "job_ar", width: 25 },
  { header: "الجامعة", key: "university", width: 40 },
  { header: "الجهة", key: "domain", width: 40 },
  { header: "القسم", key: "department", width: 40 },
];

// Create main data entry worksheet
const createMainWorksheet = (
  workbook: ExcelJS.Workbook,
  specializations: Specialization[],
): ExcelJS.Worksheet => {
  const worksheet = workbook.addWorksheet("Requesters");

  const baseColumns = getBaseColumns();
  const specializationColumns = specializations.map((spec, index) => ({
    header: getBilingualName(spec) || `Specialization ${index + 1}`,
    key: `spec_${spec.id}`,
    width: 40,
  }));

  worksheet.columns = [...baseColumns, ...specializationColumns];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = {
    bold: true,
    color: { argb: TEMPLATE_CONSTANTS.COLORS.WHITE },
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: TEMPLATE_CONSTANTS.COLORS.HEADER },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // Format contacts column (column 3) as text to preserve leading zeros
  const contactsColumn = worksheet.getColumn(TEMPLATE_CONSTANTS.COLUMNS.CONTACTS);
  contactsColumn.numFmt = "@"; // Text format

  // Add note to contacts header
  worksheet.getCell("C1").note = {
    texts: [
      {
        text: "رقم الاتصال يجب أن يكون 11 رقم بالضبط ويبدأ بصفر (مثال: 01xxxxxxxxx). تأكد من إدخال الرقم كنص وليس كرقم للحفاظ على الصفر في البداية. لا تستخدم مسافات.",
      },
    ],
  };

  // Format SSN column (column 1) as text to preserve all digits
  const ssnColumn = worksheet.getColumn(TEMPLATE_CONSTANTS.COLUMNS.SSN);
  ssnColumn.numFmt = "@"; // Text format

  // Add note to SSN header
  worksheet.getCell("A1").note = {
    texts: [
      {
        text: "الرقم القومي يجب أن يكون 14 رقم بالضبط (مثال: 12345678901234). تأكد من إدخال الرقم كنص وليس كرقم. لا تستخدم مسافات أو أحرف.",
      },
    ],
  };

  // Set the view to show only the columns we need
  const totalColumns = baseColumns.length + specializationColumns.length;
  const lastColumnLetter = getColumnLetter(totalColumns);

  // Set print area to limit visible columns
  worksheet.pageSetup.printArea = `A1:${lastColumnLetter}${TEMPLATE_CONSTANTS.MAX_ROWS}`;

  return worksheet;
};

// Group entities by parent
const groupByParent = <T extends { id: string }>(
  items: Array<T & { [key: string]: any }>,
  parentKey: string,
): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();

  items.forEach((item) => {
    const parentId = item[parentKey]?.id;
    if (parentId) {
      if (!grouped.has(parentId)) {
        grouped.set(parentId, []);
      }
      grouped.get(parentId)!.push(item);
    }
  });

  return grouped;
};

// Create hidden sheets for dropdown validation
const createDropdownValidationSheets = (
  workbook: ExcelJS.Workbook,
  data: Awaited<ReturnType<typeof fetchTemplateData>>,
): void => {
  const { universities, domains, departments } = data;

  // University list sheet
  const universityListSheet = workbook.addWorksheet("_UniversityList", {
    state: "hidden",
  });
  universityListSheet.columns = [{ header: "الجامعة", key: "name", width: 40 }];
  universities.forEach((uni, index) => {
    universityListSheet.getCell(`A${index + 2}`).value = getBilingualName(uni);
  });

  // Domain list sheet with columns per university
  const domainListSheet = workbook.addWorksheet("_DomainList", {
    state: "hidden",
  });
  const domainsByUniversity = groupByParent(domains, "university");

  let currentCol = 1;
  universities.forEach((uni) => {
    const uniName = getBilingualName(uni);
    const uniDomains = domainsByUniversity.get(uni.id) || [];

    if (uniDomains.length > 0) {
      const colLetter = getColumnLetter(currentCol);

      domainListSheet.getCell(`${colLetter}1`).value = uniName;
      domainListSheet.getCell(`${colLetter}1`).font = { bold: true };

      uniDomains.forEach((domain, index) => {
        domainListSheet.getCell(`${colLetter}${index + 2}`).value =
          getBilingualName(domain);
      });

      const rangeName = sanitizeRangeName(uniName);
      workbook.definedNames.add(
        `_DomainList!${colLetter}$2:${colLetter}$${uniDomains.length + 1}`,
        rangeName,
      );

      currentCol++;
    }
  });

  // Department list sheet with columns per domain
  const departmentListSheet = workbook.addWorksheet("_DepartmentList", {
    state: "hidden",
  });
  const departmentsByDomain = groupByParent(departments, "domain");

  let currentDeptCol = 1;
  domains.forEach((domain) => {
    const domainName = getBilingualName(domain);
    const domainDepartments = departmentsByDomain.get(domain.id) || [];

    if (domainDepartments.length > 0) {
      const colLetter = getColumnLetter(currentDeptCol);

      departmentListSheet.getCell(`${colLetter}1`).value = domainName;
      departmentListSheet.getCell(`${colLetter}1`).font = { bold: true };

      domainDepartments.forEach((department, index) => {
        departmentListSheet.getCell(`${colLetter}${index + 2}`).value =
          getBilingualName(department);
      });

      const rangeName = sanitizeRangeName(domainName);
      workbook.definedNames.add(
        `_DepartmentList!${colLetter}$2:${colLetter}$${domainDepartments.length + 1}`,
        rangeName,
      );

      currentDeptCol++;
    }
  });
};

// Apply data validations to worksheet
const applyDataValidations = (
  worksheet: ExcelJS.Worksheet,
  workbook: ExcelJS.Workbook,
  data: Awaited<ReturnType<typeof fetchTemplateData>>,
): void => {
  const { universities, specializations } = data;
  const { MAX_ROWS, COLUMNS } = TEMPLATE_CONSTANTS;

  // University dropdown validation
  if (universities.length > 0) {
    const uniColLetter = getColumnLetter(COLUMNS.UNIVERSITY);
    for (let row = TEMPLATE_CONSTANTS.FIRST_DATA_ROW; row <= MAX_ROWS; row++) {
      worksheet.getCell(`${uniColLetter}${row}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`_UniversityList!$A$2:$A$${universities.length + 1}`],
        showErrorMessage: true,
        errorTitle: "جامعة غير صالحة",
        error: "يرجى اختيار جامعة من القائمة المنسدلة",
      };
    }
  }

  // Domain dropdown validation (cascading based on university)
  const domainColLetter = getColumnLetter(COLUMNS.DOMAIN);
  const uniColLetter = getColumnLetter(COLUMNS.UNIVERSITY);
  for (let row = TEMPLATE_CONSTANTS.FIRST_DATA_ROW; row <= MAX_ROWS; row++) {
    worksheet.getCell(`${domainColLetter}${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [
        `INDIRECT(SUBSTITUTE(SUBSTITUTE(${uniColLetter}${row}," ","_"),"ـ","_"))`,
      ],
      showErrorMessage: true,
      errorTitle: "جهة غير صالحة",
      error:
        "يرجى اختيار جهة من القائمة المنسدلة. تأكد من اختيار الجامعة أولاً.",
    };
  }

  // Department dropdown validation (cascading based on domain)
  const deptColLetter = getColumnLetter(COLUMNS.DEPARTMENT);
  for (let row = TEMPLATE_CONSTANTS.FIRST_DATA_ROW; row <= MAX_ROWS; row++) {
    worksheet.getCell(`${deptColLetter}${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [
        `INDIRECT(SUBSTITUTE(SUBSTITUTE(${domainColLetter}${row}," ","_"),"ـ","_"))`,
      ],
      showErrorMessage: true,
      errorTitle: "قسم غير صالح",
      error: "يرجى اختيار قسم من القائمة المنسدلة. تأكد من اختيار الجهة أولاً.",
    };
  }

  // Contacts (phone number) validation - column 3
  const contactsColLetter = getColumnLetter(COLUMNS.CONTACTS);
  for (let r = TEMPLATE_CONSTANTS.FIRST_DATA_ROW; r <= MAX_ROWS; r++) {
    worksheet.getCell(`${contactsColLetter}${r}`).dataValidation = {
      type: "custom",
      allowBlank: false,
      // Check: length is 11, no spaces, all digits, starts with 0
      formulae: [
        `=AND(LEN(${contactsColLetter}${r})=11,ISERROR(FIND(" ",${contactsColLetter}${r})),ISNUMBER(--${contactsColLetter}${r}),LEFT(${contactsColLetter}${r},1)="0")`,
      ],
      showErrorMessage: true,
      errorTitle: "رقم اتصال غير صالح",
      error:
        "يرجى إدخال رقم الاتصال كنص (11 رقم، يبدأ بصفر، بدون مسافات). مثال: 01xxxxxxxxx",
    };
  }

  // SSN (الرقم القومي) validation - column 1
  const ssnColLetter = getColumnLetter(COLUMNS.SSN);
  for (let r = TEMPLATE_CONSTANTS.FIRST_DATA_ROW; r <= MAX_ROWS; r++) {
    worksheet.getCell(`${ssnColLetter}${r}`).dataValidation = {
      type: "custom",
      allowBlank: false,
      // Check: length is 14, no spaces, all digits
      formulae: [
        `=AND(LEN(${ssnColLetter}${r})=14,ISERROR(FIND(" ",${ssnColLetter}${r})),ISNUMBER(--${ssnColLetter}${r}))`,
      ],
      showErrorMessage: true,
      errorTitle: "رقم قومي غير صالح",
      error:
        "يرجى إدخال الرقم القومي كنص (14 رقم بالضبط، بدون مسافات أو أحرف). مثال: 12345678901234",
    };
  }

  // Specialization dropdown validations
  specializations.forEach((spec, index) => {
    const colIndex = COLUMNS.FIRST_SPEC + index;
    const colLetter = getColumnLetter(colIndex);

    for (let row = TEMPLATE_CONSTANTS.FIRST_DATA_ROW; row <= MAX_ROWS; row++) {
      worksheet.getCell(`${colLetter}${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"نعم,لا"'],
        showErrorMessage: true,
        errorTitle: "قيمة غير صالحة",
        error: 'يرجى اختيار "نعم" أو "لا"',
      };
    }

    worksheet.getCell(`${colLetter}1`).note = {
      texts: [
        {
          text: `حدد "نعم" إذا كان المستخدم لديه هذا التخصص، أو "لا" إذا لم يكن لديه، أو اتركه فارغاً.`,
        },
      ],
    };
  });

  // Add notes to cascading dropdown columns
  worksheet.getCell(`${domainColLetter}1`).note = {
    texts: [
      {
        text: "القائمة المنسدلة للجهة يتم تصفيتها بناءً على اختيار الجامعة. اختر الجامعة أولاً، ثم ستظهر الجهة فقط الجهات الخاصة بتلك الجامعة. يستخدم هذا صيغة INDIRECT.",
      },
    ],
  };

  worksheet.getCell(`${deptColLetter}1`).note = {
    texts: [
      {
        text: "القائمة المنسدلة للقسم يتم تصفيتها بناءً على اختيار الجهة. اختر الجهة أولاً، ثم سيظهر القسم فقط الأقسام الخاصة بتلك الجهة. يستخدم هذا صيغة INDIRECT.",
      },
    ],
  };

  // Add note to contacts column (reuse contactsColLetter from validation section above)
  worksheet.getCell(`${contactsColLetter}1`).note = {
    texts: [
      {
        text: "رقم الاتصال يجب أن يكون 11 رقم بالضبط ويبدأ بصفر. أدخل الرقم كنص (ليس كرقم) للحفاظ على الصفر. مثال صحيح: 01xxxxxxxxx (بدون مسافات)",
      },
    ],
  };
};

// Create reference sheets for user information
const createReferenceSheets = (
  workbook: ExcelJS.Workbook,
  data: Awaited<ReturnType<typeof fetchTemplateData>>,
): void => {
  // Reference sheets removed to keep template clean and minimal
  // The dropdown validation sheets (_UniversityList, _DomainList, _DepartmentList)
  // are sufficient for the template to work correctly
  logger.info(
    "[requester-template] Skipping reference sheets to keep template minimal",
  );
};

// Apply worksheet protection
const applyWorksheetProtection = (
  worksheet: ExcelJS.Worksheet,
  specializationCount: number,
): void => {
  const totalColumns = getBaseColumns().length + specializationCount;

  // Lock header row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.protection = { locked: true };
  });

  // Unlock data cells
  for (
    let rowNumber = TEMPLATE_CONSTANTS.FIRST_DATA_ROW;
    rowNumber <= TEMPLATE_CONSTANTS.MAX_ROWS;
    rowNumber++
  ) {
    for (let colNumber = 1; colNumber <= totalColumns; colNumber++) {
      const cell = worksheet.getCell(rowNumber, colNumber);
      cell.protection = { locked: false };
    }
  }

  // Apply protection - IMPORTANT: formatCells must be TRUE to allow error highlighting
  worksheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: true, // Changed to true to allow error highlighting
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  });
};
