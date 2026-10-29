# Novo Supabase — instalação, configuração e criação de usuários

Guia para ligar o Pipefine a um **projeto Supabase novo, do zero**. Os dados do
projeto antigo **não** são migrados: o CRM começa vazio (só com as empresas
_Sofistic Buffet_ e _Gran Dose_, que o schema já cria).

> **Antes de tudo: anote o acesso.** Guarde em um gerenciador de senhas (ou
> num lugar seguro) o **e-mail da conta Supabase**, a senha, o nome do projeto,
> a **senha do banco** (Database password) e a região escolhida. Foi a falta
> disso que fez o projeto antigo ser perdido.

---

## Resumo do passo a passo

1. Criar o projeto no Supabase (se ainda não criou).
2. Rodar `lib/sql/schema.sql` no SQL Editor.
3. Ajustar a autenticação (confirmação de e-mail e URLs).
4. Copiar as chaves da API.
5. Preencher o `.env.local` e testar localmente.
6. Atualizar as variáveis na Vercel e fazer **Redeploy**.
7. Criar os usuários e definir quem é Admin.

---

## 1. Criar o projeto no Supabase

1. Acesse <https://supabase.com/dashboard> logado com a conta nova.
2. **New project** → escolha a organização.
3. Preencha:
   - **Name:** `pipefine` (ou o que preferir)
   - **Database Password:** gere uma senha forte e **salve** — ela não aparece
     de novo.
   - **Region:** `South America (São Paulo)` — fica mais rápido para quem está
     no Brasil.
   - **Plan:** Free.
4. **Create new project** e aguarde 1–2 minutos até o projeto ficar pronto.

> Se você já criou o projeto, pule para o passo 2.

---

## 2. Criar as tabelas (rodar o schema)

O arquivo [`lib/sql/schema.sql`](../lib/sql/schema.sql) é o schema **completo
e atualizado**: tabelas, enums, índices, RLS, gatilhos e as empresas iniciais.
Ele já inclui tudo o que as migrações `002` a `005` adicionavam (parcelas,
coluna `relinked`, tabela `login_attempts`).

1. No projeto → menu lateral **SQL Editor** → **New query**.
2. Abra `lib/sql/schema.sql` no editor de código, copie **todo** o conteúdo e
   cole no SQL Editor.
3. Clique em **Run**. Deve aparecer `Success. No rows returned`.

**Não** é preciso rodar os arquivos de `lib/sql/migrations/` num banco novo.
Eles existem só para atualizar bancos antigos.

### Conferir se deu certo

- Menu **Table Editor**: devem aparecer as tabelas `companies`,
  `users_profile`, `clients`, `leads`, `lead_interactions`, `followups`,
  `events`, `payment_installments`, `activity_logs` e `login_attempts`.
- A tabela `companies` deve ter 2 linhas: _Sofistic Buffet_ e _Gran Dose_.

Se o app depois reclamar de `Could not find the table ... in the schema cache`,
rode [`lib/sql/reload-cache.sql`](../lib/sql/reload-cache.sql) no SQL Editor:

```sql
notify pgrst, 'reload schema';
```

---

## 3. Configurar a autenticação

### 3.1 Login por e-mail e bloqueio de cadastro público

Os usuários serão criados **só pelo painel do Supabase** (passo 7). Por isso,
feche o cadastro público:

1. Menu **Authentication** → **Sign In / Providers**.
2. **Desligue "Allow new users to sign up"**. Isso impede que qualquer pessoa
   crie conta usando a chave pública do site. O **Add user** do painel continua
   funcionando normalmente.
3. Em **Email**, deixe **Enable Email provider** ligado (é ele que permite o
   login com e-mail e senha).
4. **Save**.

### 3.2 URLs do site

1. **Authentication** → **URL Configuration**.
2. **Site URL:** a URL do sistema publicado na Vercel, por exemplo
   `https://pipefine.vercel.app`.
3. **Redirect URLs:** adicione a URL da Vercel e também
   `http://localhost:3000` (para testes locais).
4. **Save**.

---

## 4. Copiar as chaves da API

Menu **Project Settings** (engrenagem) → **API Keys** (e **Data API** para a
URL).

Você precisa de **três** valores:

