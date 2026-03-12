import ExcelJS from "exceljs";
import { 
  findUniversityByName, 
  findDomainByName,
  findDepartmentByName,
} from "./requesterLookupService.js";
import logger from "../../../../utils/logger.js";
import { PostgresDataSource } from "../../../../database/postgres-data-source.js";
import { Specialization } from "../../../../entities/Specialization.js";
import { User } from "../../../../entities/User.js";
import {
  ARABIC_REGEX,
  EGYPTIAN_SSN_REGEX,
  ENGLISH_REGEX,
} from "../../../../config/validations.js";

interface ValidationError {
  row: number;
  column: number;
  columnName: string;
  error: string;
}

interface FileValidationResult {
  filename: string;
  hasErrors: boolean;
  validRowCount: number;
  invalidRowCount: number;
  totalRowCount: number;
  errors: ValidationError[];
  validData: any[];
  errorFileBuffer?: any;
}

// Helper function to extract cell value as string
const getCellValue = (cell: any, preserveLeadingZero: boolean = false): string => {
  const value = cell.value;
  if (!value) return "";
  
  // Handle rich text
  if (value.richText) {
    return value.richText.map((rt: any) => rt.text).join("");
  }
  
  // Handle hyperlinks
  if (value.text !== undefined) {
    return value.text;
  }
  
  // Handle numbers with leading zeros (for phone numbers)
  if (preserveLeadingZero && typeof value === 'number') {
    // Convert to string and pad with leading zero if needed
    const numStr = value.toString();
    // If it's 10 digits, add leading zero
    if (numStr.length === 10 && /^\d+$/.test(numStr)) {
      return '0' + numStr;
    }
    return numStr;
  }
  
  // Handle regular values
  return value.toString().trim();
};

