import "server-only";

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { chooseTransport } from "./transport";

export class MailNotConfiguredError extends Error {
  constructor() {
    super(
      "O envio de e-mail não está configurado (defina SMTP_HOST e as demais variáveis SMTP_*).",
    );
  }
}

/** Public address of the app, for links in e-mails. */
export function appUrl(): string {
  return (process.env.APP_URL?.trim() || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export type Mail = { to: string; subject: string; text: string; html?: string };

export async function sendMail(mail: Mail): Promise<void> {
  const kind = chooseTransport(process.env);
  if (kind === "none") throw new MailNotConfiguredError();

  if (kind === "outbox") {
    await prisma.outboundEmail.create({
      data: { toEmail: mail.to, subject: mail.subject, text: mail.text },
    });
    console.log(
      `\n[e-mail de desenvolvimento] Para: ${mail.to}\nAssunto: ${mail.subject}\n${mail.text}\n`,
    );
    return;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transporter.sendMail({
    from: process.env.MAIL_FROM?.trim() || "Liggo <no-reply@liggo.local>",
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}
