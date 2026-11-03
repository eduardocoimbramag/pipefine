# Formulário padrão de orçamento — Sofistic Buffet e Gran Dose

Especificação única do formulário de orçamento dos sites. Cada pedido enviado
pelo site vira uma **comanda** na aba **Orçamentos** do CRM Pipefine.

O mesmo arquivo vale para os dois sites. A única coisa que muda de um site
para o outro é o **ID da empresa** (seção 1).

---

## 0. Para o dono dos sites: como usar este arquivo

Faça isto **uma vez**, antes de mandar o arquivo para o Claude:

1. **Confira se o banco está pronto.** Abra o CRM → aba **Orçamentos**. Se
   aparecer "Recurso ainda não ativado no banco", abra o Supabase → **SQL
   Editor** → **New query**, cole todo o arquivo
   `lib/sql/migrations/006_quote_requests.sql` do projeto do CRM e clique em
   **Run**.
2. **Preencha a seção 1 abaixo** (troque cada `PREENCHER`):
   - **URL do projeto:** Supabase → Project Settings → Data API → **Project URL**.
   - **Chave publishable:** Supabase → Project Settings → API Keys →
     **Publishable key** (começa com `sb_publishable_`). Essa chave é pública
     e pode ficar neste arquivo. A **secret key** (`sb_secret_...`) **não**:
     nunca cole ela aqui.
   - **ID de cada empresa:** Supabase → SQL Editor → rode
     `select id, name from companies order by name;` e copie o `id` de cada
     linha.
3. Se quiser mudar quais campos são obrigatórios, mude a coluna
   **Obrigatório** da tabela da seção 3.
4. Em cada site, abra a pasta do projeto do site no Claude Code e cole a
   mensagem abaixo, trocando o nome da empresa:

   ```
   Leia o arquivo /Users/eduardocoimbra/Desktop/Code/pipefine/docs/formulariopadrao.md
   e implemente o formulário de orçamento deste site seguindo ele à risca.
   Este é o site da Sofistic Buffet.
   ```

   Se o Claude pedir permissão para ler o arquivo, autorize.
5. Ao final, confira a comanda de teste na aba **Orçamentos** do CRM e apague
   pelo menu **⋯ → Excluir pedido**.

---

## 1. Configuração

| Item | Valor |
|---|---|
| URL do projeto Supabase | `PREENCHER` |
| Chave publishable | `PREENCHER` |

| Site | ID da empresa (`p_company_id`) |
|---|---|
| Sofistic Buffet | `PREENCHER` |
| Gran Dose | `PREENCHER` |

**Claude, antes de começar:**

- Descubra de qual empresa é este site: pela mensagem do dono ou pelo conteúdo
  do projeto (nome, logo, domínio). Se tiver qualquer dúvida, **pergunte**.
- Se algum valor desta seção ainda estiver como `PREENCHER`, **pare e peça o
  valor ao dono**. Nunca invente nem reaproveite URL, chave ou ID de outro
  lugar.
- Use **somente** a chave publishable (`sb_publishable_...`) ou, se for o caso,
  a anon legada (`eyJ...`). Se aparecer uma chave `sb_secret_...` ou
  `service_role`, não use, não grave em arquivo nenhum e avise o dono.

---

## 2. Objetivo e contexto (para o Claude)

Implementar no site o formulário de orçamento definido aqui e fazer cada envio
chegar ao CRM.

```
Formulário do site
   │  POST  {URL}/rest/v1/rpc/submit_quote_request   (chave publishable)
   ▼
Supabase: função submit_quote_request  →  valida e grava
   ▼
Tabela quote_requests  →  comanda "pendente" na aba Orçamentos do CRM
```

- O CRM e o banco **já estão prontos**. Seu trabalho é **só no site**: campos,
  validação, envio e mensagens.
- O site **não** grava direto em tabela. Ele chama a função
  `submit_quote_request`, que é a única coisa que a chave publishable consegue
  executar. Inserir direto em `/rest/v1/quote_requests` falha com
  "permission denied", e isso é proposital.
- Não precisa instalar `@supabase/supabase-js`. Um `fetch` resolve. Se o site já
  usa a biblioteca, pode usar `supabase.rpc("submit_quote_request", {...})`
  com o mesmo corpo.

### O que muda em relação ao formulário atual

O formulário atual tem: Nome, Telefone, **Tipo de evento (Social /
Corporativo)**, E-mail, Quantitativo, Descrição, caixa de autorização e
ENVIAR.