export const validateRequesterExcelFiles = async (
  files: Express.Multer.File[]
): Promise<FileValidationResult[]> => {
  logger.info(`[bulk-validation] Starting validation for ${files.length} files`);

  const results: FileValidationResult[] = [];

  // Get all specializations once
  const specializationRepo = PostgresDataSource.getRepository(Specialization);
  const allSpecializations = await specializationRepo.find({ 
    select: ["id", "name"],
    order: { name: "ASC" }
  });

  const specializationMap = new Map<string, string>();
  allSpecializations.forEach(spec => {
    const arName = spec.name?.ar;
    const enName = spec.name?.en;
    if (arName) specializationMap.set(arName, spec.id);
    if (enName) specializationMap.set(enName, spec.id);
  });

  for (const file of files) {
    logger.info(`[bulk-validation] Processing file: ${file.originalname}`);
    
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);

      const worksheet = workbook.getWorksheet("Requesters");
      if (!worksheet) {
        results.push({
          filename: file.originalname,
          hasErrors: true,
          validRowCount: 0,
          invalidRowCount: 0,
          totalRowCount: 0,
          errors: [{ row: 0, column: 0, columnName: "ملف", error: "ورقة العمل 'Requesters' غير موجودة" }],
          validData: [],
        });
        continue;
      }

      const headerRow = worksheet.getRow(1);
      const errors: ValidationError[] = [];
      const validData: any[] = [];

      // Find specialization columns dynamically
      const specializationColumns: { colNumber: number; name: string }[] = [];
      headerRow.eachCell((cell, colNumber) => {
        const headerValue = getCellValue(cell);
        if (specializationMap.has(headerValue)) {
          specializationColumns.push({ colNumber, name: headerValue });
        }
      });

      // Column mapping (new order)
      const columnNames = [
        "", // 0-index placeholder
        "الرقم القومي (14 رقم)", // 1
        "البريد الإلكتروني", // 2
        "رقم الاتصال", // 3
        "الاسم الأول (إنجليزي)", // 4
        "الاسم الأوسط (إنجليزي)", // 5
        "الاسم الأخير (إنجليزي)", // 6
        "المسمى الوظيفي (إنجليزي)", // 7
        "الاسم الأول (عربي)", // 8
        "الاسم الأوسط (عربي)", // 9
        "الاسم الأخير (عربي)", // 10
        "المسمى الوظيفي (عربي)", // 11
        "الجامعة", // 12
        "الجهة", // 13
        "القسم", // 14
      ];

      // Parse data rows (skip header row 1, start from row 2)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        
        // Skip empty rows (check SSN and email)
        if (!row.getCell(1).value && !row.getCell(2).value) {
          continue;
        }

        const rowErrors: ValidationError[] = [];
        
        // Extract basic data (new column order)
        const ssn = getCellValue(row.getCell(1));
        const email = getCellValue(row.getCell(2));
        const contacts = getCellValue(row.getCell(3), true); // Preserve leading zero for phone numbers
        const firstName_en = getCellValue(row.getCell(4));
        const midName_en = getCellValue(row.getCell(5));
        const lastName_en = getCellValue(row.getCell(6));
        const job_en = getCellValue(row.getCell(7));
        const firstName_ar = getCellValue(row.getCell(8));
        const midName_ar = getCellValue(row.getCell(9));
        const lastName_ar = getCellValue(row.getCell(10));
        const job_ar = getCellValue(row.getCell(11));
        const universityName = getCellValue(row.getCell(12));
        const domainName = getCellValue(row.getCell(13));
        const departmentName = getCellValue(row.getCell(14));

        // Debug logging for first data row
        if (rowNumber === 2) {
          logger.info(`[bulk-validation] Row 2 data: ssn="${ssn}", email="${email}", contacts="${contacts}", firstName_en="${firstName_en}", firstName_ar="${firstName_ar}", university="${universityName}", domain="${domainName}", department="${departmentName}"`);
        }

        // Validate required fields
        if (!firstName_en) {
          rowErrors.push({ row: rowNumber, column: 4, columnName: columnNames[4], error: "الاسم الأول (إنجليزي) مطلوب" });
        } else if (!ENGLISH_REGEX.test(firstName_en)) {
          rowErrors.push({ row: rowNumber, column: 4, columnName: columnNames[4], error: "الاسم الأول (إنجليزي) يجب أن يكون بالإنجليزية" });
        } else if (firstName_en.length > 255) {
          rowErrors.push({ row: rowNumber, column: 4, columnName: columnNames[4], error: "الاسم الأول (إنجليزي) طويل جداً" });
        }
        
        if (!firstName_ar) {
          rowErrors.push({ row: rowNumber, column: 8, columnName: columnNames[8], error: "الاسم الأول (عربي) مطلوب" });
        } else if (!ARABIC_REGEX.test(firstName_ar)) {
          rowErrors.push({ row: rowNumber, column: 8, columnName: columnNames[8], error: "الاسم الأول (عربي) يجب أن يكون بالعربية" });
        } else if (firstName_ar.length > 255) {
          rowErrors.push({ row: rowNumber, column: 8, columnName: columnNames[8], error: "الاسم الأول (عربي) طويل جداً" });
        }

        if (!midName_en) {
          rowErrors.push({ row: rowNumber, column: 5, columnName: columnNames[5], error: "الاسم الأوسط (إنجليزي) مطلوب" });
        } else if (!ENGLISH_REGEX.test(midName_en)) {
          rowErrors.push({ row: rowNumber, column: 5, columnName: columnNames[5], error: "الاسم الأوسط (إنجليزي) يجب أن يكون بالإنجليزية" });
        } else if (midName_en.length > 255) {
          rowErrors.push({ row: rowNumber, column: 5, columnName: columnNames[5], error: "الاسم الأوسط (إنجليزي) طويل جداً" });
        }

        if (!midName_ar) {
          rowErrors.push({ row: rowNumber, column: 9, columnName: columnNames[9], error: "الاسم الأوسط (عربي) مطلوب" });
        } else if (!ARABIC_REGEX.test(midName_ar)) {
          rowErrors.push({ row: rowNumber, column: 9, columnName: columnNames[9], error: "الاسم الأوسط (عربي) يجب أن يكون بالعربية" });
        } else if (midName_ar.length > 255) {
          rowErrors.push({ row: rowNumber, column: 9, columnName: columnNames[9], error: "الاسم الأوسط (عربي) طويل جداً" });
        }

        if (!lastName_en) {
          rowErrors.push({ row: rowNumber, column: 6, columnName: columnNames[6], error: "الاسم الأخير (إنجليزي) مطلوب" });
        } else if (!ENGLISH_REGEX.test(lastName_en)) {
          rowErrors.push({ row: rowNumber, column: 6, columnName: columnNames[6], error: "الاسم الأخير (إنجليزي) يجب أن يكون بالإنجليزية" });
        } else if (lastName_en.length > 255) {
          rowErrors.push({ row: rowNumber, column: 6, columnName: columnNames[6], error: "الاسم الأخير (إنجليزي) طويل جداً" });
        }

        if (!lastName_ar) {
          rowErrors.push({ row: rowNumber, column: 10, columnName: columnNames[10], error: "الاسم الأخير (عربي) مطلوب" });
        } else if (!ARABIC_REGEX.test(lastName_ar)) {
          rowErrors.push({ row: rowNumber, column: 10, columnName: columnNames[10], error: "الاسم الأخير (عربي) يجب أن يكون بالعربية" });
        } else if (lastName_ar.length > 255) {
          rowErrors.push({ row: rowNumber, column: 10, columnName: columnNames[10], error: "الاسم الأخير (عربي) طويل جداً" });
        }
        
        if (!email) {
          rowErrors.push({ row: rowNumber, column: 2, columnName: columnNames[2], error: "البريد الإلكتروني مطلوب" });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          rowErrors.push({ row: rowNumber, column: 2, columnName: columnNames[2], error: "صيغة البريد الإلكتروني غير صالحة" });
        } else {
          // Check if email already exists in database
          const userRepo = PostgresDataSource.getRepository(User);
          const emailExists = await userRepo.exists({ where: { email } });
          if (emailExists) {
            rowErrors.push({ row: rowNumber, column: 2, columnName: columnNames[2], error: "البريد الإلكتروني موجود بالفعل" });
          }
        }
        
        if (!ssn) {
          rowErrors.push({ row: rowNumber, column: 1, columnName: columnNames[1], error: "الرقم القومي مطلوب" });
        } else if (!EGYPTIAN_SSN_REGEX.test(ssn)) {
          rowErrors.push({ row: rowNumber, column: 1, columnName: columnNames[1], error: "الرقم القومي غير صالح" });
        } else {
          // Check if SSN already exists in database
          const userRepo = PostgresDataSource.getRepository(User);
          const ssnExists = await userRepo.exists({ where: { ssn } });
          if (ssnExists) {
            rowErrors.push({ row: rowNumber, column: 1, columnName: columnNames[1], error: "الرقم القومي موجود بالفعل" });
          }
        }
        
        if (!universityName) {
          rowErrors.push({ row: rowNumber, column: 12, columnName: columnNames[12], error: "الجامعة مطلوبة" });
        }
        if (!domainName) {
          rowErrors.push({ row: rowNumber, column: 13, columnName: columnNames[13], error: "الجهة مطلوبة" });
        }
        if (!departmentName) {
          rowErrors.push({ row: rowNumber, column: 14, columnName: columnNames[14], error: "القسم مطلوب" });
        }

        // Validate contacts (phone number)
        if (!contacts) {
          rowErrors.push({ row: rowNumber, column: 3, columnName: columnNames[3], error: "رقم الاتصال مطلوب" });
        } else {
          // Remove any spaces
          const cleanedContacts = contacts.replace(/\s/g, '');
          
          // Check if it contains only numbers
          if (!/^\d+$/.test(cleanedContacts)) {
            rowErrors.push({ row: rowNumber, column: 3, columnName: columnNames[3], error: "رقم الاتصال يجب أن يحتوي على أرقام فقط" });
          } else if (cleanedContacts.length !== 11) {
            rowErrors.push({ row: rowNumber, column: 3, columnName: columnNames[3], error: "رقم الاتصال يجب أن يكون 11 رقم" });
          } else if (!cleanedContacts.startsWith('0')) {
            rowErrors.push({ row: rowNumber, column: 3, columnName: columnNames[3], error: "رقم الاتصال يجب أن يبدأ بصفر" });
          }
        }

        // Clean SSN (remove spaces if any)
        const cleanedSSN = ssn ? ssn.replace(/\s/g, '') : '';
        
        // Clean contacts (remove spaces if any)
        const cleanedContacts = contacts ? contacts.replace(/\s/g, '') : '';

        if (!job_en) {
          rowErrors.push({ row: rowNumber, column: 7, columnName: columnNames[7], error: "المسمى الوظيفي (إنجليزي) مطلوب" });
        } else if (!ENGLISH_REGEX.test(job_en)) {
          rowErrors.push({ row: rowNumber, column: 7, columnName: columnNames[7], error: "المسمى الوظيفي (إنجليزي) يجب أن يكون بالإنجليزية" });
        } else if (job_en.length > 255) {
          rowErrors.push({ row: rowNumber, column: 7, columnName: columnNames[7], error: "المسمى الوظيفي (إنجليزي) طويل جداً" });
        }

        if (!job_ar) {
          rowErrors.push({ row: rowNumber, column: 11, columnName: columnNames[11], error: "المسمى الوظيفي (عربي) مطلوب" });
        } else if (!ARABIC_REGEX.test(job_ar)) {
          rowErrors.push({ row: rowNumber, column: 11, columnName: columnNames[11], error: "المسمى الوظيفي (عربي) يجب أن يكون بالعربية" });
        } else if (job_ar.length > 255) {
          rowErrors.push({ row: rowNumber, column: 11, columnName: columnNames[11], error: "المسمى الوظيفي (عربي) طويل جداً" });
        }

        // Lookup IDs
        let universityId: string | null = null;
        let domainId: string | null = null;
        let departmentId: string | null = null;

        try {
          if (universityName) {
            universityId = await findUniversityByName(universityName);
            if (!universityId) {
              rowErrors.push({ row: rowNumber, column: 12, columnName: columnNames[12], error: `الجامعة غير موجودة: ${universityName}` });
            }
          }

          if (domainName && universityId) {
            domainId = await findDomainByName(domainName, universityId);
            if (!domainId) {
              rowErrors.push({ row: rowNumber, column: 13, columnName: columnNames[13], error: `الجهة غير موجودة: ${domainName}` });
            }
          }

          if (departmentName && domainId) {
            departmentId = await findDepartmentByName(departmentName, domainId);
            if (!departmentId) {
              rowErrors.push({ row: rowNumber, column: 14, columnName: columnNames[14], error: `القسم غير موجود: ${departmentName}` });
            }
          }
        } catch (error) {
          rowErrors.push({ row: rowNumber, column: 0, columnName: "Lookup", error: `خطأ في البحث: ${error.message}` });
        }

        // Parse specializations
        const specializations: string[] = [];
        const specializationNames: string[] = [];
        
        for (const specCol of specializationColumns) {
          const cellValue = getCellValue(row.getCell(specCol.colNumber)).trim();
          
          // Check if user has this specialization (نعم or Yes)
          if (cellValue === "نعم" || cellValue === "Yes" || cellValue === "yes") {
            const specId = specializationMap.get(specCol.name);
            if (specId) {
              specializations.push(specId);
              specializationNames.push(specCol.name);
            }
          } else if (cellValue && cellValue !== "لا" && cellValue !== "No" && cellValue !== "no") {
            // Invalid value in specialization column
            rowErrors.push({ 
              row: rowNumber, 
              column: specCol.colNumber, 
              columnName: specCol.name, 
              error: `قيمة غير صالحة. يجب أن تكون 'نعم' أو 'لا' أو فارغة` 
            });
          }
        }

        // Log errors for debugging
        if (rowErrors.length > 0) {
          logger.info(`[bulk-validation] Row ${rowNumber} has ${rowErrors.length} errors:`);
          rowErrors.forEach(err => {
            logger.info(`[bulk-validation]   - Column ${err.column} (${err.columnName}): ${err.error}`);
          });
        }

        // Add errors to main errors array
        errors.push(...rowErrors);

        // If no errors, add to valid data
        if (rowErrors.length === 0) {
          validData.push({
            firstName: { en: firstName_en, ar: firstName_ar },
            midName: { en: midName_en, ar: midName_ar },
            lastName: { en: lastName_en, ar: lastName_ar },
            email,
            ssn: cleanedSSN,
            university: universityId,
            universityName,
            domain: domainId,
            domainName,
            department: departmentId,
            departmentName,
            contacts: cleanedContacts,
            job: { en: job_en, ar: job_ar },
            specializations,
            specializationNames,
            rowNumber,
          });
        }
      }

      // If there are errors, highlight them in the workbook
      let errorFileBuffer: any | undefined;
      if (errors.length > 0) {
        logger.info(`[bulk-validation] Creating error file with ${errors.length} error cells`);
        
        // Create a new workbook from the buffer (this has all the validation sheets)
        const errorWorkbook = new ExcelJS.Workbook();
        await errorWorkbook.xlsx.load(file.buffer as any);
        const errorWorksheet = errorWorkbook.getWorksheet("Requesters");
        
        if (errorWorksheet) {
          // Get unique row numbers with errors
          const errorRowNumbers = new Set(errors.map(e => e.row));
          
          // Create a new workbook with validation sheets
          const newWorkbook = new ExcelJS.Workbook();
          
          // Copy all hidden validation sheets from original workbook
          const validationSheetNames = ['_UniversityList', '_DomainList', '_DepartmentList'];
          validationSheetNames.forEach(sheetName => {
            const sourceSheet = errorWorkbook.getWorksheet(sheetName);
            if (sourceSheet) {
              const newSheet = newWorkbook.addWorksheet(sheetName);
              
              // Copy all rows
              sourceSheet.eachRow((row, rowNumber) => {
                const newRow = newSheet.getRow(rowNumber);
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                  const newCell = newRow.getCell(colNumber);
                  newCell.value = cell.value;
                  if (cell.style) {
                    newCell.style = JSON.parse(JSON.stringify(cell.style));
                  }
                });
                newRow.commit();
              });
              
              // Copy column widths
              sourceSheet.columns.forEach((col, index) => {
                if (newSheet.columns[index]) {
                  newSheet.columns[index].width = col.width;
                }
              });
              
              // Hide the sheet (veryHidden prevents unhiding from Excel UI)
              newSheet.state = 'veryHidden';
            }
          });
          
          // Copy defined names (named ranges) from original workbook
          if (errorWorkbook.model.definedNames) {
            errorWorkbook.model.definedNames.forEach((definedName: any) => {
              try {
                newWorkbook.definedNames.add(definedName.ranges, definedName.name);
                logger.info(`[bulk-validation] Copied defined name: ${definedName.name}`);
              } catch (error) {
                logger.warn(`[bulk-validation] Could not copy defined name ${definedName.name}: ${error.message}`);
              }
            });
          }
          
          // Create the main Requesters worksheet
          const newWorksheet = newWorkbook.addWorksheet("Requesters");
          
          // Copy header row (row 1) with all styling
          const headerRow = errorWorksheet.getRow(1);
          const newHeaderRow = newWorksheet.getRow(1);
          headerRow.eachCell((cell, colNumber) => {
            const newCell = newHeaderRow.getCell(colNumber);
            newCell.value = cell.value;
            if (cell.style) {
              newCell.style = JSON.parse(JSON.stringify(cell.style));
            }
          });
          newHeaderRow.commit();
          
          // Map original row numbers to new row numbers
          const rowMapping = new Map<number, number>();
          let newRowIndex = 2;
          
          // Copy only error rows WITHOUT any highlighting first
          errorRowNumbers.forEach(rowNumber => {
            rowMapping.set(rowNumber, newRowIndex);
            const sourceRow = errorWorksheet.getRow(rowNumber);
            const targetRow = newWorksheet.getRow(newRowIndex);
            
            // Get the domain value for this row to check department validity
            const domainValue = getCellValue(sourceRow.getCell(13)); // Column 13 is domain
            const departmentValue = getCellValue(sourceRow.getCell(14)); // Column 14 is department
            
            // Copy all cells from source to target WITHOUT error styling
            sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              const targetCell = targetRow.getCell(colNumber);
              
              // Special handling for department cell (column 14)
              // Clear it if it doesn't belong to the selected domain
              if (colNumber === 14 && departmentValue && domainValue) {
                // Check if this department belongs to the selected domain
                const rowErrors = errors.filter(e => e.row === rowNumber && e.column === 14);
                if (rowErrors.length > 0) {
                  // Department has an error - clear it so user can select from dropdown
                  targetCell.value = '';
                  logger.info(`[bulk-validation] Cleared invalid department value for row ${rowNumber}`);
                } else {
                  targetCell.value = cell.value;
                }
              } else {
                targetCell.value = cell.value;
              }
              
              // Only copy style if it's NOT an error cell (not red background)
              if (cell.style) {
                const hasRedBackground = 
                  cell.style.fill && 
                  cell.style.fill.type === 'pattern' && 
                  cell.style.fill.fgColor && 
                  (cell.style.fill.fgColor.argb === 'FFFF0000' || cell.style.fill.fgColor.argb === 'FF0000');
                
                if (!hasRedBackground) {
                  // Copy normal styling (not error styling)
                  targetCell.style = JSON.parse(JSON.stringify(cell.style));
                } else {
                  // This was an error cell - copy only basic styling without the red background
                  if (cell.style.font && !cell.style.font.color) {
                    targetCell.font = JSON.parse(JSON.stringify(cell.style.font));
                  }
                  if (cell.style.alignment) {
                    targetCell.alignment = JSON.parse(JSON.stringify(cell.style.alignment));
                  }
                  if (cell.style.border) {
                    targetCell.border = JSON.parse(JSON.stringify(cell.style.border));
                  }
                  // Don't copy fill or font color from error cells
                }
              }
            });
            
            targetRow.commit();
            newRowIndex++;
          });
          
          // Apply column widths from original
          errorWorksheet.columns.forEach((col, index) => {
            if (newWorksheet.columns[index]) {
              newWorksheet.columns[index].width = col.width;
            }
          });
          
          // Protect the worksheet but allow editing most cells
          // Lock University (col 9), Domain (col 10), Department (col 11) columns
          await newWorksheet.protect('', {
            selectLockedCells: true,
            selectUnlockedCells: true,
            formatCells: true,
            formatColumns: false,
            formatRows: false,
            insertColumns: false,
            insertRows: false,
            deleteColumns: false,
            deleteRows: false,
          });
          
          // Unlock all cells first
          newWorksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
              cell.protection = { locked: false };
            });
          });
          
          // Lock only University (col 12), Domain (col 13), Department (col 14) columns
          for (let rowNum = 1; rowNum <= newWorksheet.rowCount; rowNum++) {
            // Lock University column (12)
            newWorksheet.getRow(rowNum).getCell(12).protection = { locked: true };
            // Lock Domain column (13)
            newWorksheet.getRow(rowNum).getCell(13).protection = { locked: true };
            // Lock Department column (14)
            newWorksheet.getRow(rowNum).getCell(14).protection = { locked: true };
          }
          
          logger.info(`[bulk-validation] Protected University, Domain, and Department columns`);
          
          // Apply data validations to the new worksheet (only for unlocked columns)
          const totalRows = newRowIndex - 1; // Number of data rows (excluding header)
          
          // Remove University, Domain, Department dropdowns since they're locked
          // Keep only Specialization dropdowns
          
          // Specialization dropdowns (columns after 14)
          // Find specialization columns from header
          const specializationStartCol = 15;
          headerRow.eachCell((cell, colNumber) => {
            if (colNumber >= specializationStartCol) {
              const headerValue = cell.value?.toString() || '';
              if (headerValue && specializationMap.has(headerValue)) {
                // Apply Yes/No dropdown to this column
                newWorksheet.getColumn(colNumber).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
                  if (rowNumber > 1) {
                    cell.dataValidation = {
                      type: 'list',
                      allowBlank: true,
                      formulae: ['"نعم,لا"'],
                      showErrorMessage: true,
                      errorTitle: 'قيمة غير صالحة',
                      error: 'يرجى اختيار نعم أو لا',
                    };
                  }
                });
              }
            }
          });
          
          // NOW apply error highlighting ONLY to specific error cells
          logger.info(`[bulk-validation] Applying red highlighting to ${errors.length} error cells`);
          errors.forEach(error => {
            if (error.row > 0 && error.column > 0) {
              const newRowNumber = rowMapping.get(error.row);
              if (newRowNumber) {
                logger.info(`[bulk-validation] Highlighting cell at new row ${newRowNumber}, column ${error.column}`);
                const targetRow = newWorksheet.getRow(newRowNumber);
                const cell = targetRow.getCell(error.column);
                
                // Apply red background to THIS cell only
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFF0000" }, // Red background
                };
                
                // Apply white text
                cell.font = {
                  ...cell.font,
                  color: { argb: "FFFFFFFF" }, // White text
                  bold: true,
                };
                
                // Add comment with error message
                cell.note = error.error;
                
                targetRow.commit();
              }
            }
          });

          // Copy Instructions sheet last (if exists) so it appears after Requesters
          const instructionsSheet = errorWorkbook.getWorksheet("Instructions");
          if (instructionsSheet) {
            const newInstructions = newWorkbook.addWorksheet("Instructions");
            
            // Copy all rows
            instructionsSheet.eachRow((row, rowNumber) => {
              const newRow = newInstructions.getRow(rowNumber);
              row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const newCell = newRow.getCell(colNumber);
                newCell.value = cell.value;
                if (cell.style) {
                  newCell.style = JSON.parse(JSON.stringify(cell.style));
                }
              });
              newRow.commit();
            });
            
            // Copy column widths
            instructionsSheet.columns.forEach((col, index) => {
              if (newInstructions.columns[index]) {
                newInstructions.columns[index].width = col.width;
              }
            });
            
            // Copy merged cells
            if (instructionsSheet.model.merges) {
              instructionsSheet.model.merges.forEach(merge => {
                newInstructions.mergeCells(merge);
              });
            }
            
            logger.info(`[bulk-validation] Copied Instructions sheet to error file`);
          }

          // Generate buffer with only error rows
          errorFileBuffer = (await newWorkbook.xlsx.writeBuffer()) as any;
          logger.info(`[bulk-validation] Error file created with ${errorRowNumbers.size} error rows and validation sheets`);
        }
      }

      results.push({
        filename: file.originalname,
        hasErrors: errors.length > 0,
        validRowCount: validData.length,
        invalidRowCount: errors.length > 0 ? worksheet.rowCount - 2 - validData.length : 0,
        totalRowCount: worksheet.rowCount - 2, // Exclude header and example rows
        errors,
        validData,
        errorFileBuffer,
      });

      logger.info(`[bulk-validation] File ${file.originalname}: ${validData.length} valid, ${errors.length} errors`);

    } catch (error) {
      logger.error(`[bulk-validation] Error processing file ${file.originalname}: ${error.message}`);
      results.push({
        filename: file.originalname,
        hasErrors: true,
        validRowCount: 0,
        invalidRowCount: 0,
        totalRowCount: 0,
        errors: [{ row: 0, column: 0, columnName: "ملف", error: `خطأ في المعالجة: ${error.message}` }],
        validData: [],
      });
    }
  }

  logger.info(`[bulk-validation] Validation complete for ${files.length} files`);
  return results;
};
