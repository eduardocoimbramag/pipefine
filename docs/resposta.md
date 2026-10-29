# Precisa de todas essas variáveis na Vercel?

**Não.** Você está certo: o Supabase só entrega **3 valores** (URL, Publishable e
Secret). O código do Pipefine lê só **3 variáveis do Supabase**, mais 1 do
próprio app.

---

## O que o código realmente usa

Busquei todos os `process.env` do projeto. São só estes:

| Variável | Valor do Supabase | Onde é usada |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **URL** (`https://xxxx.supabase.co`) | Todos os clientes (`lib/supabase/*`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Publishable** (`sb_publishable_...`) | Navegador, servidor e proxy |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** (`sb_secret_...`) | Só no servidor, para o bloqueio de tentativas de login |
| `ALLOWED_SIGNUP_EMAILS` | — (não é do Supabase) | Lista de e-mails que podem usar "Criar conta" |

O nome da variável **não precisa** ser igual ao nome da chave no painel do
Supabase. A Publishable vai em `NEXT_PUBLIC_SUPABASE_ANON_KEY` e a Secret vai
em `SUPABASE_SERVICE_ROLE_KEY`, porque são esses os nomes que o código lê.

---

## O que pode ser apagado

Nenhuma destas variáveis é lida pelo código:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_JWT_SECRET`
- e as `POSTGRES_*` (`POSTGRES_URL`, `POSTGRES_PASSWORD`, etc.), se aparecerem
  mais abaixo na lista

Elas não quebram nada, mas também não fazem nada. A `SUPABASE_JWT_SECRET` e as
`POSTGRES_*` ainda dão acesso total ao banco **antigo**, então é melhor apagar.

---

## Por que tem tanta variável? (pode ser a chave do seu problema)

O ícone verde de raio ao lado de cada variável, com todas criadas no mesmo dia
(**Jun 8**), mostra que elas **não foram digitadas à mão**. Elas foram criadas
pela **integração Supabase da Vercel** (Vercel Marketplace). Essa integração
cria todos esses nomes de uma vez, para servir a qualquer tipo de projeto.

Isso quer dizer que **o projeto Supabase antigo provavelmente foi criado pela
Vercel**. Nesse caso, a conta pode estar ligada à **sua conta da Vercel**, e não
a um e-mail que você digitou.

**Antes de desistir dos dados, tente isto:**

1. Vercel → aba **Storage** (ou **Integrations**) do time/projeto.
2. Procure o banco Supabase ligado ao Pipefine.
3. Clique em **Open in Supabase** (ou **Manage**). A Vercel abre o painel do
   Supabase já logado, sem pedir e-mail.
4. Também vale tentar entrar em <https://supabase.com/dashboard> com
   **Continue with GitHub**, usando a conta `eduardocoimbramag`.

Se der certo, você recupera o projeto antigo **com todos os dados** e não
precisa seguir o [`novosupabase.md`](./novosupabase.md).

---

## Se mesmo assim for para o Supabase novo

1. **Primeiro desconecte a integração antiga** (Vercel → Integrations →
   Supabase → Remove/Disconnect). Variáveis gerenciadas pela integração podem
   não deixar você editar ou apagar, ou voltar a ser preenchidas com os valores
   antigos.
2. Apague as variáveis que sobrarem da lista acima.
3. Crie só estas 4, com os valores do projeto **novo**:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   ALLOWED_SIGNUP_EMAILS=voce@gmail.com, mae@gmail.com
   ```

4. **Deployments → ⋯ → Redeploy.**

> `ALLOWED_SIGNUP_EMAILS` é opcional. Se ficar vazia, ninguém consegue se
> cadastrar pela tela do CRM, e os usuários são criados só pelo painel do
> Supabase (Authentication → Users → Add user).
