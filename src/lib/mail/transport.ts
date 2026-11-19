/** Where an e-mail goes. Pure so it can be tested. */
export type TransportKind = "smtp" | "outbox" | "none";

export function chooseTransport(env: {
  SMTP_HOST?: string;
  NODE_ENV?: string;
}): TransportKind {
  if (env.SMTP_HOST?.trim()) return "smtp";
  // Without SMTP, development keeps the message in the database; production refuses.
  return env.NODE_ENV === "production" ? "none" : "outbox";
}
