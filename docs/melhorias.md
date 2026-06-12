# Melhorias do Pipefine

Roteiro de evolução do sistema, levantado a partir de uma auditoria completa do
código (interface, funcionalidades de negócio, segurança e qualidade técnica).
Todas as sugestões respeitam a regra do projeto: **somente ferramentas
gratuitas** (Supabase Free, Vercel Hobby, sem APIs pagas).

**Como ler:** cada item tem `Impacto` (quanto melhora o dia a dia / o negócio)
e `Esforço` (quanto custa implementar). Comece pelos itens de impacto alto e
esforço baixo.

---

## ⭐ Por onde começar (Top 10)

| # | Melhoria | Impacto | Esforço | Por quê |
|---|----------|---------|---------|---------|
| 1 | Corrigir escalada de privilégio em Configurações | 🔴 Crítico | Baixo | Hoje qualquer usuário pode se promover a admin |
| 2 | Backup automático do banco | Alto | Médio | Plano free do Supabase não tem backup; um erro apaga dados do negócio |
| 3 | Botões de WhatsApp com mensagens prontas | Alto | Baixo | A ação mais frequente do dia (chamar cliente) vira 1 clique |
| 4 | Contas a receber por parcela | Alto | Baixo | As parcelas já existem; falta a tela de cobrança |
| 5 | App instalável no celular (PWA) | Alto | Baixo | Pipefine vira "aplicativo" na tela inicial da família |
| 6 | Paginação/limites nas consultas | Alto | Médio | Bug latente: com muitos dados, o financeiro calcula errado em silêncio |
| 7 | Permissões por papel (RLS) | Alto | Médio | Os papéis Admin/Comercial/Financeiro existem mas não restringem nada |
| 8 | Calendário de eventos + alerta de conflito de data | Alto | Médio | Visão do mês de relance; evita overbooking |
| 9 | Tela de erro amigável (error boundary) | Médio | Baixo | Hoje qualquer falha derruba a página inteira |
| 10 | Sino de notificações no topo | Alto | Médio | Follow-ups de hoje/atrasados visíveis de qualquer tela |

---

## 📱 Experiência de uso & Mobile

### 1. Botões de WhatsApp e ligação direto nos leads
**Impacto: alto · Esforço: baixo**
O telefone aparece como texto puro no detalhe do lead, na tabela e nos cards do
Kanban — o time copia e cola número no WhatsApp manualmente. Adicionar ícones
de ação "WhatsApp" (`https://wa.me/55<numero>`) e "Ligar" (`tel:`) em todos os
pontos onde o telefone aparece. 100% gratuito (deep link, sem API). Versão
turbinada: mensagens pré-preenchidas por contexto (follow-up de orçamento,
cobrança de parcela vencida, confirmação de evento) via `?text=<template>`.
É provavelmente a feature de maior retorno por hora de trabalho.

### 2. Mover card do Kanban sem arrastar (menu "Mover para…")
**Impacto: alto · Esforço: médio**
No celular, arrastar cards exige segurar 180ms e atravessar colunas com scroll
horizontal — impreciso e conflita com o gesto de rolagem. Um menu de contexto
no card ("Mover para → coluna") reaproveita os mesmos diálogos de
perda/follow-up/fechamento que o arrastar já dispara. O drag continua no
desktop; no celular vira um toque. Complemento barato: `snap-x` no contêiner
para a rolagem parar coluna a coluna.

### 3. Sino de notificações no topbar
**Impacto: alto · Esforço: médio**
O dashboard já calcula follow-ups de hoje e atrasados, mas quem está em outra
tela não vê nada. Um ícone de sino no topo com badge numérico (vermelho se
houver atrasados) e dropdown listando os próximos follow-ups com link para o
lead — "notificação dentro do painel" sem nenhum serviço pago.

### 4. Transformar em PWA (app instalável no celular)
**Impacto: alto · Esforço: baixo**
Criar `app/manifest.ts` (suporte nativo do Next.js) com nome, ícones gerados a
partir da logo e display "standalone". O Pipefine passa a ser instalado na
tela inicial do celular, abrindo em tela cheia sem barra de navegador. Custo
zero, funciona no Vercel Hobby.

