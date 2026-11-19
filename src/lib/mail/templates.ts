import "server-only";

import { appUrl, type Mail } from "./index";

const escape = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );

const layout = (
  title: string,
  body: string,
  link: string,
  cta: string,
) => `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7fafc;font-family:Arial,Helvetica,sans-serif;color:#091225">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;padding:32px">
<tr><td style="font-size:22px;font-weight:700;color:#187cfa">Liggo</td></tr>
<tr><td style="padding-top:16px;font-size:20px;font-weight:700">${escape(title)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.5">${body}</td></tr>
<tr><td style="padding:24px 0"><a href="${link}" style="background:#187cfa;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;display:inline-block">${escape(cta)}</a></td></tr>
<tr><td style="font-size:12px;color:#52606d">Se o botão não abrir, copie este endereço no navegador:<br>${link}</td></tr>
</table></td></tr></table></body></html>`;

export function resetPasswordMail(
  to: string,
  name: string,
  token: string,
): Mail {
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject: "Crie uma nova senha no Liggo",
    text: `Olá, ${name}.\n\nRecebemos um pedido para criar uma nova senha na sua conta do Liggo. O link vale por 1 hora e só funciona uma vez:\n\n${link}\n\nSe não foi você, ignore este e-mail: a sua senha continua a mesma.`,
    html: layout(
      "Crie uma nova senha",
      `Olá, ${escape(name)}. Recebemos um pedido para criar uma nova senha na sua conta. O link vale por 1 hora e só funciona uma vez. Se não foi você, ignore este e-mail.`,
      link,
      "Criar nova senha",
    ),
  };
}

export function inviteMail(
  to: string,
  organization: string,
  inviter: string,
  role: "OWNER" | "MEMBER",
  token: string,
): Mail {
  const link = `${appUrl()}/invite?token=${encodeURIComponent(token)}`;
  const papel = role === "OWNER" ? "proprietário" : "membro";
  return {
    to,
    subject: `${inviter} convidou você para ${organization} no Liggo`,
    text: `${inviter} convidou você para participar de ${organization} no Liggo, como ${papel}.\n\nCrie a sua conta pelo link (vale por 7 dias):\n\n${link}\n\nSe você não esperava este convite, ignore este e-mail.`,
    html: layout(
      `Convite para ${organization}`,
      `${escape(inviter)} convidou você para participar de <b>${escape(organization)}</b> no Liggo, como ${papel}. O convite vale por 7 dias.`,
      link,
      "Aceitar convite",
    ),
  };
}