1. O campo **"Tipo de evento"** atual (Social / Corporativo) passa a se chamar
   **"Segmento"**. As opções continuam as mesmas.
2. **Campo novo: "Nome da empresa"**. Aparece **só** quando o Segmento for
   Corporativo.
3. **Campo novo: "Tipo de evento"**. Texto livre com sugestões (casamento,
   feira, congresso, aniversário...).
4. Cuidado para não confundir: o **"Tipo de evento" novo** é o texto livre do
   item 3, e o antigo virou "Segmento".

**Mantenha o visual do site.** Use as classes CSS, fontes, cores e o layout
que o formulário já tem. Os campos novos devem parecer que sempre estiveram lá.

**Destino atual do formulário.** Se o formulário hoje envia para algum lugar
(e-mail, PHP de envio, Formspree, WhatsApp, planilha...), **pergunte ao dono**
se ele quer manter esse envio junto com o CRM. Se ele não souber, mantenha os
dois funcionando. O que decide se o visitante vê sucesso ou erro é o envio ao
CRM.

**Mais de um formulário.** Procure no projeto todos os formulários de
orçamento: página de contato, rodapé, pop-up, landing pages. Todos seguem este
padrão.

---

## 3. Campos (padrão para todos os sites)

Ordem de exibição, de cima para baixo:

| # | Rótulo | `name` | Tipo | Obrigatório | Máx. | Placeholder / opções | Vai no JSON como |
|---|---|---|---|---|---|---|---|
| 1 | Nome | `nome` | texto (`autocomplete="name"`) | Sim | 150 | Seu nome | `p_nome` |
| 2 | Telefone | `telefone` | `tel` com máscara | Sim | 15 | (00) 00000-0000 | `p_telefone` |
| 3 | E-mail | `email` | `email` | Sim | 200 | seu@email.com | `p_email` |
| 4 | Segmento | `segmento` | 2 opções (rádio ou select) | Sim | — | Social / Corporativo. Valores: `social`, `corporativo`. Nenhuma pré-marcada | `p_segmento` |
| 5 | Nome da empresa | `nome_empresa` | texto (`autocomplete="organization"`) | Sim, **só** se Corporativo | 200 | Nome da empresa | `p_nome_empresa` |
| 6 | Tipo de evento | `tipo_evento` | texto com sugestões (`datalist`) | Sim | 100 | Ex.: casamento, aniversário, congresso | `p_tipo_evento` |
| 7 | Quantitativo | `quantitativo` | texto | Sim | 60 | Nº de convidados (ex.: 150) | `p_quantitativo` |
| 8 | Descrição | `descricao` | `textarea` | Não | 5000 | Conte sobre o evento: data, local, horário, preferências... | `p_descricao` |
| 9 | Autorização | `consentimento` | checkbox | Sim | — | ver abaixo | `p_consentimento` (`true`/`false`) |
| — | _(invisível)_ | `website` | honeypot | — | — | ver abaixo | **não envia** |
| — | ENVIAR | — | botão `submit` | — | — | — | — |

O banco exige no mínimo nome, telefone **ou** e-mail, segmento e autorização.
Os demais "Sim" da tabela são regra do formulário: valide no navegador.

### Detalhes de cada campo

- **Telefone:** use máscara brasileira `(00) 00000-0000` ou `(00) 0000-0000`
  (o código da seção 6 já faz isso) e exija DDD. No CRM o número vira link
  direto para o WhatsApp.
- **Segmento:** os valores enviados são exatamente `social` ou `corporativo`,
  em minúsculas. O que aparece na tela é "Social" e "Corporativo".
- **Nome da empresa:** escondido enquanto o segmento não for Corporativo. Ao
  marcar Corporativo, aparece logo abaixo do Segmento e vira obrigatório. Ao
  voltar para Social, some, deixa de ser obrigatório e **não é enviado**
  (`p_nome_empresa: null`).
- **Tipo de evento:** texto livre. Use um `<datalist>` com estas sugestões, para
  a pessoa escolher ou digitar outra coisa:
  - Social: Casamento, Aniversário, 15 anos, Formatura, Bodas, Batizado,
    Chá revelação.
  - Corporativo: Confraternização, Feira, Congresso, Convenção, Coffee break,
    Lançamento de produto, Treinamento.
  - Mais: Outro.
- **Quantitativo:** texto, não número. A pessoa pode escrever `150`,
  `150 pessoas` ou `100 a 150`.
