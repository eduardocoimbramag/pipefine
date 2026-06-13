# Como aplicar a migração 004 (`leads.relinked`) no Supabase

**Resposta curta:** crie um **novo snippet** (uma _New query_ em branco) no SQL
Editor do Supabase e cole o conteúdo do arquivo
[`lib/sql/migrations/004_lead_relinked.sql`](../lib/sql/migrations/004_lead_relinked.sql).
**Não** é para colar dentro de nada que já existe — cada migração é uma query
independente. Pode rodar à vontade (é idempotente: rodar de novo não causa
problema).

---

## Por que fazer isso

Essa migração adiciona a coluna `relinked` na tabela `leads`. Ela é o marcador
que garante que um lead criado pela opção **"Cliente antigo?"** **nunca** volte
a aparecer em **"Leads Perdidos"**, mesmo que o cliente seja excluído do Banco
de Clientes depois.

> O sistema **funciona sem essa migração** (ele usa um filtro alternativo). Mas
> aplicá-la deixa a regra 100% robusta. Recomendado rodar uma vez.

---

## Passo a passo (com prints mentais)

1. Acesse o painel do projeto em **https://supabase.com/dashboard** e entre no
   seu projeto (Pipefine).
2. No menu da esquerda, clique em **SQL Editor** (ícone de banco de dados / `SQL`).
3. Clique em **+ New query** (também aparece como **"New snippet"**) — isso abre
   um editor **em branco**. É aqui que vai: **uma query nova, não em cima de
   outra**.
4. Abra o arquivo `lib/sql/migrations/004_lead_relinked.sql` (no projeto),
   **copie tudo** e **cole** nesse editor em branco.
5. Clique em **Run** (ou aperte `Ctrl + Enter`).
6. Deve aparecer **"Success. No rows returned"** (ou algo parecido). Pronto.

---

## O que essa query faz, em palavras

```sql
alter table leads
  add column if not exists relinked boolean not null default false;

update leads
set relinked = true
where client_id is not null
  and relinked = false;
```

- **Linha 1–2:** cria a coluna `relinked` (verdadeiro/falso, começa como `false`).
  O `if not exists` garante que rodar de novo não dá erro.
- **Linha restante:** marca como re-vinculados (`true`) os leads que já têm um
  cliente ligado, para manter o histórico coerente.

---

## "New snippet" ou colar no que já existe?

| Situação | O que fazer |
| --- | --- |
| Aplicar a migração 004 | **New snippet / New query** (editor em branco) e colar |
| Já tinha colado as migrações 002 e 003 antes | Mesma coisa: cada uma é uma query nova e separada |
| Quer rodar de novo por garantia | Pode — é idempotente, não duplica nada |

> **Regra geral:** no Supabase, cada arquivo `.sql` da pasta
> `lib/sql/migrations/` é uma query independente. Sempre abra um snippet novo,
> cole o arquivo inteiro e rode. Nunca precisa juntar com outra query nem editar
> o `schema.sql`.

---

## Como confirmar que deu certo

Depois de rodar, você pode colar isto em **outro** snippet novo e rodar para
conferir se a coluna existe:

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'leads' and column_name = 'relinked';
```

Se aparecer **uma linha** com `relinked / boolean / false`, está aplicada. ✅

---

## Migrações pendentes (visão geral)

Se você ainda não rodou as anteriores, a ordem recomendada é:

1. `lib/sql/migrations/002_payment_installments.sql` — habilita as **parcelas /
   formas de pagamento** no financeiro.
2. `lib/sql/migrations/003_sync_followup_dates.sql` — acerta as **datas de
   follow-up** de leads antigos.
3. `lib/sql/migrations/004_lead_relinked.sql` — esta, do **"Cliente antigo?"**.

Cada uma: **New snippet → colar o arquivo → Run**.
