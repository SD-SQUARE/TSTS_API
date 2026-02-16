import { DataSource } from "typeorm";
import { Problem, Specialization } from "../../../entities/index.js";

const problemsSeedData: Array<{
  specializationNameEn: string;
  problems: Array<{
    name: { en: string; ar: string };
    description?: { en?: string; ar?: string };
    review_required?: boolean;
  }>;
}> = [
  {
    specializationNameEn: "Maintenance and decommissioning",
    problems: [
      {
        name: {
          en: "Hardware component failure",
          ar: "عطل في مكونات الأجهزة",
        },
        description: {
          en: "Physical hardware components such as hard drives, RAM, or motherboards have failed and need replacement or repair.",
          ar: "فشل في المكونات المادية للأجهزة مثل الأقراص الصلبة أو الذاكرة أو اللوحات الأم وتحتاج إلى استبدال أو إصلاح.",
        },
        review_required: false,
      },
      {
        name: {
          en: "System performance degradation",
          ar: "تدهور أداء النظام",
        },
        description: {
          en: "System running slower than expected, requiring performance optimization or hardware upgrades.",
          ar: "النظام يعمل بشكل أبطأ من المتوقع، يتطلب تحسين الأداء أو ترقية الأجهزة.",
        },
        review_required: false,
      },
      {
        name: {
          en: "Legacy system decommissioning",
          ar: "تكهين الأنظمة القديمة",
        },
        description: {
          en: "Safely retiring outdated systems while ensuring data migration and compliance with regulations.",
          ar: "إيقاف الأنظمة القديمة بأمان مع ضمان نقل البيانات والامتثال للوائح.",
        },
        review_required: true,
      },
      {
        name: {
          en: "Preventive maintenance scheduling",
          ar: "جدولة الصيانة الوقائية",
        },
        description: {
          en: "Planning and executing regular maintenance tasks to prevent system failures.",
          ar: "تخطيط وتنفيذ مهام الصيانة المنتظمة لمنع أعطال النظام.",
        },
        review_required: false,
      },
      {
        name: {
          en: "Equipment lifecycle management",
          ar: "إدارة دورة حياة المعدات",
        },
        description: {
          en: "Managing the complete lifecycle of IT equipment from procurement to disposal.",
          ar: "إدارة دورة الحياة الكاملة لمعدات تقنية المعلومات من الشراء إلى التخلص.",
        },
        review_required: true,
      },
      {
        name: {
          en: "Mouse not working",
          ar: "الماوس لا يعمل",
        },
        description: {
          en: "Computer mouse is unresponsive, cursor not moving, or clicking not registering properly.",
          ar: "ماوس الكمبيوتر لا يستجيب، المؤشر لا يتحرك، أو النقر لا يسجل بشكل صحيح.",
        },
        review_required: false,
      },
      {
        name: {
          en: "Keyboard malfunction",
          ar: "خلل في لوحة المفاتيح",
        },
        description: {
          en: "Keyboard keys not responding, typing incorrect characters, or complete keyboard failure.",
          ar: "مفاتيح لوحة المفاتيح لا تستجيب، كتابة أحرف خاطئة، أو فشل كامل في لوحة المفاتيح.",
        },
        review_required: true,
      },
      {
        name: {
          en: "Printer and peripheral issues",
          ar: "مشاكل الطابعات والأجهزة الطرفية",
        },
        description: {
          en: "Problems with printers, scanners, or other peripheral devices not functioning properly.",
          ar: "مشاكل في الطابعات أو الماسحات الضوئية أو الأجهزة الطرفية الأخرى التي لا تعمل بشكل صحيح.",
        },
        review_required: false,
      },
    ],
  },
  {
    specializationNameEn: "Technical support",
    problems: [
      {
        name: {
          en: "Software installation issues",
          ar: "مشاكل تثبيت البرامج",
        },
        description: {
          en: "Users experiencing difficulties installing or updating software applications.",
          ar: "المستخدمون يواجهون صعوبات في تثبيت أو تحديث تطبيقات البرامج.",
        },
        review_required: false,
      },
      {
        name: {
          en: "Network connectivity problems",
          ar: "مشاكل الاتصال بالشبكة",
        },
        description: {
          en: "Users unable to connect to network resources, internet, or shared drives.",
          ar: "المستخدمون غير قادرين على الاتصال بموارد الشبكة أو الإنترنت أو الأقراص المشتركة.",
        },
        review_required: true,
      },
      {
        name: {
          en: "Email and communication issues",
          ar: "مشاكل البريد الإلكتروني والاتصالات",
        },
        description: {
          en: "Problems with email clients, messaging systems, or communication platforms.",
          ar: "مشاكل في عملاء البريد الإلكتروني أو أنظمة المراسلة أو منصات الاتصال.",
        },
        review_required: false,
      },
      {
        name: {
          en: "Password and account access",
          ar: "كلمات المرور والوصول للحسابات",
        },
        description: {
          en: "Users locked out of accounts, forgotten passwords, or authentication issues.",
          ar: "المستخدمون محجوبون عن الحسابات، كلمات مرور منسية، أو مشاكل في المصادقة.",
        },
        review_required: true,
      },
      {
        name: {
          en: "System crashes and errors",
          ar: "انهيار النظام والأخطاء",
        },
        description: {
          en: "Frequent system crashes, blue screens, or application errors affecting user productivity.",
          ar: "انهيار متكرر للنظام، شاشات زرقاء، أو أخطاء التطبيقات التي تؤثر على إنتاجية المستخدم.",
        },
        review_required: false,
      },
      {
        name: {
          en: "Ibn Al-Farouk system issues",
          ar: "مشكلة في نظام ابن الفاروق",
        },
        description: {
          en: "Problems accessing or using the Ibn Al-Farouk educational management system.",
          ar: "مشاكل في الوصول إلى أو استخدام نظام ابن الفاروق لإدارة التعليم.",
        },
        review_required: true,
      },
      {
        name: {
          en: "Student results not displaying",
          ar: "نتائج الطلاب مش ظاهرة",
        },
        description: {
          en: "Student grades and results are not showing up in the system or are displaying incorrectly.",
          ar: "درجات ونتائج الطلاب لا تظهر في النظام أو تظهر بشكل خاطئ.",
        },
        review_required: false,
      },
    ],
  },
  {
    specializationNameEn: "Enterprise Resource Planning support",
    problems: [
      {
        name: {
          en: "ERP system performance issues",
          ar: "مشاكل أداء نظام تخطيط موارد المؤسسة",
        },
        description: {
          en: "Slow response times, timeouts, or performance bottlenecks in ERP applications.",
          ar: "أوقات استجابة بطيئة، انتهاء مهلة، أو اختناقات في الأداء في تطبيقات تخطيط موارد المؤسسة.",
        },
        review_required: false,
      },
      {
        name: {
          en: "Data integration problems",
          ar: "مشاكل تكامل البيانات",
        },
        description: {
          en: "Issues with data synchronization between different modules or external systems.",
          ar: "مشاكل في مزامنة البيانات بين الوحدات المختلفة أو الأنظمة الخارجية.",
        },
        review_required: true,
      },
      {
        name: {
          en: "User access and permissions",
          ar: "وصول المستخدمين والصلاحيات",
        },
        description: {
          en: "Problems with user roles, permissions, or access rights within the ERP system.",
          ar: "مشاكل في أدوار المستخدمين أو الصلاحيات أو حقوق الوصول داخل نظام تخطيط موارد المؤسسة.",
        },
        review_required: false,
      },
      {
        name: {
          en: "Report generation failures",
          ar: "فشل في إنشاء التقارير",
        },
        description: {
          en: "Issues with generating, formatting, or exporting reports from the ERP system.",
          ar: "مشاكل في إنشاء أو تنسيق أو تصدير التقارير من نظام تخطيط موارد المؤسسة.",
        },
        review_required: false,
      },
      {
        name: {
          en: "Module configuration errors",
          ar: "أخطاء تكوين الوحدات",
        },
        description: {
          en: "Incorrect configuration of ERP modules affecting business processes and workflows.",
          ar: "تكوين غير صحيح لوحدات تخطيط موارد المؤسسة يؤثر على العمليات التجارية وسير العمل.",
        },
        review_required: true,
      },
      {
        name: {
          en: "Database connectivity issues",
          ar: "مشاكل الاتصال بقاعدة البيانات",
        },
        description: {
          en: "Connection problems between ERP application and underlying database systems.",
          ar: "مشاكل الاتصال بين تطبيق تخطيط موارد المؤسسة وأنظمة قواعد البيانات الأساسية.",
        },
        review_required: true,
      },
      {
        name: {
          en: "Workflow automation failures",
          ar: "فشل أتمتة سير العمل",
        },
        description: {
          en: "Automated business processes not executing correctly or getting stuck in the workflow.",
          ar: "العمليات التجارية المؤتمتة لا تنفذ بشكل صحيح أو تتعطل في سير العمل.",
        },
        review_required: true,
      },
      {
        name: {
          en: "Add user to attendance system",
          ar: "إضافة مستخدم لنظام البصمة",
        },
        description: {
          en: "Request to add new employee or user to the attendance tracking system with proper permissions.",
          ar: "طلب إضافة موظف أو مستخدم جديد إلى نظام تتبع البصمة مع الصلاحيات المناسبة.",
        },
        review_required: true,
      },
      {
        name: {
          en: "Fingerprint not working in attendance system",
          ar: "البصمة لا تعمل في نظام البصمة",
        },
        description: {
          en: "Fingerprint scanner not recognizing user's fingerprint or attendance system not recording check-in/out.",
          ar: "ماسح البصمة لا يتعرف على بصمة المستخدم أو نظام البصمة لا يسجل الدخول/الخروج.",
        },
        review_required: false,
      },
      {
        name: {
          en: "ERP user account creation",
          ar: "إنشاء حساب مستخدم في نظام تخطيط الموارد",
        },
        description: {
          en: "Request to create new user accounts in the ERP system with appropriate roles and access levels.",
          ar: "طلب إنشاء حسابات مستخدمين جديدة في نظام تخطيط الموارد مع الأدوار ومستويات الوصول المناسبة.",
        },
        review_required: true,
      },
      {
        name: {
          en: "Attendance system synchronization",
          ar: "مزامنة نظام البصمة",
        },
        description: {
          en: "Issues with attendance data not syncing properly with HR or payroll systems.",
          ar: "مشاكل في عدم مزامنة بيانات البصمة بشكل صحيح مع أنظمة الموارد البشرية أو الرواتب.",
        },
        review_required: true,
      },
    ],
  },
];