- **Autorização:** se o site já tem um texto para a caixa, **mantenha o texto
  atual**. Se não tiver, use: _"Autorizo o contato por telefone, WhatsApp ou
  e-mail para receber o orçamento."_ Se o site tiver página de Política de
  Privacidade, coloque o link nela.
- **Honeypot `website`:** campo invisível para pessoas (fora da tela, não com
  `display:none`), com `tabindex="-1"`, `autocomplete="off"` e
  `aria-hidden="true"`. Se vier preenchido, foi um robô: mostre a mensagem de
  sucesso e **não envie nada**.
- **Botão:** mantenha o texto atual (ENVIAR). Durante o envio, desabilite e
  mostre "ENVIANDO...".

---

## 4. Envio para o CRM

### Requisição

```
POST {URL do projeto}/rest/v1/rpc/submit_quote_request

Headers:
  apikey: {chave publishable}
  Content-Type: application/json
  Authorization: Bearer {chave}    ← SÓ se a chave for a legada "eyJ...";
                                     com sb_publishable_ NÃO envie este header
```

Corpo: JSON com **exatamente** estas 10 chaves, nem mais nem menos:

```json
{
  "p_company_id": "ID da empresa deste site (seção 1)",
  "p_nome": "Maria Silva",
  "p_telefone": "(81) 99999-0000",
  "p_email": "maria@exemplo.com",
  "p_quantitativo": "150 pessoas",
  "p_segmento": "corporativo",
  "p_nome_empresa": "Empresa X",
  "p_tipo_evento": "Congresso",
  "p_descricao": "Evento em março, centro de convenções.",
  "p_consentimento": true
}
```

Regras do corpo:

- Tire os espaços das pontas de todos os textos (`trim`). Campo vazio vai
  como `null`.
- `p_nome_empresa` vai `null` quando o segmento for `social`.
- `p_consentimento` é booleano (`true`/`false`), não `"on"`.
- **Não renomeie** nenhuma chave e **não acrescente** chaves extras. A API
  procura a função pelos nomes dos parâmetros. Qualquer diferença dá 404
  (`PGRST202`).

### Respostas

| Resposta | O que fazer |
|---|---|
| `200` com um número (ex.: `42`) | Sucesso. É o número da comanda. Limpe o formulário e mostre a mensagem de sucesso |
| `400` com `"code": "22023"` | Erro de validação do banco. O campo `message` já vem em português e pronto para o visitante: **mostre `message`** |
| Qualquer outro erro (`400` sem 22023, `401`, `404`, `5xx`, sem rede, timeout) | Mostre a mensagem genérica de falha e registre os detalhes no `console.error` |

Mensagens de validação que o banco pode devolver (todas com `code` 22023):

| `message` | Causa |
|---|---|
| Informe o nome. | Nome vazio |
| Informe um telefone ou e-mail para contato. | Telefone e e-mail vazios |
| E-mail inválido. | E-mail fora do formato |
| Segmento inválido (use social ou corporativo). | `p_segmento` com outro valor |
| É preciso autorizar o contato. | `p_consentimento` falso |
| Algum campo passou do tamanho máximo. | Texto maior que o limite da seção 3 |
| Muitos pedidos em pouco tempo. Tente novamente mais tarde. | Mais de 3 pedidos do mesmo telefone ou e-mail em 10 minutos |
| Empresa inválida. | `p_company_id` errado, ou empresa desativada no CRM |

Erros de configuração (não são culpa do visitante; avise o dono):

| Resposta | Causa provável |
|---|---|
| `401` "Invalid API key" | Chave errada ou de outro projeto Supabase |
| `404` `PGRST202` "Could not find the function" | A migração 006 não foi rodada no Supabase, ou o JSON tem chave a mais ou com nome errado |
| "Empresa inválida." já no primeiro teste | ID da empresa errado (trocou o ID da Sofistic com o da Gran Dose?) |

---

## 5. Comportamento na tela

- **Validação no navegador** antes de enviar: obrigatórios, formato de e-mail,
  telefone com DDD e limites de tamanho (`maxlength`). Pode ser a validação
  nativa do HTML (`required`, `pattern`) ou a que o site já usa.
- **Enviando:** botão desabilitado com "ENVIANDO..." (evita envio em dobro).
- **Sucesso:** limpe o formulário, esconda de novo o "Nome da empresa" e
  mostre: _"Pedido enviado! Em breve entraremos em contato com o seu
  orçamento."_
