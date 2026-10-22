import nodemailer from "nodemailer";

interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface MailResult {
  delivered: boolean;
  previewUrl?: string;
}

const hasSmtpConfig =
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_PORT) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS) &&
  Boolean(process.env.SMTP_FROM);

const buildTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

export const sendMail = async (payload: MailPayload): Promise<MailResult> => {
  if (!hasSmtpConfig) {
    console.log("Email delivery skipped because SMTP is not configured.");
    console.log(`To: ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log(payload.text);
    return { delivered: false };
  }

  const transporter = buildTransport();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    ...payload,
  });

  return {
    delivered: true,
    previewUrl: nodemailer.getTestMessageUrl(info) || undefined,
  };
};