| Valor no Supabase | Variável no projeto | Pública? |
|---|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` | Sim |
| **Publishable key** (`sb_publishable_...`) — ou, na aba _Legacy API keys_, a **anon public** (`eyJ...`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim |
| **Secret key** (`sb_secret_...`) — ou, na aba _Legacy API keys_, a **service_role** (`eyJ...`) | `SUPABASE_SERVICE_ROLE_KEY` | **NÃO — secreta** |

Observações:

- Qualquer um dos dois formatos funciona (o novo `sb_...` ou o legado `eyJ...`).
  Só não misture: use a publishable com a secret, ou a anon com a service_role.
- A **secret/service_role ignora o RLS** e dá acesso total ao banco. Nunca
  coloque em código, print ou mensagem. No Pipefine ela só é usada no servidor,
  para o bloqueio de tentativas de login. Sem ela o login funciona, mas fica
  **sem proteção contra força bruta**.

---

## 5. Configurar o projeto local

### 5.1 Instalar dependências (se ainda não tiver)

Pré-requisito: Node.js 20 ou mais recente.

```bash
npm install
```

### 5.2 Criar o `.env.local`

Na raiz do projeto, crie (ou substitua) o arquivo `.env.local`:

```env
# Supabase NOVO
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxxxxxxxx
```

Só essas 3. As contas são criadas no painel do Supabase, então não existe
variável de cadastro.

O `.env.local` já está no `.gitignore` — ele **não** vai para o GitHub.

### 5.3 Testar a conexão

```bash
node scripts/check-db.mjs
```

Todas as tabelas devem aparecer com ✅. Depois:

```bash
npm run dev
```

Abra <http://localhost:3000>. Você deve cair na tela de login.

> Se você estava logado no banco antigo, o navegador pode ter um cookie de
> sessão velho. Se algo estranho acontecer, saia da conta ou abra numa janela
> anônima.

---

## 6. Atualizar a Vercel (sistema publicado)

O site publicado continua apontando para o Supabase antigo até você trocar as
variáveis.

1. <https://vercel.com> → projeto **pipefine** → **Settings** →
   **Environment Variables**.
2. Crie as três variáveis com os valores **novos** (detalhes em
   [`variaveisvercel.md`](./variaveisvercel.md)):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Marque os ambientes **Production** (e **Preview**, se usar).
4. **Deployments** → último deploy → **⋯** → **Redeploy**.
   **Sem redeploy as novas variáveis não valem** — as `NEXT_PUBLIC_*` são
   embutidas no build.

---

## 7. Criar os usuários do CRM

Cada pessoa precisa de uma conta própria (e-mail + senha). Todas as contas são
criadas **pelo painel do Supabase**. Vale na hora, sem redeploy.

### Criar um usuário

1. Supabase → **Authentication** → **Users**.
2. **Add user** → **Create new user**.
3. Preencha **Email** e **Password** (mínimo 6 caracteres).
4. **Marque "Auto Confirm User"**. Sem isso a pessoa não consegue entrar até
   confirmar o e-mail.
5. **Create user**.
6. Passe o e-mail e a senha para a pessoa. Ela entra pela tela de login do CRM.

Repita para cada pessoa.

### O que acontece automaticamente

- O gatilho `on_auth_user_created` cria o perfil em `users_profile` assim que
  a conta é criada. Não precisa cadastrar nada no banco.
- O nome inicial é a parte do e-mail antes do `@` (ex.: `joao.silva`). Ajuste
  em **Configurações → Usuários e perfis** ou pelo SQL abaixo.
- Todo usuário novo começa com o papel **Comercial**.

### Definir quem é Admin

Pelo próprio CRM: entre com qualquer conta → **Configurações → Usuários e
perfis** → altere nome e papel de cada pessoa.

Ou pelo SQL Editor do Supabase (troque o e-mail):

```sql
update users_profile
set role = 'admin', full_name = 'Eduardo Coimbra'
where email = 'voce@gmail.com';
```

Papéis disponíveis: `admin`, `comercial`, `operacional`, `financeiro`.

> **Atenção:** hoje os papéis **não restringem acesso**. Todo usuário logado
> vê e edita tudo (todas as empresas, leads, eventos e financeiro). Só dê
> conta a quem pode ver o negócio inteiro.

### Tirar o acesso de alguém

Supabase → **Authentication** → **Users** → a pessoa → **Delete user** (ou
**Ban user** para bloquear temporariamente).

Só desmarcar "ativo" no CRM **não** bloqueia o login: apenas tira a pessoa da
lista de "Responsável".

---

## Checklist final

- [ ] Acesso da conta Supabase e senha do banco salvos em local seguro
- [ ] `schema.sql` rodado com sucesso
- [ ] `companies` com Sofistic Buffet e Gran Dose
- [ ] "Allow new users to sign up" desligado
- [ ] Site URL e Redirect URLs configuradas
- [ ] `.env.local` com as 3 variáveis novas
- [ ] `node scripts/check-db.mjs` todo ✅
- [ ] Variáveis atualizadas na Vercel + **Redeploy**
- [ ] Usuários criados e pelo menos um **Admin** definido
- [ ] Login testado no sistema publicado

---

## Problemas comuns

**`Could not find the table 'public.xxx' in the schema cache`**
Rode `notify pgrst, 'reload schema';` no SQL Editor. Se continuar, rode o
`schema.sql` inteiro de novo (ele pode ser rodado mais de uma vez).

**`Invalid API key` ou o app não conecta**
Chave errada ou com espaço sobrando no `.env.local`/Vercel. Confira também se
não misturou chave nova (`sb_...`) com legada (`eyJ...`). Na Vercel, lembre do
**Redeploy**.

**O site publicado ainda mostra dados antigos**
As variáveis da Vercel ainda apontam para o projeto antigo, ou faltou o
**Redeploy**.

**Criei a conta mas a pessoa não consegue entrar**
Veja o diagnóstico passo a passo em [`criarconta.md`](./criarconta.md).

**"Muitas tentativas de login. Tente novamente em X minuto(s)."**
Bloqueio contra força bruta (5 erros por e-mail ou 20 por IP em 15 minutos).
Espere o tempo indicado.

**Esqueceu a senha**
**Authentication → Users** → a pessoa → **⋯** → defina uma nova senha e
entregue a ela.

**Projeto pausado**
No plano Free, projetos sem uso por cerca de uma semana são pausados. Entre no
painel do Supabase e clique em **Restore project**.
