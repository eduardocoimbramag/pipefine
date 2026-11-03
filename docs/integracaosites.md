# Integração dos sites com o Pipefine — comandas de orçamento

Como ligar o formulário de orçamento dos sites (Sofistic Buffet e Gran Dose) ao
Supabase, para cada pedido virar uma **comanda** na aba **Orçamentos** do CRM.

---

## Como funciona

```
Site (formulário)
   │  POST com a chave PÚBLICA (publishable)
   ▼
Supabase → função submit_quote_request  (valida os campos)
   │
   ▼
tabela quote_requests  →  aba "Orçamentos" do CRM (comanda pendente)
```

- O site **não** grava direto na tabela. Ele chama uma função do banco,
  `submit_quote_request`, que confere os campos e grava o pedido.
- A chave usada no site é a **publishable**, a mesma da variável
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Ela é pública por natureza: com ela, um
  visitante só consegue **enviar** um pedido. Não consegue ler, editar nem
  apagar os pedidos de ninguém.
- **Nunca** coloque a **secret key** (`sb_secret_...`) no site.
- O CRM não precisa de nenhuma variável nova na Vercel.

---

## 1. Ativar no banco (uma vez só)

1. Supabase → **SQL Editor** → **New query**.
2. Cole **todo** o conteúdo de
   [`lib/sql/migrations/006_quote_requests.sql`](../lib/sql/migrations/006_quote_requests.sql)
   e clique em **Run**.
3. Confira:
   - **Table Editor** → existe a tabela `quote_requests`.
   - **Database → Functions** → existe a função `submit_quote_request`.

A migração pode ser rodada mais de uma vez sem problema. Quem instalar o banco
do zero com o [`lib/sql/schema.sql`](../lib/sql/schema.sql) atual já recebe tudo
isso, sem precisar da migração.

Enquanto a migração não for rodada, a aba **Orçamentos** mostra o aviso
"Recurso ainda não ativado no banco".

---

## 2. Dados que cada site precisa

| O quê | Onde pegar |
|---|---|
| **URL do projeto** | Supabase → Project Settings → Data API → **Project URL** |
| **Chave publishable** | Supabase → Project Settings → API Keys → **Publishable key** (`sb_publishable_...`) |
| **ID da empresa** | SQL abaixo — um ID diferente para cada site |

Para descobrir o ID de cada empresa, rode no **SQL Editor**:

```sql
select id, name from companies order by name;
```

- Site do **Sofistic Buffet** → usa o `id` da linha _Sofistic Buffet_.
- Site da **Gran Dose** → usa o `id` da linha _Gran Dose_.

É esse ID que faz a comanda sair com o nome da empresa certa e respeitar o
filtro de empresa no topo do CRM.

---

## 3. Campos do formulário

Com as mudanças planejadas, o formulário fica assim:

| Campo no site | Parâmetro enviado | Obrigatório | Observação |
|---|---|---|---|
| _(fixo no código do site)_ | `p_company_id` | Sim | ID da empresa (passo 2) |
| Nome | `p_nome` | Sim | até 150 caracteres |
| Telefone | `p_telefone` | Telefone **ou** e-mail | até 40. No CRM vira link do WhatsApp |
| E-mail | `p_email` | Telefone **ou** e-mail | até 200, formato válido |
| Quantitativo | `p_quantitativo` | Não | texto livre: `150`, `150 pessoas`, `100 a 150` |
| Segmento (antigo "Tipo de evento") | `p_segmento` | Sim | exatamente `social` ou `corporativo` |
| Nome da empresa | `p_nome_empresa` | Não | só aparece/é salvo quando o segmento é `corporativo` |
| Tipo de evento (novo) | `p_tipo_evento` | Não | texto livre: Casamento, Aniversário, Feira, Congresso... (até 100) |
| Descrição | `p_descricao` | Não | até 5000 caracteres |
| Autorizo o contato... | `p_consentimento` | Sim | precisa ser `true` |

Sugestões para o campo **Tipo de evento**: Casamento, Aniversário, 15 anos,
Formatura, Batizado, Confraternização, Feira, Congresso, Convenção, Lançamento
de produto, Outro. Pode ser um `<select>` ou um campo de texto com sugestões
(exemplo abaixo).

---

## 4. Exemplo completo — HTML + JavaScript

Serve para qualquer site em que você consiga editar o HTML e colocar um script.
Mantenha o visual atual; o que importa são os `name` dos campos e o script.

