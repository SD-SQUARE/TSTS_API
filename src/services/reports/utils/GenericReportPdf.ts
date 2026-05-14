import puppeteer from "puppeteer";
import { Lang } from "../../../types/lang.types.js";

export class GenericReportPdf {
    static async generatePdfBuffer(
        report: any,
        data: any[],
        columns: any[],
        language: Lang
    ): Promise<Buffer> {
        const html = this.generateHtmlTemplate(report, data, columns, language);

        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                landscape: true,
                margin: {
                    top: '20mm',
                    right: '10mm',
                    bottom: '20mm',
                    left: '10mm'
                },
                printBackground: true
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }

    private static generateHtmlTemplate(
        report: any,
        data: any[],
        columns: any[],
        language: Lang
    ): string {
        const title = report.title[language] || report.title.en || 'Report';
        const description = report.description?.[language] || report.description?.en || '';
        const direction = language === 'ar' ? 'rtl' : 'ltr';
        const fontFamily = language === 'ar' ? 'Arial, sans-serif' : 'Arial, sans-serif';

        return `
            <!DOCTYPE html>
            <html dir="${direction}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: ${fontFamily};
                        font-size: 12px;
                        line-height: 1.6;
                        color: #333;
                        padding: 20px;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #4CAF50;
                        padding-bottom: 15px;
                    }
                    
                    .header h1 {
                        color: #2c3e50;
                        font-size: 24px;
                        margin-bottom: 10px;
                    }
                    
                    .header p {
                        color: #7f8c8d;
                        font-size: 14px;
                    }
                    
                    .meta-info {
                        margin-bottom: 20px;
                        padding: 10px;
                        background-color: #f8f9fa;
                        border-radius: 5px;
                    }
                    
                    .meta-info p {
                        margin: 5px 0;
                        font-size: 11px;
                        color: #666;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    
                    thead {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    
                    th {
                        padding: 12px 8px;
                        text-align: ${direction === 'rtl' ? 'right' : 'left'};
                        font-weight: 600;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        border: 1px solid #ddd;
                    }
                    
                    td {
                        padding: 10px 8px;
                        text-align: ${direction === 'rtl' ? 'right' : 'left'};
                        border: 1px solid #ddd;
                        font-size: 11px;
                    }
                    
                    tbody tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    
                    tbody tr:hover {
                        background-color: #e9ecef;
                    }
                    
                    .footer {
                        margin-top: 30px;
                        padding-top: 15px;
                        border-top: 2px solid #e0e0e0;
                        text-align: center;
                        font-size: 10px;
                        color: #999;
                    }
                    
                    .no-data {
                        text-align: center;
                        padding: 40px;
                        color: #999;
                        font-style: italic;
                    }
                    
                    @media print {
                        body {
                            padding: 10px;
                        }
                        
                        .header {
                            page-break-after: avoid;
                        }
                        
                        table {
                            page-break-inside: auto;
                        }
                        
                        tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                        
                        thead {
                            display: table-header-group;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${this.escapeHtml(title)}</h1>
                    ${description ? `<p>${this.escapeHtml(description)}</p>` : ''}
                </div>
                
                <div class="meta-info">
                    <p><strong>${language === 'ar' ? 'تاريخ الإنشاء' : 'Generated on'}:</strong> ${new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</p>
                    <p><strong>${language === 'ar' ? 'إجمالي السجلات' : 'Total Records'}:</strong> ${data.length}</p>
                </div>
                
                ${data.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                ${columns.map(col => `<th>${this.escapeHtml(col.label)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(row => `
                                <tr>
                                    ${columns.map(col => {
            let value = row[col.key];

            // Format different data types
            if (value === null || value === undefined) {
                value = '-';
            } else if (typeof value === 'number') {
                value = value.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');
            } else if (typeof value === 'object' && value.en) {
                // Handle JSONB fields
                value = value[language] || value.en;
            } else if (value instanceof Date) {
                value = value.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
            }

            return `<td>${this.escapeHtml(String(value))}</td>`;
        }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="no-data">
                        ${language === 'ar' ? 'لا توجد بيانات لعرضها' : 'No data available'}
                    </div>
                `}
                
                <div class="footer">
                    <p>${language === 'ar' ? 'تم إنشاء هذا التقرير تلقائيًا بواسطة نظام TSTS' : 'This report was automatically generated by TSTS System'}</p>
                </div>
            </body>
            </html>
        `;
    }

    private static escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}
