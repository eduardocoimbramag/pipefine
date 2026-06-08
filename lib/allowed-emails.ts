/**
 * Controle de quem pode CRIAR uma conta no Pipefine.
 *
 * A lista de e-mails autorizados vem da variável de ambiente
 * `ALLOWED_SIGNUP_EMAILS` (separados por vírgula). Apenas esses e-mails
 * conseguem se cadastrar pela tela "Criar conta". Qualquer outro é recusado.
 *
 * Exemplo:
 *   ALLOWED_SIGNUP_EMAILS=voce@gmail.com, mae@gmail.com, irma@gmail.com
 *
 * Observações de segurança:
 * - É lido apenas no servidor (Server Action), nunca exposto ao navegador.
 * - O login (entrar) NÃO é afetado — só o cadastro de novas contas.
 * - Se a variável estiver vazia/ausente, NINGUÉM consegue se cadastrar
 *   (cadastro fica fechado por padrão — escolha segura).
 */

/** Retorna a lista normalizada de e-mails autorizados a se cadastrar. */
export function getAllowedSignupEmails(): string[] {
  const raw = process.env.ALLOWED_SIGNUP_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/** Verifica se um e-mail está autorizado a criar conta. */
export function isEmailAllowedToSignup(email: string): boolean {
  const allowed = getAllowedSignupEmails();
  if (allowed.length === 0) return false; // cadastro fechado por padrão
  return allowed.includes(email.trim().toLowerCase());
}
