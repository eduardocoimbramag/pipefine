# Como criar contas e autorizar e-mails — Pipefine

Guia prático para dar acesso a mais pessoas no sistema **em funcionamento**.
Para entender como o login funciona por dentro, veja [`login.md`](./login.md).

---

## Resposta curta

**Sim, cada pessoa precisa de uma conta própria** (e-mail + senha). Não existe
convite por link nem acesso por "permissão de e-mail" sozinho — o e-mail
autorizado só libera a pessoa a **se cadastrar**; a conta ainda precisa existir.

Há dois caminhos:

| Caminho | Quando usar | Precisa de redeploy? |
|---|---|---|
| **A — Criar direto no Supabase** | Quer resolver agora, você mesmo define a senha | Não |
| **B — Autorizar o e-mail e a pessoa se cadastra** | A pessoa escolhe a própria senha | Sim, se estiver publicado |

> **Estado atual:** a variável `ALLOWED_SIGNUP_EMAILS` está **vazia**, ou seja, a
> aba "Criar conta" recusa todo mundo hoje. Enquanto ela ficar assim, use o
> caminho A.

---

## Caminho A — Criar a conta direto no Supabase (recomendado)

Funciona mesmo com a lista de autorizados vazia e vale na hora, sem redeploy.

1. Acesse <https://supabase.com/dashboard> e abra o projeto do Pipefine.
2. Menu lateral → **Authentication** → **Users**.
3. Botão **Add user** → **Create new user**.
4. Preencha **Email** e **Password**.
5. **Marque "Auto Confirm User".** Sem isso a pessoa precisa clicar num link de
   confirmação no e-mail antes de conseguir entrar.
6. **Create user**.
7. Passe o e-mail e a senha para a pessoa. Ela entra normalmente pela tela de
   login e pode trocar a senha depois com você pelo Supabase.

Pronto. O perfil interno é criado sozinho (veja abaixo).

---

## Caminho B — Autorizar o e-mail e deixar a pessoa se cadastrar

Use se preferir que cada pessoa defina a própria senha.

### 1. Adicione o e-mail à lista

A lista é a variável de ambiente `ALLOWED_SIGNUP_EMAILS`, com e-mails separados
por vírgula.

**No seu computador:** edite `.env.local` e reinicie o `npm run dev`.

```env
ALLOWED_SIGNUP_EMAILS=voce@gmail.com, fulano@gmail.com, ciclana@gmail.com
```

**No sistema publicado (Vercel):**
1. <https://vercel.com> → projeto → **Settings → Environment Variables**
2. Crie ou edite `ALLOWED_SIGNUP_EMAILS`
3. **Deployments → ⋯ → Redeploy** — sem redeploy a mudança não vale

### 2. A pessoa cria a conta

Na tela de login → aba **Criar conta** → nome, **o mesmo e-mail autorizado** e
senha (mínimo 6 caracteres).

Se a confirmação por e-mail estiver ligada no Supabase, ela recebe um link e só
entra depois de clicar. Para desligar: **Authentication → Sign In / Providers →
Email → Confirm email**.

---

## O que acontece depois que a conta é criada

- O perfil em `users_profile` é criado **automaticamente** por um gatilho do
  banco (`on_auth_user_created`). Não precisa cadastrar nada à mão.
- O nome vem do que foi digitado no cadastro; se a conta foi criada pelo
  Supabase, vira a parte do e-mail antes do `@`. Dá para corrigir em
  **Configurações → Usuários e perfis**.
- O papel inicial é **Comercial**. Você pode mudar para Admin, Operacional ou
  Financeiro em **Configurações → Usuários e perfis**.
- A pessoa já aparece no campo **Responsável** de leads e eventos.

### ⚠️ Atenção: papel não restringe acesso

Hoje **todo usuário autenticado enxerga e edita tudo** — todas as empresas,
leads, eventos e o financeiro. Os papéis existem no cadastro mas ainda não
limitam nada. Só dê acesso a quem pode ver o negócio inteiro.

---

## Como tirar o acesso de alguém

O que funciona de verdade é remover a conta no Supabase:

1. **Authentication → Users** → localize a pessoa
2. **Delete user** (remove o acesso) ou **Ban user** (bloqueia temporariamente)
3. Se o e-mail estava em `ALLOWED_SIGNUP_EMAILS`, tire de lá também, senão ela
   se cadastra de novo

O que **não** basta:

- Tirar o e-mail de `ALLOWED_SIGNUP_EMAILS` — isso só impede cadastros novos,
  quem já tem conta continua entrando.
- Desmarcar o usuário como ativo — ele apenas some do campo "Responsável",
  o login continua funcionando.

---

## Problemas comuns

**"Este e-mail não está autorizado a criar uma conta."**
O e-mail não está em `ALLOWED_SIGNUP_EMAILS`, ou está escrito diferente
(espaço, maiúscula, domínio trocado). Se publicado, confirme que houve
**Redeploy** após alterar a variável.

**Criei a conta mas a pessoa não consegue entrar.**
Provavelmente falta confirmar o e-mail. No Supabase, em **Authentication →
Users**, veja se o usuário está confirmado; recrie com **Auto Confirm User**
marcado ou desligue a confirmação por e-mail.

**"Muitas tentativas de login. Tente novamente em X minuto(s)."**
Proteção contra força bruta, por e-mail e por IP. É só esperar o tempo indicado.

**Esqueceu a senha.**
**Authentication → Users → ⋯ → Reset password** (ou defina uma nova senha por
ali e entregue à pessoa).
