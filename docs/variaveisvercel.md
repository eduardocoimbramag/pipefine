# Variáveis da Vercel — Pipefine

São só **3 variáveis**. Os nomes têm que ser **exatamente** estes, porque é o que
o código lê.

| Nome (Key) | Valor (Value) | Onde pegar no Supabase |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` | Project Settings → Data API → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` | Project Settings → API Keys → **Publishable key** |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Project Settings → API Keys → **Secret key** |

Atenção aos nomes:

- A **Publishable** vai na variável que termina em `ANON_KEY`.
- A **Secret** vai na variável que termina em `SERVICE_ROLE_KEY`.

O nome no painel do Supabase é diferente do nome da variável, e está certo
assim.

> Os usuários são criados direto no Supabase (Authentication → Users → Add
> user), então **não** é preciso a variável `ALLOWED_SIGNUP_EMAILS`. Sem ela, a
> aba "Criar conta" da tela de login recusa qualquer cadastro. Veja
> [`novosupabase.md`](./novosupabase.md), passo 7.

---

## Como cadastrar na Vercel

1. <https://vercel.com> → projeto **pipefine** → **Settings** →
   **Environment Variables**.
2. Para cada linha da tabela: preencha **Key** e **Value**.
3. Em **Environments**, marque **Production** (e **Preview**, se usar).
4. **Save**.
5. Depois de cadastrar as 3: **Deployments** → último deploy → **⋯** →
   **Redeploy**.

**Sem o Redeploy nada muda.** As variáveis `NEXT_PUBLIC_*` entram no site na
hora do build.

---

## Detalhes de cada uma

**`NEXT_PUBLIC_SUPABASE_URL`** e **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
Obrigatórias. Sem elas o sistema não abre. São públicas por natureza (vão para
o navegador), e quem protege os dados é o RLS do banco.

**`SUPABASE_SERVICE_ROLE_KEY`**
Recomendada. Ativa o bloqueio após várias senhas erradas (proteção contra força
bruta). Sem ela o login funciona, mas sem esse bloqueio. **É secreta**: dá acesso
total ao banco. Nunca mande em mensagem nem coloque no código.

---

## Para rodar no seu computador

Crie um arquivo `.env.local` na raiz do projeto com as mesmas 3 variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxx
```

Esse arquivo não vai para o GitHub (já está no `.gitignore`).