### 5. Ativar o dark mode (já está 90% pronto)
**Impacto: médio · Esforço: baixo**
Os tokens do tema escuro (grafite/creme invertido) já existem no
`globals.css`, e o pacote `next-themes` já está instalado — só não há toggle.
Basta o ThemeProvider + um item "Tema: claro/escuro/sistema" no menu do
usuário. Ótimo para quem confere follow-ups à noite.

### 6. Linha inteira clicável nas tabelas
**Impacto: médio · Esforço: baixo**
Na lista de leads, a linha tem cursor de link mas só o nome é clicável — tocar
em Empresa/Status/Valor não faz nada. Em eventos e clientes é igual. Tornar a
linha toda navegável reduz erro de toque no celular.

### 7. Contadores nas abas de follow-ups + botão "Desfazer"
**Impacto: médio · Esforço: baixo**
As abas Hoje/Atrasados/Próximos não mostram quantos itens há em cada uma — é
preciso clicar para descobrir. Mostrar "Atrasados (3)" com badge vermelha.
Junto: toast com ação "Desfazer" ao concluir follow-up (hoje é irreversível
pela interface).

### 8. Busca global (Ctrl+K / lupa no topo)
**Impacto: médio · Esforço: médio**
Não há como achar "a Maria do casamento" sem navegar até a tela certa. Uma
paleta de comandos (componente `command` do shadcn/ui, gratuito) buscando
leads, clientes e eventos pelo nome, com atalhos de ação ("Novo lead", "Ir
para Financeiro").

### 9. Ajustes de toque no menu inferior mobile (safe area)
**Impacto: médio · Esforço: baixo**
O menu inferior não tem padding para a "safe area" — em iPhones com gesto de
home, os ícones ficam colados na barra e geram toques fantasma. Corrigir com
`env(safe-area-inset-bottom)` e aumentar a área de toque dos itens (hoje
abaixo do mínimo recomendado de ~44px).

### 10. Acessibilidade do Kanban (teclado e leitor de tela)
**Impacto: médio · Esforço: baixo**
O drag-and-drop só funciona com mouse/touch. Adicionar `KeyboardSensor` do
dnd-kit + anúncios em PT-BR para leitores de tela. O menu "Mover para…" (item
2) também cobre teclado como alternativa.

### 11. Onboarding leve no dashboard
**Impacto: médio · Esforço: baixo**
Um card dispensável "Como funciona o fluxo" (Lead → Kanban → Fechado → Evento
→ Financeiro) para os novos usuários da família se situarem sem treinamento.

---

## 💼 Funcionalidades de negócio

### 12. Calendário visual de eventos + alerta de conflito de data
**Impacto: alto · Esforço: médio**
A aba Eventos é só uma tabela. Para buffet, ver o mês de relance (quantos
eventos por dia, fins de semana lotados) é essencial. Visão de calendário
mensal com toggle tabela/calendário (mesmo padrão do Lista/Kanban em Leads) e,
no formulário, **aviso quando já existe evento na mesma data/empresa** — evita
overbooking de equipe e estrutura. Dá para fazer com CSS grid + date-fns (já
instalado), sem lib paga.

### 13. Controle de custos por evento e margem de lucro
**Impacto: alto · Esforço: alto**
O financeiro só conhece **receita**. Buffet vive de **margem**: insumos,
equipe extra, locação, decoração. Criar tabela `event_costs` (categoria,
descrição, valor) com cadastro na página do evento, mostrando Custo total,
Lucro e Margem % — e lucro por mês no Financeiro. É a melhoria que mais muda a
decisão de preço (o ticket médio sem custo engana).

### 14. Proposta/orçamento em página imprimível (PDF grátis)
**Impacto: alto · Esforço: médio**
O lead já guarda tudo que uma proposta precisa (nome, tipo, data, local,
pessoas, valor). Criar rota `/leads/[id]/proposta` com layout limpo (logo da
empresa, serviços, valores, condições de pagamento) e CSS de impressão: clica
"Gerar proposta" → imprime/salva PDF pelo navegador → envia no WhatsApp. Zero
custo, sem lib de PDF. O mesmo template serve de contrato simples do evento.

### 15. Contas a receber por parcela (vencidas e a vencer)
**Impacto: alto · Esforço: baixo**
As parcelas já têm vencimento e flag de pago, mas nada mostra **quando
cobrar**. Seção "A receber" no Financeiro: parcelas vencidas (em vermelho) e
dos próximos 30 dias, com link para o evento e botão de marcar como paga (a
action já existe). No dashboard, card "Parcelas atrasadas: N (R$ X)".
Transforma o cadastro de parcelas em ferramenta ativa de cobrança.

### 16. Radar de recompra: 1 ano do evento + aniversário do cliente
**Impacto: alto · Esforço: médio**
Buffet tem recompra natural anual (aniversário infantil, festa de empresa,
formatura). Lista "Oportunidades de recompra": eventos finalizados completando
~11 meses (hora de abordar para a edição do ano seguinte), com botão de criar
lead já preenchido. Complemento: campo de data de nascimento no cliente para
lembrete de aniversário com mensagem via wa.me.

### 17. Duplicar evento (e lead)
**Impacto: médio · Esforço: baixo**
Clientes corporativos e festas recorrentes repetem quase tudo. Botão
"Duplicar" no evento que abre o formulário pré-preenchido (mudando a data e
zerando pagamentos). Mesmo padrão para reabrir um lead perdido como novo lead.

### 18. Metas mensais de vendas por empresa
**Impacto: médio · Esforço: médio**
Tabela `sales_goals` (empresa, ano, mês, meta) editável em Configurações +
barra de progresso "Faturamento vs. meta" no dashboard e no Financeiro. O
faturamento já é calculado — falta a referência para saber se o mês está bom.

### 19. Exportar CSV (eventos, leads, clientes, financeiro)
**Impacto: médio · Esforço: baixo**
Já está no roadmap do README. Botões de exportação respeitando os filtros
ativos da tela, para abrir no Excel/Google Sheets — útil para contador, backup
e análises. Sem lib externa (montar o CSV e responder `text/csv`).

### 20. Ordem de serviço operacional (cardápio, equipe, fornecedores)
**Impacto: alto · Esforço: alto**
Hoje o operacional depende de dois campos de texto livre. Estruturar a "ficha
do evento": cardápio (itens/quantidades), equipe escalada (nome/função) e
fornecedores/aluguéis, com rota imprimível `/eventos/[id]/ordem-de-servico`
para entregar à equipe no dia. É o que conecta o sistema à cozinha, não só ao
comercial. (O papel "Operacional" existe no sistema mas não tem nenhuma
funcionalidade dedicada.)

### 21. Checklist pré-evento com tarefas e prazos
**Impacto: alto · Esforço: médio**
Follow-ups hoje só existem para leads. Eventos confirmados também têm tarefas
com prazo: fechar cardápio (D-15), confirmar equipe (D-7), comprar insumos
(D-3), receber parcela final. Tabela `event_tasks` com templates por tipo de
evento, e as tarefas do dia entram na seção "Ações de hoje" do dashboard junto
com os follow-ups.

### 22. Exportar evento para Google Calendar / arquivo .ics
**Impacto: médio · Esforço: baixo**
Botão "Adicionar à agenda" no evento: gera link do Google Calendar (URL
pública gratuita) ou arquivo .ics com título, data, horário e local. A família
passa a ter os eventos no celular com lembrete nativo — supre a falta de
notificação push sem custo algum.

### 23. Ativar o histórico de alterações (auditoria)
**Impacto: médio · Esforço: médio**
A tabela `activity_logs` já existe no banco com RLS configurada — mas nenhum
código grava nela. Criar um helper `logActivity()` e chamá-lo nas ações
sensíveis (mudou status, alterou valor, marcou parcela paga, excluiu evento).
Com 4 pessoas mexendo nos mesmos dados, responde o clássico "quem mudou o
valor desse evento?". Exibir timeline na página do lead/evento.
*Importante:* mudar a política da tabela para impedir que o próprio usuário
apague o rastro (hoje a RLS permite delete no log).

---

## 🔒 Segurança & Controle de acesso

### 24. 🔴 URGENTE — Corrigir escalada de privilégio em Configurações
**Impacto: alto · Esforço: baixo**
A action `updateProfile` aceita mudar o papel de **qualquer** perfil sem
verificar quem chama — qualquer um dos 4 usuários pode se promover a admin ou
rebaixar os outros. Corrigir checando `getCurrentProfile().role === "admin"`
no servidor (a função já existe em `lib/auth.ts`) e reforçar com política RLS
em `users_profile`. Pré-requisito para qualquer permissão por papel funcionar.

### 25. Permissões por papel (RLS)
**Impacto: alto · Esforço: médio**
Hoje **qualquer autenticado pode ler/escrever/excluir tudo** em todas as
tabelas — e como a chave anon é pública, um usuário logado pode chamar a API
do Supabase direto, fora da interface. Os papéis (admin/comercial/operacional/
financeiro) existem mas não restringem nada. Criar função SQL `get_my_role()`
e políticas como: excluir leads/eventos/empresas só admin; editar valores e
parcelas só admin+financeiro; perfil editável só pelo dono (sem mudar o
próprio papel) ou por admin. É a mudança de segurança de maior retorno.

### 26. Backup automático do banco (grátis)
**Impacto: alto · Esforço: médio**
O plano gratuito do Supabase **não inclui backup automático** — um DELETE
errado perde dados financeiros sem volta. Solução gratuita: GitHub Actions com
cron diário rodando `pg_dump` (connection string em secret) e salvando o .sql
como artifact. Para um CRM com contratos e parcelas, é a proteção mais barata
contra o pior cenário.

### 27. Aplicar o flag de usuário ativo/inativo
**Impacto: médio · Esforço: baixo**
A coluna `users_profile.active` existe mas **nada a verifica** — desativar um
usuário hoje não tem efeito. Checar no `requireUser`/`getCurrentProfile` (com
signOut forçado) e nas políticas RLS. Adicionar botão Ativar/Desativar usuário
em Configurações (o padrão já existe para empresas).

### 28. Limite de tentativas de login (rate limiting)
**Impacto: médio · Esforço: médio**
O login não tem nenhum freio contra tentativa de adivinhação de senha.
Solução gratuita: tabela `login_attempts` no próprio Supabase; bloquear após 5
falhas em 15 minutos. Junto: subir a senha mínima de 6 para 8+ caracteres.

### 29. Validação de dados no servidor (zod)
**Impacto: médio · Esforço: médio**
As actions confiam no formulário: status é convertido sem validar, números
aceitam negativos, datas e e-mails sem checagem de formato. Adicionar `zod`
(gratuito) com schemas por entidade e mensagens de erro em português. Melhora
segurança e a qualidade das mensagens de uma vez.

### 30. Fechar open redirect no login
**Impacto: baixo · Esforço: baixo (1 linha)**
O `redirectTo` aceita `//site-malicioso.com` (passa no teste de começar com
`/`). Um link de phishing levaria o usuário para fora após digitar a senha.
Correção: exigir `startsWith("/") && !startsWith("//")`.

### 31. Endurecer sessões (MFA grátis + logout global)
**Impacto: médio · Esforço: baixo**
O Supabase inclui MFA por aplicativo autenticador (TOTP) no plano gratuito —
vale ativar ao menos para a conta admin. Complemento: usar
`signOut({ scope: "global" })` para revogar a sessão em todos os dispositivos
(relevante se alguém perde o celular).

---

## ⚙️ Qualidade técnica & Performance

### 32. Paginação/limites nas consultas (bug financeiro latente)
**Impacto: alto · Esforço: médio**
Nenhuma listagem usa limite — e o Supabase **corta silenciosamente em 1.000
linhas**. Quando leads/eventos acumularem, o Financeiro e os Relatórios vão
calcular faturamento/conversão com dados **incompletos sem nenhum erro**.
Corrigir com paginação nas listas (50 por página) e agregação no banco
(SUM/GROUP BY) para o financeiro. É corretude, não só performance.

### 33. Testes automatizados na lógica financeira
**Impacto: alto · Esforço: alto**
Zero testes no projeto, e o maior risco está na lógica de dinheiro — que já é
pura e fácil de testar sem banco: geração de parcelas, divisão de valores,
status de pagamento, agregação do financeiro. Começar com Vitest nesses
módulos protege contra o tipo de regressão que causa prejuízo real (parcela
errada, status errado). Depois, 1 teste Playwright do fluxo completo: criar
lead → fechar → evento → financeiro.

### 34. Tela de erro amigável (error boundary)
**Impacto: médio · Esforço: baixo (~30 linhas)**
Não existe nenhum `error.tsx` — um timeout do Supabase mostra a tela de erro
genérica do Next, sem botão de tentar de novo e sem português. Um
`app/(app)/error.tsx` com mensagem amigável + "Tentar novamente" cobre todas
as páginas de uma vez.

### 35. Monitoramento de erros em produção (Sentry grátis)
**Impacto: médio · Esforço: baixo**
Os logs do Vercel Hobby somem em ~1h — erros que a família encontrar se
perdem. O Sentry free tier (5k eventos/mês, de sobra para 4 usuários) captura
erros de servidor e cliente com ~15 min de setup.

### 36. Eliminar consultas duplicadas por página (React cache)
**Impacto: médio · Esforço: baixo (~5 linhas)**
Em cada navegação, a lista de empresas é buscada 2-3 vezes (layout + página).
Envolver `getCompanies`/`getActiveCompanyContext` em `cache()` do React
memoriza por requisição — latência menor em todas as páginas, sem mudança de
comportamento.

### 37. Filtrar clientes no banco (não em memória)
**Impacto: médio · Esforço: médio**
O Banco de Clientes busca todos os clientes com todos os leads e eventos
embutidos e filtra a empresa em JavaScript — o payload cresce com o histórico.
Mover o filtro para o banco (inner join ou uma VIEW `client_summary`).

### 38. Quebrar o kanban-board.tsx (659 linhas) em partes
**Impacto: médio · Esforço: médio**
O componente acumula DnD + estado otimista + 3 diálogos completos inline.
Extrair um hook `useKanbanBoard` e os diálogos em arquivos próprios facilita
manutenção e reduz re-renders.

### 39. Gerar os tipos do banco automaticamente (grátis)
**Impacto: médio · Esforço: baixo**
Os tipos do banco são mantidos à mão (sob a premissa de que a geração seria
paga — mas `npx supabase gen types typescript` é gratuito). Com tipos gerados,
os casts `as unknown as` somem e o TypeScript passa a acusar coluna errada no
build, não em produção.

### 40. Unificar o padrão das Server Actions
**Impacto: médio · Esforço: médio**
O esqueleto try/catch + auth + revalidação se repete 20+ vezes, e a função
`errMsg` está duplicada em 5 arquivos com versões divergentes (algumas não
mostram o erro real do banco). Extrair `lib/action-utils.ts` com `errMsg`
único e um wrapper de action. Menos ~150 linhas e erros consistentes.

### 41. Limpar o código de fallback das parcelas
**Impacto: baixo · Esforço: baixo**
Cada operação de evento faz uma consulta extra só para descobrir se a migração
002 foi aplicada. Depois de rodar a migração de vez, apagar o fallback
(`paymentFeatureAvailable` etc.) simplifica o código e elimina o roundtrip.

---

## 🗺️ Roadmap sugerido

### Fase 1 — Vitórias rápidas e correções críticas (alguns dias)
Itens **24** (escalada de privilégio), **30** (open redirect), **34**
(error.tsx), **1** (WhatsApp), **4** (PWA), **6** (linha clicável), **7**
(contadores), **5** (dark mode), **17** (duplicar evento), **36** (React
cache), **41** (limpar fallback).

### Fase 2 — Fundações de confiança (1-2 semanas)
Itens **26** (backup), **25** (RLS por papel), **27** (usuário inativo),
**32** (paginação), **15** (contas a receber), **3** (sino de notificações),
**12** (calendário de eventos), **2** (mover card sem arrastar).

### Fase 3 — Expansão do negócio (1-2 meses)
Itens **13** (custos e margem), **14** (proposta em PDF), **20** (ordem de
serviço), **21** (checklist pré-evento), **16** (radar de recompra), **18**
(metas), **23** (auditoria), **19** (CSV), **22** (.ics), **33** (testes),
**8** (busca global), **29** (zod), **28** (rate limiting).

---

*Documento gerado em 06/2026 a partir de auditoria do código. Ao implementar
um item, risque-o daqui ou mova para um CHANGELOG.*