```html
<form id="form-orcamento">
  <input name="nome" placeholder="Nome" required maxlength="150" />
  <input name="telefone" type="tel" placeholder="Telefone" maxlength="40" />
  <input name="email" type="email" placeholder="E-mail" maxlength="200" />
  <input name="quantitativo" placeholder="Quantitativo" maxlength="60" />

  <fieldset>
    <legend>Segmento</legend>
    <label><input type="radio" name="segmento" value="social" checked /> Social</label>
    <label><input type="radio" name="segmento" value="corporativo" /> Corporativo</label>
  </fieldset>

  <!-- Só aparece quando "Corporativo" está marcado -->
  <div id="campo-empresa" hidden>
    <input name="nome_empresa" placeholder="Nome da empresa" maxlength="200" />
  </div>

  <input name="tipo_evento" list="tipos-evento" placeholder="Tipo de evento" maxlength="100" />
  <datalist id="tipos-evento">
    <option value="Casamento"></option>
    <option value="Aniversário"></option>
    <option value="15 anos"></option>
    <option value="Formatura"></option>
    <option value="Confraternização"></option>
    <option value="Feira"></option>
    <option value="Congresso"></option>
    <option value="Convenção"></option>
  </datalist>

  <textarea name="descricao" placeholder="Descrição" maxlength="5000"></textarea>

  <!-- Armadilha para robôs: invisível para pessoas, NÃO remova -->
  <input name="website" tabindex="-1" autocomplete="off"
         style="position:absolute;left:-9999px" aria-hidden="true" />

  <label>
    <input type="checkbox" name="consentimento" required />
    Autorizo o contato para fins comerciais conforme a Política de Privacidade
  </label>

  <button type="submit">Enviar</button>
  <p id="form-status" role="status"></p>
</form>

<script>
  // ===== Configuração (troque pelos valores do passo 2) =====
  const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
  const SUPABASE_KEY = "sb_publishable_xxxxxxxxxxxxxxxx";
  const COMPANY_ID = "ID-DA-EMPRESA-DESTE-SITE";
  // ==========================================================

  const form = document.getElementById("form-orcamento");
  const status = document.getElementById("form-status");
  const campoEmpresa = document.getElementById("campo-empresa");

  // Mostra "Nome da empresa" só para Corporativo
  form.querySelectorAll('input[name="segmento"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      campoEmpresa.hidden = form.segmento.value !== "corporativo";
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(form);

    // Robô preencheu o campo invisível: finge sucesso e não envia.
    if (f.get("website")) {
      form.reset();
      status.textContent = "Recebemos seu pedido! Em breve entraremos em contato.";
      return;
    }

    if (!f.get("telefone") && !f.get("email")) {
      status.textContent = "Informe um telefone ou e-mail para contato.";
      return;
    }

    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    status.textContent = "Enviando...";

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_quote_request`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_company_id: COMPANY_ID,
          p_nome: f.get("nome"),
          p_telefone: f.get("telefone"),
          p_email: f.get("email"),
          p_quantitativo: f.get("quantitativo"),
          p_segmento: f.get("segmento"),
          p_nome_empresa: f.get("nome_empresa"),
          p_tipo_evento: f.get("tipo_evento"),
          p_descricao: f.get("descricao"),
          p_consentimento: f.get("consentimento") === "on",
        }),
      });

      if (!res.ok) {
        const erro = await res.json().catch(() => ({}));
        throw new Error(erro.message || "Não foi possível enviar. Tente novamente.");
      }

      form.reset();
      campoEmpresa.hidden = true;
      status.textContent = "Recebemos seu pedido! Em breve entraremos em contato.";
    } catch (err) {
      status.textContent = err.message;
    } finally {
      botao.disabled = false;
    }
  });
</script>
```

> **Chave antiga (`eyJ...`)?** Se o projeto usar a chave _anon_ legada em vez da
> publishable, acrescente também o header
> `Authorization: "Bearer " + SUPABASE_KEY`. Com a publishable
> (`sb_publishable_...`), use **só** o `apikey`, como no exemplo.

As mensagens de erro que a função devolve já estão em português (ver passo 7),
então dá para mostrar `erro.message` direto para o visitante.

---

## 5. Exemplo — site em React / Next.js

```bash
npm install @supabase/supabase-js
```

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://SEU-PROJETO.supabase.co",
  "sb_publishable_xxxxxxxxxxxxxxxx",
);

const COMPANY_ID = "ID-DA-EMPRESA-DESTE-SITE";

export async function enviarOrcamento(dados: {
  nome: string;
  telefone?: string;
  email?: string;
  quantitativo?: string;
  segmento: "social" | "corporativo";
  nomeEmpresa?: string;
  tipoEvento?: string;
  descricao?: string;
  consentimento: boolean;
}) {
  const { data: numero, error } = await supabase.rpc("submit_quote_request", {
    p_company_id: COMPANY_ID,
    p_nome: dados.nome,
    p_telefone: dados.telefone ?? null,
    p_email: dados.email ?? null,
    p_quantitativo: dados.quantitativo ?? null,
    p_segmento: dados.segmento,
    p_nome_empresa: dados.nomeEmpresa ?? null,
    p_tipo_evento: dados.tipoEvento ?? null,
    p_descricao: dados.descricao ?? null,
    p_consentimento: dados.consentimento,
  });
  if (error) throw new Error(error.message);
  return numero; // número da comanda (ex.: 42)
}
```

