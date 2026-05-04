export const generateOTPEmail = (
  userNameEn: string,
  userNameAr: string,
  otp: string,
): string => {
  const primaryBlue = "#021d40";
  const brandAccent = "#e0a10d";
  const bgColor = "#f4f4f4";
  const cardColor = "#ffffff";
  // TODO: Replace with actual logo URL 
  const cdn_url = process.env.PROTOCOL + '://' + process.env.HOST + ':' + process.env.PORT + '/';
  const image_path= 'assets/logos/university-logo.png';
  const logoUrl = cdn_url + image_path; 

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @media only screen and (max-width: 600px) {
                .main-card {
                    width: 100% !important;
                    padding: 20px !important;
                }
                .otp-box {
                    padding: 15px 10% !important;
                    width: 80% !important;
                }
            }
        </style>
        <title>Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 40px 0 40px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: ${cardColor}; border-radius: 8px; padding: 40px;">
                
                <!-- Logo -->
                <tr>
                    <td align="left" style="padding-bottom: 30px;">
                        <img 
                        src="${logoUrl}" 
                        alt="Logo" 
                        width="100" 
                        style="display: block; width: 100px; max-width: 100%; height: auto;" 
                        />
                    </td>
                </tr>

                <!-- English Section -->
                <tr>
                <td align="left" style="color: #333333; line-height: 1.6;">
                    <h2 style="margin-top: 0; color: ${primaryBlue};">Hello ${userNameEn},</h2>
                    <p>Please use the following verification code to complete your password reset:</p>
                </td>
                </tr>

                <!-- OTP Box (English) -->
                <tr>
                <td align="center" style="padding: 20px 0 30px 0;">
                    <div style="display: inline-block; padding: 15px 40px; border: 2.5px solid ${brandAccent}; border-radius: 12px; background-color: transparent;">
                    <span style="font-size: 36px; font-weight: 800; color: ${brandAccent}; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">
                        ${otp}
                    </span>
                    </div>
                </td>
                </tr>

                <tr>
                <td align="left" style="border-bottom: 1px solid #eeeeee; padding-bottom: 30px; margin-bottom: 30px; font-size: 14px; color: #666666;">
                    This code is valid for 3 minutes. 
                    <br /><br />
                    Need help? Contact <a href="mailto:support@yourdomain.com" style="color: ${primaryBlue}; text-decoration: none; font-weight: bold;">support@yourdomain.com</a>
                </td>
                </tr>

                <!-- Arabic Section (RTL) -->
                <tr>
                <td align="right" dir="rtl" style="color: #333333; line-height: 1.6; padding-top: 30px;">
                    <h2 style="margin-top: 0; color: ${primaryBlue};">أهلاً ${userNameAr}</h2>
                    <p>يرجى استخدام رمز التحقق التالي لإتمام إعادة تعيين كلمة المرور:</p>
                </td>
                </tr>

                <!-- OTP Box (Arabic) -->
                <tr>
                <td align="center" style="padding: 20px 0 30px 0;">
                    <div style="display: inline-block; padding: 15px 40px; border: 2.5px solid ${brandAccent}; border-radius: 12px; background-color: transparent;">
                    <span style="font-size: 36px; font-weight: 800; color: ${brandAccent}; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">
                        ${otp}
                    </span>
                    </div>
                </td>
                </tr>

                <tr>
                <td align="right" dir="rtl" style="font-size: 14px; color: #666666;">
                    هذا الرمز صالح لمدة 3 دقائق.
                    <br /><br />
                    تحتاج مساعدة؟ تواصل معنا عبر <a href="mailto:support@yourdomain.com" style="color: ${primaryBlue}; text-decoration: none; font-weight: bold;">support@yourdomain.com</a>
                </td>
                </tr>

                <!-- Footer -->
                <tr>
                <td align="center" style="padding-top: 40px; font-size: 11px; color: #aaaaaa; text-transform: uppercase; letter-spacing: 1px;">
                    Secure Verification System
                </td>
                </tr>

            </table>
            </td>
        </tr>
        </table>
    </body>
    </html>
`;
};
