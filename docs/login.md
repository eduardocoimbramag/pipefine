# Login e controle de acesso — Pipefine

Este documento explica **como funciona o login** do Pipefine e **como controlar
quem pode acessar o sistema** (só você, sua mãe e quem mais você autorizar).

---

## Resumo rápido

- O login usa **Supabase Auth** (e-mail + senha).
- **Entrar** exige uma conta já existente — ninguém entra sem login e senha.
- **Criar conta** é restrito: só **e-mails que você autorizar** conseguem se
  cadastrar. Qualquer outro e-mail é recusado.
- Todas as páginas internas são protegidas: quem não está logado é redirecionado
  para a tela de login.

---

## Como funciona, por dentro

### 1. Entrar (login)
Na tela inicial (`/login`), a aba **"Entrar"** pede e-mail e senha. O sistema
valida no Supabase. Se estiver correto, cria uma sessão (cookie) e leva ao
Dashboard. Se errar, mostra "E-mail ou senha incorretos".

### 2. Criar conta (cadastro) — **restrito**
A aba **"Criar conta"** existe, mas o cadastro só é concluído se o e-mail estiver
na **lista de e-mails autorizados**. Essa lista é definida por você na variável de
ambiente `ALLOWED_SIGNUP_EMAILS`.

- E-mail **na lista** → conta criada, a pessoa já pode entrar.
- E-mail **fora da lista** → recusado, com a mensagem:
  _"Este e-mail não está autorizado a criar uma conta. Fale com o administrador
  do sistema."_
- Lista **vazia** → cadastro **totalmente fechado** (ninguém novo se cadastra).

> A verificação acontece **no servidor** (não dá para burlar pelo navegador), e a
> lista de e-mails **nunca é exposta** publicamente.

### 3. Proteção das páginas
O arquivo `proxy.ts` intercepta toda navegação: se não houver sessão válida,
redireciona para `/login`. Ou seja, mesmo que alguém descubra a URL de uma página
interna, não consegue ver nada sem estar logado.

### 4. Onde isso está no código
- Telas e ações de login: `app/login/`
- Regra de e-mails autorizados: `lib/allowed-emails.ts`
- Proteção de rotas: `proxy.ts` + `lib/supabase/middleware.ts`

---

## Como autorizar uma nova pessoa (passo a passo)

Autorizar alguém tem **2 passos**: (1) colocar o e-mail na lista e (2) a pessoa
criar a conta (ou você criar para ela).

### Passo 1 — Adicionar o e-mail à lista autorizada

A lista fica na variável `ALLOWED_SIGNUP_EMAILS`, com e-mails separados por
vírgula.

**No seu computador (desenvolvimento):** edite o arquivo `.env.local`:

```env
ALLOWED_SIGNUP_EMAILS=voce@gmail.com, mae@gmail.com, padrasto@gmail.com, irma@gmail.com
```

**No site publicado (Vercel):**
1. Acesse o projeto em <https://vercel.com> → **Settings → Environment Variables**
2. Crie/edite a variável `ALLOWED_SIGNUP_EMAILS` com os e-mails separados por
   vírgula
3. Faça um **Redeploy** (Deployments → ⋯ → Redeploy) para aplicar

> Sempre que adicionar/remover alguém, basta atualizar essa variável.

### Passo 2 — A pessoa cria a conta

Com o e-mail já autorizado, a pessoa:
1. Acessa o sistema → tela de login
2. Vai na aba **"Criar conta"**
3. Preenche nome, **o mesmo e-mail autorizado** e uma senha (mín. 6 caracteres)
4. Pronto — já consegue entrar

### Alternativa — você cria a conta pela pessoa (Supabase)

Se preferir não depender da aba "Criar conta", você pode criar o usuário direto:

1. Supabase Dashboard → **Authentication → Users → Add user**
2. Informe e-mail e senha e confirme
3. Entregue o e-mail/senha para a pessoa

Nesse caso, o e-mail nem precisa estar na lista (a restrição é só para o
auto-cadastro pela tela). O perfil interno (`users_profile`) é criado
automaticamente no primeiro acesso.

---

## Como REVOGAR o acesso de alguém

Tirar o e-mail da lista **impede novos cadastros**, mas **não desconecta** quem já
tem conta. Para bloquear de fato alguém que já tinha login:

1. Supabase Dashboard → **Authentication → Users**
2. Encontre a pessoa e use **Delete user** (remove o acesso) ou **Ban** (bloqueia
   temporariamente)
3. (Opcional) remova o e-mail de `ALLOWED_SIGNUP_EMAILS` para ela não se
   recadastrar

---

## Perfis de acesso (papéis)

Cada usuário tem um **papel**: Admin, Comercial, Operacional ou Financeiro,
ajustável em **Configurações** dentro do sistema. Hoje todos os usuários
autenticados enxergam os mesmos dados (negócio de família); os papéis já existem
para, no futuro, restringir o que cada um vê/faz.

---

## Boas práticas de segurança

- Use **senhas fortes** e diferentes para cada pessoa.
- Não compartilhe o mesmo login entre várias pessoas — crie um para cada uma.
- Se desconfiar que uma senha vazou, troque-a no Supabase
  (**Authentication → Users → ⋯ → Reset password**).
- Mantenha a lista `ALLOWED_SIGNUP_EMAILS` enxuta — só quem realmente precisa.

---

## Perguntas frequentes

**Qualquer pessoa que achar o site consegue entrar?**
Não. Sem login e senha de uma conta existente, ninguém passa da tela de login. E
só e-mails autorizados conseguem criar conta.

**Esqueci/atualizei a lista e a pessoa não consegue se cadastrar.**
Confirme que o e-mail digitado é **idêntico** ao da lista e que, na Vercel, você
fez **Redeploy** após alterar a variável.

**Quero fechar completamente novos cadastros.**
Deixe `ALLOWED_SIGNUP_EMAILS` **vazio**. A partir daí, novas contas só pelo painel
do Supabase.
