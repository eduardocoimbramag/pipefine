# Pipefine — Central de Gestão

CRM + gestão de eventos + controle financeiro para empresas de eventos, buffet e
bebidas (Sofistic Buffet, Gran Dose e outras). Sistema interno, responsivo e
construído **100% com ferramentas gratuitas**: Next.js, Supabase Free e Vercel
Hobby.

Lembretes e follow-ups funcionam **inteiramente dentro do painel** — sem e-mail,
SMS, WhatsApp ou qualquer integração externa paga.

---

## ✨ Funcionalidades

- **Dashboard** — leads novos, orçamentos, follow-ups (hoje/atrasados), eventos do
  mês, faturamento, recebido e pendente. Seções de ações de hoje, clientes sem
  resposta, próximos eventos e pagamentos pendentes.
- **Leads (CRM)** — CRUD completo, filtros (empresa, status, responsável), busca,
  histórico de contato, follow-ups e conversão em evento. Ao marcar
  "Orçamento enviado", o sistema cria automaticamente um follow-up para 2 dias
  depois.
- **Follow-ups** — tarefas de acompanhamento com buckets (hoje, atrasados,
  próximos, todos), concluir, reagendar e cancelar. Atrasados destacados em
  vermelho.
- **Eventos** — eventos fechados com controle de pagamento (entrada/restante),
  status, filtros por mês/empresa/pagamento. Status de pagamento calculado
  automaticamente.
- **Financeiro** — faturamento do mês/ano, recebido, pendente, ticket médio,
  comparativo com mês anterior e gráficos (Recharts).
- **Clientes** — cadastro/histórico com leads, eventos, total faturado e último
  atendimento.
- **Relatórios** — leads por origem, taxa de conversão, motivos de perda, funil,
  faturamento por empresa e ticket médio.
- **Configurações** — gestão de empresas e perfis de usuário (Admin, Comercial,
  Operacional, Financeiro).

---

## 🧱 Stack

| Camada        | Tecnologia                                  |
| ------------- | ------------------------------------------- |
| Framework     | Next.js 16 (App Router) + React 19          |
| Linguagem     | TypeScript                                  |
| Estilo        | Tailwind CSS v4 + shadcn/ui (componentes)   |
| Ícones        | lucide-react                                |
| Gráficos      | Recharts                                    |
| Datas         | date-fns                                     |
| Banco / Auth  | Supabase (PostgreSQL + Supabase Auth)       |
| Hospedagem    | Vercel                                       |

---

## 📁 Estrutura do projeto

```
app/
  (app)/               # Rotas autenticadas (layout com sidebar)
    dashboard/
    leads/             # lista, novo, [id] (detalhe), [id]/editar
    followups/
    eventos/
    financeiro/
    clientes/
    relatorios/
    configuracoes/
    layout.tsx         # Shell autenticado (sidebar + topbar + menu mobile)
  actions/             # Server Actions (mutations)
  login/               # Tela pública de login + actions de auth
  layout.tsx           # Root layout
components/
  ui/                  # Componentes shadcn/ui
  layout/              # Sidebar, topbar, menu mobile
  ...                  # StatCard, StatusBadge, PageHeader, EmptyState...
lib/
  supabase/            # Clients (browser, server, proxy)
  queries/             # Funções de leitura (dashboard, leads, eventos...)
  sql/schema.sql       # Schema completo do banco
  auth.ts, date.ts, utils.ts
types/                 # Tipos do banco, enums e tipos de domínio
proxy.ts               # Proteção de rotas (antigo middleware)
```

---

## 🚀 Como rodar localmente

### 1. Pré-requisitos

- Node.js 20+ e npm
- Uma conta gratuita no [Supabase](https://supabase.com)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar o Supabase

1. Crie um projeto em <https://supabase.com> (plano Free).
2. Vá em **SQL Editor → New query**, cole **todo** o conteúdo de
   [`lib/sql/schema.sql`](lib/sql/schema.sql) e clique em **Run**.
   Isso cria as tabelas, índices, RLS, triggers e já insere as empresas
   _Sofistic Buffet_ e _Gran Dose_.
3. Em **Authentication → Providers → Email**, mantenha o login por e-mail
   ativado. Para facilitar o uso interno, você pode **desativar "Confirm email"**
   em _Authentication → Sign In / Providers_ para que os logins funcionem sem
   confirmação por e-mail.
4. Em **Project Settings → API**, copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Variáveis de ambiente

Copie o exemplo e preencha:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 5. Rodar

```bash
npm run dev
```

Acesse <http://localhost:3000>. Você será redirecionado para `/login`.

### 6. Criar os usuários (você, mãe, padrasto, irmã)

Na tela de login, use a aba **"Criar conta"** para cada pessoa, **ou** crie pelo
painel do Supabase em _Authentication → Users → Add user_. Um perfil em
`users_profile` é criado automaticamente no primeiro cadastro/login (via trigger).
Os papéis (Admin/Comercial/Operacional/Financeiro) podem ser ajustados em
**Configurações** dentro do sistema.

> Todos os usuários autenticados acessam as mesmas informações (negócio de
> família). A estrutura de perfis já está pronta para refinar permissões no
> futuro.

---

## ☁️ Como publicar na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Em <https://vercel.com>, clique em **Add New → Project** e importe o
   repositório.
3. Em **Environment Variables**, adicione (plano Hobby é suficiente):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**. A Vercel detecta o Next.js automaticamente.
5. (Opcional) Após o deploy, no Supabase em **Authentication → URL Configuration**,
   adicione a URL da Vercel em _Site URL_ / _Redirect URLs_.

Pronto. Cada `git push` na branch principal gera um novo deploy.

---

## 🔐 Segurança

- O acesso ao banco é protegido por **Row Level Security**: apenas usuários
  autenticados leem/escrevem dados. A chave `anon` é pública por design — o RLS é
  a camada de proteção.
- Rotas internas são protegidas pelo `proxy.ts`, que redireciona quem não está
  logado para `/login`.

---

## 📝 Scripts

| Comando         | Descrição                          |
| --------------- | ---------------------------------- |
| `npm run dev`   | Ambiente de desenvolvimento        |
| `npm run build` | Build de produção                  |
| `npm run start` | Servir o build de produção         |
| `npm run lint`  | Lint                               |

---

## 🗺️ Próximos passos sugeridos

- Quadro Kanban de leads (arrastar entre status).
- Exportação de relatórios em CSV/PDF.
- Permissões por perfil mais granulares.
- Quando houver orçamento, evoluir lembretes para notificações por e-mail/WhatsApp
  (já fora do escopo gratuito atual).