export async function seedProblems(dataSource: DataSource) {
  const problemRepo = dataSource.getRepository(Problem);
  const specializationRepo = dataSource.getRepository(Specialization);

  console.log("🔧 Starting problems seeding...");

  // Process each specialization one at a time to minimize memory usage
  for (let specIndex = 0; specIndex < problemsSeedData.length; specIndex++) {
    const specData = problemsSeedData[specIndex];
    
    try {
      console.log(`📋 Processing specialization ${specIndex + 1}/${problemsSeedData.length}: ${specData.specializationNameEn}`);
      
      // Find the specialization with minimal data loading
      const specialization = await specializationRepo
        .createQueryBuilder("s")
        .select(["s.id", "s.name"])
        .where("s.name->>'en' = :nameEn", {
          nameEn: specData.specializationNameEn,
        })
        .andWhere("s.deletedAt IS NULL")
        .getOne();

      if (!specialization) {
        console.log(`⚠️  [Problems] Specialization not found: ${specData.specializationNameEn}`);
        continue;
      }

      // Process problems one by one to minimize memory footprint
      for (let problemIndex = 0; problemIndex < specData.problems.length; problemIndex++) {
        const problemData = specData.problems[problemIndex];
        
        try {
          // Check if problem exists
          const existing = await problemRepo
            .createQueryBuilder("p")
            .where("p.name->>'en' = :nameEn", { nameEn: problemData.name.en })
            .andWhere("p.deletedAt IS NULL")
            .getOne();

          if (existing) {
            // Update existing problem
            existing.description = problemData.description;
            existing.review_required = problemData.review_required ?? false;
            existing.specialization = specialization;
            await problemRepo.save(existing);
            console.log(`✅ [Problem] Updated: ${problemData.name.en}`);
          } else {
            // Create new problem
            const newProblem = problemRepo.create({
              name: problemData.name,
              description: problemData.description,
              review_required: problemData.review_required ?? false,
              specialization: specialization,
            });
            await problemRepo.save(newProblem);
            await dataSource.manager.clear(Problem);
            console.log(`✅ [Problem] Inserted: ${problemData.name.en}`);
          }

          // Small delay every 5 problems to prevent overwhelming the database
          if ((problemIndex + 1) % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }

        } catch (error) {
          console.error(`❌ [Problem] Error seeding: ${problemData.name.en}`, error.message);
        }
      }

      console.log(`🎯 [Problems] Completed ${specData.problems.length} problems for: ${specData.specializationNameEn}`);
      
      // Small delay between specializations
      if (specIndex < problemsSeedData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

    } catch (error) {
      console.error(`❌ [Problems] Error processing specialization: ${specData.specializationNameEn}`, error.message);
    }
  }

  console.log("🔧 Problems seeding completed!");
}