---

## 6. Sites com formulário de plugin (WordPress, Wix, Elementor...)

Formulários prontos de plugin costumam mandar os dados com nomes próprios e
não deixam escolher os headers da requisição. Nesse caso há duas saídas:

1. Trocar o formulário do plugin por um bloco de **HTML personalizado** com o
   exemplo do passo 4 (mantendo o CSS do site).
2. Criar no Pipefine um endpoint que recebe o webhook do plugin e traduz os
   campos. Se for o seu caso, peça para criar esse endpoint informando qual
   plugin o site usa.

---

## 7. Testar sem o site (terminal)

Troque URL, chave e ID e rode:

```bash
curl -X POST "https://SEU-PROJETO.supabase.co/rest/v1/rpc/submit_quote_request" \
  -H "apikey: sb_publishable_xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "p_company_id": "ID-DA-EMPRESA",
    "p_nome": "Teste da Integração",
    "p_telefone": "(81) 99999-0000",
    "p_email": "teste@exemplo.com",
    "p_quantitativo": "150 pessoas",
    "p_segmento": "corporativo",
    "p_nome_empresa": "Empresa Teste",
    "p_tipo_evento": "Congresso",
    "p_descricao": "Pedido de teste da integração.",
    "p_consentimento": true
  }'
```

A resposta é só um número (ex.: `1`): é o número da comanda. Abra o CRM em
**Orçamentos** e ela estará lá (a fila também se atualiza sozinha a cada
minuto). Depois, apague a comanda de teste pelo menu **⋯ → Excluir pedido**.

### Respostas possíveis

| Resposta | Significado |
|---|---|
| `200` com um número | Pedido gravado. O número é o da comanda |
| `400` — "Informe o nome." | Faltou o nome |
| `400` — "Informe um telefone ou e-mail para contato." | Os dois vieram vazios |
| `400` — "E-mail inválido." | E-mail fora do formato |
| `400` — "Segmento inválido (use social ou corporativo)." | `p_segmento` com outro valor |
| `400` — "É preciso autorizar o contato." | Checkbox desmarcado (`p_consentimento` falso) |
| `400` — "Algum campo passou do tamanho máximo." | Texto maior que o limite da tabela do passo 3 |
| `400` — "Muitos pedidos em pouco tempo..." | Mais de 3 pedidos do mesmo telefone/e-mail em 10 minutos |
| `400` — "Empresa inválida." | `p_company_id` errado ou empresa desativada em Configurações |
| `401` — Invalid API key | Chave errada, ou chave de outro projeto Supabase |
| `404` — `PGRST202` / "Could not find the function" | Migração 006 não rodada, ou cache da API desatualizado: rode `notify pgrst, 'reload schema';` no SQL Editor |

---

## 8. O que já está protegido

- **Só enviar:** a chave pública executa apenas `submit_quote_request`. Ler,
  editar e apagar pedidos exige estar logado no CRM.
- **Validação no banco:** campos obrigatórios, formato de e-mail, segmento,
  consentimento e tamanho máximo são conferidos no Supabase, mesmo que alguém
  burle o JavaScript do site.
- **Anti-flood:** no máximo 3 pedidos do mesmo telefone ou e-mail a cada 10
  minutos.
- **Armadilha para robôs:** o campo invisível `website` do exemplo descarta
  envios automáticos simples. Mantenha-o no formulário.

Se um dia aparecer spam em volume, o próximo passo é colocar um captcha
gratuito (Cloudflare Turnstile) no formulário.

---

## 9. Usando a aba Orçamentos

- **Pendentes:** cada pedido é uma comanda, as mais antigas primeiro. O rodapé
  mostra há quanto tempo ela está na fila: fica em **negrito depois de 24 h** e
  **vermelho depois de 48 h**.
- O **telefone** abre o WhatsApp da pessoa e o **e-mail** abre o seu programa de
  e-mail. O botão de balão ao lado também abre o WhatsApp.
- **Orçamento enviado:** tira a comanda da fila e move para **Enviados**, com a
  data e hora do envio.
- **Enviados:** lista dos últimos 100 envios. **Ver comanda** mostra a ficha
  carimbada como _ENVIADO_, com a opção **Voltar para pendentes**.
- **⋯ → Excluir pedido:** para spam ou pedido duplicado (não tem volta).
- O menu lateral mostra um **contador vermelho** com o número de comandas
  pendentes.
- O seletor de empresa no topo do CRM filtra as comandas por site.

---

## Checklist

- [ ] Migração `006_quote_requests.sql` rodada no Supabase
- [ ] ID de cada empresa anotado
- [ ] Formulário de cada site com os campos novos (Segmento, Nome da empresa,
      Tipo de evento)
- [ ] Script configurado com URL, chave **publishable** e o ID da empresa certa
- [ ] Teste com `curl` (ou pelo próprio site) apareceu na aba Orçamentos
- [ ] Comanda de teste excluída
