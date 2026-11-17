"use server";

export type SignInRole = "organizer" | "admin";

export type SignInState = {
  email: string;
  error?: string;
  fieldErrors?: { email?: string; password?: string };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<SignInState["fieldErrors"]> = {};
  if (!email) fieldErrors.email = "Informe seu e-mail.";
  else if (!EMAIL_PATTERN.test(email))
    fieldErrors.email = "Esse e-mail não parece válido. Confira se há @ e domínio.";
  if (!password) fieldErrors.password = "Informe sua senha.";

  if (fieldErrors.email || fieldErrors.password) {
    return { email, fieldErrors };
  }

  // Autenticação ainda não implementada: não simulamos sucesso.
  return {
    email,
    error:
      "O acesso ainda não está conectado. Os dados foram validados, mas nenhuma sessão foi criada.",
  };
}
