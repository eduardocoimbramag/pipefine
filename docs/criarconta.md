# Como criar contas — Pipefine

As contas do CRM são criadas **somente pelo painel do Supabase**. A tela de
login do sistema não tem mais a opção "Criar conta": ela só serve para entrar.

---

## Criar um usuário

1. Acesse <https://supabase.com/dashboard> e abra o projeto do Pipefine.
2. Menu lateral → **Authentication** → **Users**.
3. **Add user** → **Create new user**.
4. Preencha **Email** e **Password** (mínimo 6 caracteres).
5. **Marque "Auto Confirm User".** Se ficar desmarcado, a conta fica "não
   confirmada" e o login é recusado.
6. **Create user**.
7. Entregue e-mail e senha para a pessoa. Ela entra pela tela de login do CRM.

O usuário deve aparecer na lista com a coluna **Last signed in** vazia até o
primeiro login.

### Depois de criar

- O perfil interno (`users_profile`) é criado sozinho pelo gatilho
  `on_auth_user_created`.
- O nome inicial é a parte do e-mail antes do `@`, e o papel inicial é
  **Comercial**. Ajuste em **Configurações → Usuários e perfis** ou pelo SQL
  Editor:

```sql
update users_profile
set role = 'admin', full_name = 'Nome Sobrenome'
where email = 'pessoa@gmail.com';
```

Papéis: `admin`, `comercial`, `operacional`, `financeiro`. Hoje eles **não
limitam acesso**: todo usuário logado vê e edita tudo.

---

## Criei pelo "Add user" e não funcionou — diagnóstico

Siga na ordem. A maioria dos casos se resolve nos três primeiros itens.

### 1. Qual mensagem apareceu?

| Onde / mensagem | Causa provável | Vá para |
|---|---|---|
| No Supabase, ao criar: **"Database error creating new user"** | O `schema.sql` não foi rodado (ou falhou) | 2 |
| No CRM: **"E-mail ou senha incorretos."** | Senha errada **ou** o site está ligado a outro projeto Supabase | 3 e 4 |
| No CRM: **"Não foi possível entrar. Tente novamente."** | Usuário não confirmado **ou** chave da API errada | 3 e 4 |
| Página de erro / tela branca / não carrega | Variáveis faltando ou sem Redeploy | 4 e 5 |
| Entra, mas as telas dão erro | Tabelas não existem | 2 |

### 2. O schema foi rodado?

No Supabase → **Table Editor**: precisam existir `companies`, `users_profile`,
`leads`, `events` etc. Se não existirem, rode **todo** o
[`lib/sql/schema.sql`](../lib/sql/schema.sql) no **SQL Editor** e depois
**apague e recrie** o usuário (ele foi criado antes do gatilho existir e ficou
sem perfil).

### 3. O usuário está confirmado?

No **SQL Editor**, rode:

```sql
select u.email,
       u.email_confirmed_at,
       u.banned_until,
       p.id is not null as tem_perfil
from auth.users u
left join public.users_profile p on p.id = u.id
order by u.created_at desc;
```

- `email_confirmed_at` **vazio** → não marcou "Auto Confirm User". Corrija
  assim (troque o e-mail):

  ```sql
  update auth.users
  set email_confirmed_at = now()
  where email = 'pessoa@gmail.com';
  ```

- `banned_until` preenchido → usuário bloqueado. Em **Authentication → Users →
  ⋯ → Unban user**.
- `tem_perfil` = `false` → o gatilho não rodou. Crie o perfil na mão:

  ```sql
  insert into users_profile (id, full_name, email)
  select id, split_part(email, '@', 1), email
  from auth.users
  on conflict (id) do nothing;
  ```

- **Nenhuma linha** → o usuário foi criado em **outro projeto** Supabase. Confira
  no topo do painel qual projeto está aberto.

### 4. O site aponta para o projeto certo?

A URL das variáveis tem que ser do **mesmo projeto** onde o usuário foi criado.

- No Supabase: **Project Settings → Data API → Project URL** (ex.:
  `https://abcd1234.supabase.co`).
- Compare com `NEXT_PUBLIC_SUPABASE_URL` no `.env.local` (teste local) e na
  Vercel (site publicado). O trecho `abcd1234` tem que ser igual.
- Confira também `NEXT_PUBLIC_SUPABASE_ANON_KEY` = **Publishable key** desse
  mesmo projeto, sem espaços nem aspas sobrando.

Detalhes de cada variável: [`variaveisvercel.md`](./variaveisvercel.md).

Para testar a conexão local:

```bash
node scripts/check-db.mjs
```

Todas as tabelas devem aparecer com ✅. Se aparecer `Invalid API key`, a chave
está errada. Se a tabela não for encontrada, volte ao item 2.

### 5. Testou localmente ou no site publicado?

- **Local (`npm run dev`):** depois de editar o `.env.local`, **pare e rode de
  novo** o `npm run dev`. Ele só lê o arquivo ao iniciar.
- **Vercel:** depois de mudar variáveis, **Deployments → ⋯ → Redeploy**. Sem
  isso o site continua com os valores antigos (ou sem nenhum, se você apagou).

### 6. Bloqueio por tentativas

Depois de 5 senhas erradas para o mesmo e-mail em 15 minutos, o CRM mostra
**"Muitas tentativas de login"**. Espere o tempo indicado, ou libere na hora
pelo SQL Editor:

```sql
delete from login_attempts where email = 'pessoa@gmail.com';
```

### 7. Ainda não foi?

Redefina a senha para ter certeza de que ela está certa: **Authentication →
Users** → a pessoa → **⋯** → defina uma nova senha. Ou apague o usuário e crie
de novo, com **Auto Confirm User** marcado.

---

## Tirar o acesso de alguém

**Authentication → Users** → a pessoa → **Delete user** (remove a conta) ou
**Ban user** (bloqueia temporariamente).

Desmarcar o usuário como ativo dentro do CRM **não** bloqueia o login: só tira a
pessoa da lista de "Responsável".

---

## Proteção extra recomendada

Em **Authentication → Sign In / Providers**, deixe **"Allow new users to sign
up"** **desligado**. Assim ninguém cria conta usando a chave pública do site.
O **Add user** do painel continua funcionando normalmente.
