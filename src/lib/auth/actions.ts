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
    fieldErrors.email =
      "Esse e-mail não parece válido. Confira se há @ e domínio.";
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

export type SignUpState = {
  values: { organization: string; name: string; email: string };
  error?: string;
  fieldErrors?: {
    organization?: string;
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  };
};

const MIN_PASSWORD_LENGTH = 8;

export async function signUpAction(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const organization = String(formData.get("organization") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const terms = formData.get("terms") === "on";

  const values = { organization, name, email };
  const fieldErrors: NonNullable<SignUpState["fieldErrors"]> = {};

  if (organization.length < 2)
    fieldErrors.organization = "Informe o nome da organização.";
  if (name.length < 2) fieldErrors.name = "Informe o nome do responsável.";
  if (!email) fieldErrors.email = "Informe seu e-mail.";
  else if (!EMAIL_PATTERN.test(email))
    fieldErrors.email =
      "Esse e-mail não parece válido. Confira se há @ e domínio.";
  if (password.length < MIN_PASSWORD_LENGTH)
    fieldErrors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (!confirmPassword) fieldErrors.confirmPassword = "Repita a senha.";
  else if (confirmPassword !== password)
    fieldErrors.confirmPassword = "As senhas não coincidem.";
  if (!terms) fieldErrors.terms = "Aceite os termos para criar a conta.";

  if (Object.keys(fieldErrors).length > 0) {
    return { values, fieldErrors };
  }

  // Cadastro ainda não implementado: não simulamos sucesso.
  return {
    values,
    error:
      "O cadastro ainda não está conectado. Os dados foram validados, mas nenhuma conta foi criada.",
  };
}

export type ForgotPasswordState = {
  email: string;
  error?: string;
  fieldError?: string;
};

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) return { email, fieldError: "Informe seu e-mail." };
  if (!EMAIL_PATTERN.test(email))
    return {
      email,
      fieldError: "Esse e-mail não parece válido. Confira se há @ e domínio.",
    };

  // Recuperação de senha ainda não implementada: não simulamos o envio.
  return {
    email,
    error:
      "A recuperação de senha ainda não está conectada. O e-mail foi validado, mas nenhum link foi enviado.",
  };
}
