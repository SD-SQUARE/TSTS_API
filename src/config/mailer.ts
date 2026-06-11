import nodemailer from "nodemailer";


const isProd = process.env.NODE_ENV === "production";

export const transporter = nodemailer.createTransport(
  isProd
    ? {
        // ✅ Production → Gmail
        service: "gmail",
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS, // App Password
        },
      }
    : {
        // ✅ Development → Mailtrap
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      }
);

/**
 * Sends an email using the configured transporter.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The email subject.
 * @param {string} html - The email body in HTML format.
 * @returns {Promise<void>} A promise that resolves when the email is sent successfully.
 */
export const sendMail = async (to: string, subject: string, html: string) => {
  await transporter.sendMail({
    from: `${process.env.MAIL_USER}`,
    to,
    subject,
    html,
  });
};