- **Erro:** **não** limpe o formulário (a pessoa não pode perder o que
  digitou). Mostre a mensagem da seção 4 perto do botão. Mensagem genérica:
  _"Não foi possível enviar agora. Tente novamente em instantes."_
- As mensagens de sucesso e erro ficam num elemento com `role="status"`, para
  leitores de tela.
- **Conversões:** se o site já dispara eventos ao enviar o formulário (Google
  Analytics, Google Ads, Meta Pixel...), mantenha, mas dispare **só no
  sucesso**.
- **Celular:** confira se os campos novos e a mensagem ficam bem no celular.

---

## 6. Implementação de referência (HTML + JavaScript)

Adapte ao site: troque a marcação pelas classes e pela estrutura atuais, mas
mantenha a lógica. Ela funciona em site estático, PHP, WordPress (bloco HTML)
ou qualquer página em que dê para colocar um `<script>`.

```html
<form id="form-orcamento">
  <label for="orc-nome">Nome</label>
  <input id="orc-nome" name="nome" type="text" autocomplete="name"
         required maxlength="150" placeholder="Seu nome" />

  <label for="orc-telefone">Telefone</label>
  <input id="orc-telefone" name="telefone" type="tel" inputmode="tel"
         autocomplete="tel-national" required maxlength="15"
         pattern="\(\d{2}\) \d{4,5}-\d{4}"
         title="Telefone com DDD, ex.: (81) 99999-0000"
         placeholder="(00) 00000-0000" />

  <label for="orc-email">E-mail</label>
  <input id="orc-email" name="email" type="email" autocomplete="email"
         required maxlength="200" placeholder="seu@email.com" />

  <fieldset>
    <legend>Segmento</legend>
    <label><input type="radio" name="segmento" value="social" required /> Social</label>
    <label><input type="radio" name="segmento" value="corporativo" /> Corporativo</label>
  </fieldset>

  <!-- Só aparece com Segmento = Corporativo -->
  <div id="orc-campo-empresa" hidden>
    <label for="orc-empresa">Nome da empresa</label>
    <input id="orc-empresa" name="nome_empresa" type="text"
           autocomplete="organization" maxlength="200"
           placeholder="Nome da empresa" />
  </div>

  <label for="orc-tipo">Tipo de evento</label>
  <input id="orc-tipo" name="tipo_evento" type="text" list="orc-tipos"
         required maxlength="100"
         placeholder="Ex.: casamento, aniversário, congresso" />
  <datalist id="orc-tipos">
    <option value="Casamento"></option>
    <option value="Aniversário"></option>
    <option value="15 anos"></option>
    <option value="Formatura"></option>
    <option value="Bodas"></option>
    <option value="Batizado"></option>
    <option value="Chá revelação"></option>
    <option value="Confraternização"></option>
    <option value="Feira"></option>
    <option value="Congresso"></option>
    <option value="Convenção"></option>
    <option value="Coffee break"></option>
    <option value="Lançamento de produto"></option>
    <option value="Treinamento"></option>
    <option value="Outro"></option>
  </datalist>

  <label for="orc-qtd">Quantitativo</label>
  <input id="orc-qtd" name="quantitativo" type="text" required maxlength="60"
         placeholder="Nº de convidados (ex.: 150)" />

  <label for="orc-descricao">Descrição</label>
  <textarea id="orc-descricao" name="descricao" rows="4" maxlength="5000"
            placeholder="Conte sobre o evento: data, local, horário, preferências..."></textarea>

  <!-- Armadilha para robôs: invisível para pessoas. NÃO remova. -->
  <div aria-hidden="true"
       style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">
    <label for="orc-website">Não preencha este campo</label>
    <input id="orc-website" name="website" type="text" tabindex="-1" autocomplete="off" />
  </div>

  <label>
    <input type="checkbox" name="consentimento" required />
    Autorizo o contato por telefone, WhatsApp ou e-mail para receber o orçamento.
  </label>

  <button type="submit">ENVIAR</button>
  <p id="orc-status" role="status"></p>
</form>

<script>
(() => {
  // ===== Configuração deste site (seção 1 do formulariopadrao.md) =====
  const SUPABASE_URL = "PREENCHER"; // ex.: https://abcdefgh.supabase.co (sem barra no fim)
  const SUPABASE_KEY = "PREENCHER"; // chave publishable: sb_publishable_...
  const COMPANY_ID = "PREENCHER";   // ID da empresa DESTE site
  // ====================================================================

  const MSG_SUCESSO = "Pedido enviado! Em breve entraremos em contato com o seu orçamento.";
  const MSG_FALHA = "Não foi possível enviar agora. Tente novamente em instantes.";

  const form = document.getElementById("form-orcamento");
  if (!form) return;
  const status = document.getElementById("orc-status");
  const campoEmpresa = document.getElementById("orc-campo-empresa");
  const botao = form.querySelector('button[type="submit"]');
  const { telefone, nome_empresa: empresa } = form.elements;

  // (81) 99999-0000 / (81) 3333-0000. Aceita colar com +55.
  function mascaraTelefone(valor) {
    let d = valor.replace(/\D/g, "");
    if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
    d = d.slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  // "Nome da empresa" só existe para Corporativo.
  function atualizarSegmento() {
    const corporativo = form.elements.segmento.value === "corporativo";
    campoEmpresa.hidden = !corporativo;
    empresa.required = corporativo;
  }

  // Texto sem espaços nas pontas; vazio vira null.
  function texto(nome) {
    const valor = (form.elements[nome]?.value ?? "").trim();
    return valor === "" ? null : valor;
  }

  async function enviarOrcamento(dados) {
    const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
    // Chave anon legada (JWT "eyJ...") também precisa do Authorization.
    if (SUPABASE_KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${SUPABASE_KEY}`;

    let res;
    try {
      res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_quote_request`, {
        method: "POST",
        headers,
        body: JSON.stringify(dados),
        signal: AbortSignal.timeout(20000),
      });
    } catch (erro) {
      console.error("[orçamento] sem resposta do CRM", erro);
      throw new Error(MSG_FALHA);
    }

    const corpo = await res.json().catch(() => null);
    if (res.ok) return corpo; // número da comanda
    console.error("[orçamento] CRM recusou o pedido", res.status, corpo);
    // 22023 = validação do banco; a mensagem já vem em português.
    throw new Error(corpo?.code === "22023" ? corpo.message : MSG_FALHA);
  }

  telefone.addEventListener("input", () => {
    telefone.value = mascaraTelefone(telefone.value);
  });
  form.querySelectorAll('[name="segmento"]').forEach((el) =>
    el.addEventListener("change", atualizarSegmento),
  );
  atualizarSegmento();

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (botao.disabled) return;

    // Honeypot preenchido = robô: finge sucesso e não envia.
    if (texto("website")) {
      form.reset();
      atualizarSegmento();
      status.textContent = MSG_SUCESSO;
      return;
    }

    const segmento = texto("segmento");
    const dados = {
      p_company_id: COMPANY_ID,
      p_nome: texto("nome"),
      p_telefone: texto("telefone"),
      p_email: texto("email"),
      p_quantitativo: texto("quantitativo"),
      p_segmento: segmento,
      p_nome_empresa: segmento === "corporativo" ? texto("nome_empresa") : null,
      p_tipo_evento: texto("tipo_evento"),
      p_descricao: texto("descricao"),
      p_consentimento: form.elements.consentimento.checked,
    };

    const textoBotao = botao.textContent;
    botao.disabled = true;
    botao.textContent = "ENVIANDO...";
    status.textContent = "";

    try {
      await enviarOrcamento(dados);
      form.reset();
      atualizarSegmento();
      status.textContent = MSG_SUCESSO;
      // Conversões (GA4, Google Ads, Meta Pixel) disparam aqui, só no sucesso.
    } catch (erro) {
      status.textContent = erro.message; // o formulário NÃO é limpo
    } finally {
      botao.disabled = false;
      botao.textContent = textoBotao;
    }
  });
})();
</script>
```

Cuidados ao adaptar:

- Se o CSS do site sobrescreve o atributo `hidden` (ex.: `.campo { display:
  flex }`), garanta `[hidden] { display: none !important; }` ou esconda via
  `style.display`.
- Se houver mais de um formulário na mesma página, troque os `id` por classes
  ou um prefixo por formulário, para não repetir `id`.
- Se o botão tiver ícone, troque só o texto dele e não o `textContent`
  inteiro.
- Se os campos atuais já têm outros `name`, pode mantê-los. O que não pode
  mudar é o JSON enviado (seção 4).

### Adaptações por tipo de site

- **React / Next.js:** um componente cliente (`"use client"` no Next) com os
  mesmos campos, estado para o segmento, e a mesma função `enviarOrcamento`
  com `fetch`. Os três valores da configuração são públicos: deixe como
  constantes num arquivo de configuração (ex.: `lib/crm.ts`), sem precisar
  criar variável de ambiente na hospedagem.
- **Site com backend próprio** (PHP, rota de API, server action) que hoje
  recebe o formulário: pode fazer a chamada ao CRM pelo servidor, com a mesma
  requisição da seção 4. Repasse a `message` do erro 22023 para a tela.
- **WordPress:** se o tema está no projeto, coloque o formulário no template
  da página e o script num arquivo `.js` carregado pelo tema (child theme, se
  houver). Não edite arquivos de plugins. Se o formulário atual é de plugin
  (Contact Form 7, Elementor Form, WPForms...), substitua por um bloco/widget
  de **HTML personalizado** com o código acima e o estilo do site.
- **Formulário montado no painel do site** (Elementor, Wix, Webflow...) e não
  no código: gere um arquivo único `formulario-orcamento.html` (HTML + CSS +
  script) pronto para colar, e explique ao dono, passo a passo, onde colar.
- **Content-Security-Policy:** se o site define CSP, acrescente a URL do
  Supabase em `connect-src`.

---

## 7. O que NÃO fazer

- Não usar a secret key (`sb_secret_...`) nem a `service_role`.
- Não criar, alterar ou consultar tabelas. Não chamar outro endpoint do
  Supabase além de `/rest/v1/rpc/submit_quote_request`.
- Não renomear os parâmetros `p_...` nem mandar chaves extras no JSON.
- Não mudar a identidade visual do site nem mexer em partes do site que não
  têm a ver com o formulário.
- Não remover o envio antigo do formulário (e-mail etc.) sem o dono
  confirmar.
- Não publicar o site (deploy, push) sem o dono pedir.

---

## 8. Como testar

**Atenção:** cada teste que dá certo cria uma comanda **de verdade** no CRM.
Use o nome **"TESTE — pode excluir"**. O banco aceita no máximo 3 pedidos do
mesmo telefone ou e-mail a cada 10 minutos, então varie o telefone e o e-mail
entre os testes.

1. **Teste direto da API** (antes de mexer no site), com os valores da
   seção 1:

   ```bash
   curl -i -X POST "URL_DO_PROJETO/rest/v1/rpc/submit_quote_request" \
     -H "apikey: CHAVE_PUBLISHABLE" \
     -H "Content-Type: application/json" \
     -d '{
       "p_company_id": "ID_DA_EMPRESA",
       "p_nome": "TESTE — pode excluir",
       "p_telefone": "(81) 90000-0001",
       "p_email": "teste1@exemplo.com",
       "p_quantitativo": "100",
       "p_segmento": "corporativo",
       "p_nome_empresa": "Empresa Teste",
       "p_tipo_evento": "Congresso",
       "p_descricao": "Teste da integração do site.",
       "p_consentimento": true
     }'
   ```

   Tem que voltar `200` com um número. Se voltar `404 PGRST202`, **pare** e
   peça ao dono para rodar a migração 006 no Supabase (seção 0, passo 1). Se
   voltar 401 ou "Empresa inválida.", revise a seção 1 com o dono.

2. **Teste pelo site** (rodando localmente, se possível):
   - [ ] Envio Social completo → mensagem de sucesso e formulário limpo.
   - [ ] Envio Corporativo → "Nome da empresa" aparece e é obrigatório.
   - [ ] Voltar de Corporativo para Social → campo some e não é enviado.
   - [ ] Campos obrigatórios vazios → o navegador barra antes de enviar.
   - [ ] E-mail inválido e telefone sem DDD → barrados.
   - [ ] Erro do banco aparece na tela sem limpar o formulário (ex.: tire
         temporariamente o `required` da autorização e envie desmarcado →
         "É preciso autorizar o contato.").
   - [ ] Botão desabilitado durante o envio.
   - [ ] Layout ok no celular.

---

## 9. Ao terminar, informe ao dono

1. Quais arquivos foram alterados ou criados.
2. Como ver o formulário funcionando (local ou endereço).
3. Quantas comandas de teste foram criadas, para ele **apagar** no CRM
   (aba **Orçamentos** → **⋯ → Excluir pedido**).
4. O que falta para ir ao ar: publicar o site, colar o HTML no painel, etc.
   Explique em passos simples, sem termos técnicos.
5. Se ficou alguma dúvida ou decisão pendente (ex.: manter o envio antigo por
   e-mail).
