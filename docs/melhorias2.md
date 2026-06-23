# Melhorias do Pipefine — Parte 2

Segunda rodada de evolução do sistema, a partir de uma nova auditoria profunda do
código (lógica de negócio, modelo de dados, segurança, performance, qualidade
técnica e experiência de uso). **Nenhum item se repete** em relação ao
`melhorias.md` — são 120 sugestões novas. Continua valendo a regra do projeto:
**somente ferramentas gratuitas** (Supabase Free, Vercel Hobby, sem APIs pagas).

**Como ler:** cada item tem `Impacto` (quanto melhora o dia a dia / o negócio) e
`Esforço` (quanto custa implementar). Comece pelos de impacto alto e esforço
baixo. A numeração recomeça em 1 (item **N** aqui = item **N** desta parte 2).

---

## ⭐ Por onde começar (Top 10)

| # | Melhoria | Impacto | Esforço | Por quê |
|---|----------|---------|---------|---------|
| 1 | Timezone correto nas datas (UTC vs. local) | 🔴 Crítico | Baixo | `new Date(data_evento).getMonth()` pode jogar faturamento para o mês errado |
| 2 | CHECK constraints de dinheiro no banco | Alto | Baixo | Hoje aceita valor negativo, entrada > total e parcelas que não somam o total |
| 3 | Reexpor campos perdidos no form de lead (origem/valor) | Alto | Baixo | Relatórios agregam por origem/valor, mas o form não deixa preencher |
| 4 | Confirmação antes de excluir (eventos/clientes/empresas) | Alto | Baixo | Delete é irreversível e sem backup (plano free) |
| 5 | Trigger de parcelas → totais do evento no banco | Alto | Médio | Marcar parcela paga via API direta não recalcula recebido/restante |
| 6 | `idempotência` no fechamento de lead (evita evento duplicado) | Alto | Baixo | Dois cliques no pop-up criam dois eventos e dois clientes |
| 7 | Índices compostos para as telas mais quentes | Médio | Baixo | Financeiro/Kanban filtram por (empresa+data/status) sem índice ideal |
| 8 | Máscara e normalização de telefone (E.164) | Alto | Baixo | Sustenta o WhatsApp deep link e deduplica clientes |
| 9 | Estado de carregamento por rota (loading.tsx) | Médio | Baixo | Navegação entre telas fica "travada" sem feedback |
| 10 | Number input com vírgula decimal (pt-BR) | Médio | Baixo | `<input type=number>` rejeita "1.500,00"; digitação de valor falha no mobile |

---

## 📱 Experiência de uso & Mobile

### 1. Number input que aceita vírgula decimal brasileira
**Impacto: médio · Esforço: baixo**
Os campos de dinheiro usam `<Input type="number">` (em `event-form.tsx`,
`payment-plan-editor.tsx`, valor estimado do lead). O HTML `type=number` em
locale pt-BR **rejeita vírgula** e formato "1.500,00" — o usuário digita o valor
e ele some, ou vira `1.5`. Já existe `toNumberOrNull` que entende vírgula no
servidor, mas o input não. Trocar por um campo de texto com `inputMode="decimal"`
+ máscara de moeda no `onChange`, exibindo "R$ 1.500,00" e enviando o número
limpo. É um atrito diário direto na receita.

### 2. Estado de carregamento (loading.tsx) por rota
**Impacto: médio · Esforço: baixo**
Só existe um `app/(app)/loading.tsx` global e um `loading` genérico; trocar de
Dashboard para Financeiro (que agrega o ano inteiro) deixa a tela parada sem
skeleton. Adicionar `loading.tsx` com skeletons específicos nas rotas pesadas
(financeiro, relatórios, eventos) usando o componente `Skeleton` que já existe.
Percepção de velocidade sem mudar uma query.

### 3. Indicador de empresa ativa no título da aba do navegador
**Impacto: baixo · Esforço: baixo**
Com várias empresas e abas abertas, todas mostram "Dashboard — Pipefine". Incluir
a empresa em foco no `<title>` (ex.: "Dashboard · Sofistic — Pipefine") via
`generateMetadata` lendo o contexto da empresa. Ajuda quem trabalha com 2-3 abas.

### 4. Botão "Copiar" nos dados de contato (telefone, e-mail, Instagram)
**Impacto: médio · Esforço: baixo**
No detalhe do lead/cliente o contato é texto puro; copiar no celular exige
seleção precisa. Um ícone "copiar" com `navigator.clipboard` e toast "Copiado!"
ao lado de cada dado. Complementa o WhatsApp/tel do `melhorias.md` para quando o
canal é outro (e-mail, Instagram).

### 5. Formatar telefone na exibição (visual brasileiro)
**Impacto: baixo · Esforço: baixo**
O telefone é exibido exatamente como digitado — "11999998888", "(11) 9 9999..."
e variações convivem. Uma função `formatPhone()` que exibe `(11) 99999-8888`
padroniza a leitura em todas as telas, independente de como foi salvo.

### 6. Avatar/iniciais coloridas por cliente nas listas
**Impacto: baixo · Esforço: baixo**
As listas de leads/clientes/eventos são blocos de texto difíceis de escanear. Um
círculo com as iniciais (cor derivada do nome via hash) dá âncora visual e
"humaniza" as linhas. O componente `Avatar` já está instalado; falta só usá-lo
com fallback de iniciais.

### 7. Atalhos de teclado nas ações frequentes
**Impacto: baixo · Esforço: baixo**
Para o uso de desktop, atalhos como `N` (novo lead na tela de leads), `E` (novo
evento) e `/` (focar busca) aceleram quem usa muito. Implementação trivial com um
listener de `keydown` no client, respeitando foco em inputs.

### 8. Tela "puxar para atualizar" desativada e refresh manual claro
**Impacto: baixo · Esforço: baixo**
Como tudo é `force-dynamic`, o dado certo aparece ao navegar — mas o usuário não
tem um botão óbvio de "atualizar agora" sem trocar de tela. Um ícone de refresh
no topbar chamando `router.refresh()` dá controle explícito (útil quando duas
pessoas mexem ao mesmo tempo).

### 9. Mensagem de lista vazia diferente de "sem filtro" vs. "filtrou e não achou"
**Impacto: baixo · Esforço: baixo**
Em leads/eventos, quando um filtro não retorna nada, aparece o mesmo
`EmptyState` de "cadastre o primeiro" — confunde (o usuário acha que perdeu os
dados). Detectar se há filtros ativos e mostrar "Nenhum resultado para esses
filtros · Limpar filtros".

### 10. Realce de itens vencidos/urgentes com cor de fundo, não só texto
**Impacto: baixo · Esforço: baixo**
Follow-ups atrasados e parcelas vencidas hoje só mudam a **cor do texto**. Uma
borda/realce de fundo sutil (vermelho 5%) na linha inteira chama mais atenção no
relance — especialmente no celular sob luz forte.

### 11. Persistir a empresa em foco e a aba (Kanban/Lista) entre sessões
**Impacto: médio · Esforço: baixo**
A escolha "Lista vs. Kanban" vai na URL (`?view=`), mas não é lembrada ao voltar
depois. Guardar a última preferência (cookie já usado para empresa, ou
localStorage) e restaurá-la evita reconfigurar a tela toda vez.

### 12. Scroll do Kanban com sombra/indicador "há mais colunas"
**Impacto: baixo · Esforço: baixo**
Com 8 colunas, o usuário pode não perceber que há mais à direita (Perdido /
Potencial). Uma sombra de borda (mask gradient) nas extremidades roláveis sinaliza
conteúdo cortado — padrão consagrado e puramente CSS.

### 13. Foco automático no primeiro campo ao abrir formulários/diálogos
**Impacto: baixo · Esforço: baixo**
Ao abrir "Novo lead" ou diálogos, o cursor não vai para o primeiro campo
(exceto onde há `autoFocus` pontual). `autoFocus` consistente reduz um clique em
toda criação — ganho pequeno repetido centenas de vezes.

### 14. Breadcrumbs nas páginas de detalhe e edição
**Impacto: baixo · Esforço: baixo**
Em `/eventos/[id]/editar` não há trilha de navegação; o "voltar" depende do
histórico do navegador. Breadcrumb "Eventos › Cliente › Editar" dá orientação e
um caminho de volta confiável.

### 15. Skeleton dos gráficos (evitar "pulo" de layout)
**Impacto: baixo · Esforço: baixo**
Os gráficos do Financeiro/Relatórios (Recharts) montam só no cliente; a área
fica vazia e depois "pula". Reservar a altura com um skeleton do tamanho do
gráfico elimina o layout shift.

---

## 💼 Funcionalidades de negócio

### 16. Reexpor no formulário de lead os campos que viraram "hidden"
**Impacto: alto · Esforço: baixo**
`lead-form.tsx` mantém **instagram, origem do lead, responsável, valor estimado e
observações como inputs ocultos** — ou seja, não há como preenchê-los pela
interface ao criar/editar um lead. Mas os Relatórios agregam **leads por origem**
e o dashboard usa **valor estimado**: hoje esses gráficos ficam quase vazios
porque a entrada de dados foi removida. Reabrir esses campos (ao menos origem e
valor estimado) realimenta toda a análise que já existe. É corrigir uma regressão
de produto, não criar feature nova.

### 17. Atribuição de responsável (dono do lead/evento) usável
**Impacto: alto · Esforço: médio**
`responsavel_id` existe em leads e eventos e há índice para ele, mas o campo está
oculto no form de lead e não há filtro "Meus leads". Com 4 pessoas, saber de quem
é cada lead é essencial. Expor o seletor de responsável, um filtro "Responsável =
eu" e uma coluna/― no Kanban. Destrava accountability sem tabela nova.

### 18. Funil visual de conversão (quantos leads em cada etapa)
**Impacto: alto · Esforço: médio**
Os Relatórios mostram total/fechados/perdidos, mas não **onde os leads travam**.
Um gráfico de funil (novo → contato → orçamento → negociação → fechado) revela o
gargalo (ex.: muitos orçamentos enviados sem retorno). Os dados já estão em
`leads.status`; falta agrupar e desenhar (Recharts já instalado).

### 19. Tempo médio em cada etapa e tempo até fechar
**Impacto: médio · Esforço: médio**
Não há noção de **velocidade** do funil. Com `created_at`,
`data_orcamento_enviado` e a data de fechamento dá para calcular "dias até
fechar" e "dias parado em cada status". Indicador "leads parados há +14 dias"
no dashboard vira lista de ação. Pode começar simples (created_at → fechado).

### 20. Lembrete automático de parcela a vencer (lista "cobrar esta semana")
**Impacto: alto · Esforço: baixo**
As parcelas têm vencimento, mas nada destaca **o que cobrar nos próximos 7 dias**
(o `melhorias.md` cobre vencidas/30 dias; aqui é o recorte semanal acionável). Uma
seção "Cobrar esta semana" no dashboard, com botão WhatsApp pré-preenchido
("Olá! Passando para lembrar da parcela de R$ X com vencimento em DD/MM"). Liga o
cadastro de parcelas à rotina de cobrança.

### 21. Sinalizar evento sem nenhuma parcela cadastrada
**Impacto: médio · Esforço: baixo**
Um evento pode ser criado/fechado sem plano de pagamento (parcelas vazias) — e aí
ele some das telas de recebimento, escondendo dinheiro a receber. Um aviso
"Evento sem parcelas" na página do evento e um filtro no Financeiro evitam o
"buraco" de eventos que ninguém está cobrando.

### 22. Status do evento mais rico (a confirmar / em produção / concluído)
**Impacto: médio · Esforço: baixo**
O enum `event_status` já tem `em_producao` e `finalizado`, mas o fluxo não os usa
de forma guiada — eventos nascem "confirmado" e ficam assim. Um mini-fluxo
(confirmado → em produção na semana → finalizado após a data) com botões rápidos
dá visão operacional do que está "rolando agora". Zero schema novo.

### 23. Marcar evento como finalizado automaticamente após a data
**Impacto: baixo · Esforço: baixo**
Eventos passados continuam "confirmado" para sempre. Uma rotina diária (GitHub
Actions chamando um endpoint, ou no carregamento do Financeiro) que marca como
`finalizado` eventos com `data_evento < hoje` ainda confirmados mantém os
relatórios de "realizados vs. agendados" corretos.

### 24. Campo de desconto e valor cheio (preço de tabela vs. fechado)
**Impacto: médio · Esforço: médio**
Só existe `valor_total` (o fechado). Registrar o **valor de tabela** e o
**desconto concedido** permite medir quanto se "dá de desconto" por mês/empresa —
informação de margem que hoje se perde. Duas colunas novas e dois campos no form.

### 25. Histórico de eventos do cliente com "valor total já gasto" em destaque
**Impacto: médio · Esforço: baixo**
`getClientDetail` já calcula `totalFaturado` e `ultimoAtendimento`, mas a página do
cliente poderia destacar "Cliente desde", "N eventos", "Ticket médio dele" e
"Melhor cliente?" — transformando o Banco de Clientes em ferramenta de
relacionamento (saber quem é VIP antes de atender). Dados já existem; é
apresentação.

### 26. Tags/segmentos de cliente (VIP, corporativo, indicador)
**Impacto: médio · Esforço: médio**
Não há como classificar clientes além do nome. Uma tabela `client_tags` (ou um
array de texto) com etiquetas coloridas (VIP, Corporativo, Indica muito) permite
filtrar e priorizar. Útil para campanhas de recompra direcionadas.

### 27. Campo "como nos conheceu" detalhado por indicação (quem indicou)
**Impacto: baixo · Esforço: baixo**
`origem_lead` tem "indicação", mas não **quem** indicou. Um campo livre
"indicado por" (texto ou vínculo a cliente) permite agradecer/recompensar quem
traz clientes — alavanca de crescimento típica de buffet.

### 28. Anotações rápidas datadas no evento (diário de produção)
**Impacto: médio · Esforço: baixo**
Leads têm `lead_interactions` (histórico), mas eventos só têm dois campos de
texto livre. Reaproveitar o mesmo padrão de interações para eventos (notas
datadas: "cardápio fechado", "cliente pediu mudança") cria um diário de produção
auditável. Tabela espelhada de `lead_interactions`.

### 29. Diferenciar "Sem resposta" de "Aguardando retorno" com prazo
**Impacto: baixo · Esforço: baixo**
Ambos os status existem e caem na mesma coluna do Kanban (Acompanhamento), mas a
regra de quando um vira o outro é manual. Definir "X dias sem interação → sugere
mover para Sem resposta" (aviso, não automático) ajuda a higienizar o funil.

### 30. Modelos de mensagem reutilizáveis (configuráveis)
**Impacto: médio · Esforço: médio**
Os botões de WhatsApp (do `melhorias.md`) precisam de textos; em vez de fixá-los
no código, uma tela em Configurações com **modelos editáveis** (saudação,
cobrança, confirmação) deixa a família ajustar o tom sem mexer no sistema. Tabela
`message_templates` simples.

### 31. Calculadora de orçamento por pessoa (preço × convidados)
**Impacto: médio · Esforço: baixo**
`quantidade_pessoas` é coletada mas não usada em cálculo. Um campo "preço por
pessoa" que multiplica pelo número de convidados e sugere o `valor_estimado`
acelera o orçamento de buffet (o cálculo mais comum do negócio).

### 32. Relatório de sazonalidade (meses/dias da semana mais fortes)
**Impacto: médio · Esforço: médio**
Os dados de eventos por mês existem, mas não há visão de **dia da semana** nem
comparação ano a ano. Saber que "sábados de maio lotam" orienta preço e equipe.
Agregação por `EXTRACT(dow)` e por mês comparando anos.

### 33. Previsão de caixa dos próximos 90 dias (parcelas a vencer)
**Impacto: alto · Esforço: médio**
O Financeiro olha o passado/mês; falta **projeção**: somando parcelas pendentes
por mês futuro, mostra-se o caixa esperado de jun/jul/ago. Para um negócio de
contratos antecipados, é planejamento financeiro real — e os dados de parcelas já
existem.

### 34. Comparativo entre empresas lado a lado
**Impacto: baixo · Esforço: baixo**
`porEmpresa` já é calculado, mas só como lista. Um pequeno painel comparando as
empresas (faturamento, ticket, conversão) na mesma tela ajuda a decidir onde
investir esforço. Reusa dados já agregados.

### 35. "Lixeira" / arquivamento em vez de delete definitivo
**Impacto: alto · Esforço: médio**
Hoje excluir lead/evento/cliente é **permanente** e, sem backup no plano free, um
clique errado perde contrato. Soft-delete (`deleted_at`) com filtro padrão
escondendo arquivados e uma tela "Lixeira (30 dias)" dá rede de segurança sem
custo. Combina com o item de confirmação de exclusão (#43).

### 36. Reabrir lead perdido como novo lead (1 clique)
**Impacto: médio · Esforço: baixo**
Quando um cliente perdido volta, hoje recria-se tudo na mão. Um botão "Reabrir"
no lead perdido que cria um lead novo pré-preenchido (zerando motivo de perda)
recupera a oportunidade sem retrabalho. Parente do "duplicar" do `melhorias.md`,
mas específico para perdidos.

### 37. Vincular evento a um lead já existente (sem recriar)
**Impacto: baixo · Esforço: baixo**
`createEvent` não amarra a um lead de origem (só `closeLeadAsEvent` faz). Permitir
escolher um lead ao criar evento manualmente mantém a rastreabilidade
lead→evento→cliente íntegra para relatórios de conversão.

### 38. Observação de "próximo passo" explícito por lead
**Impacto: baixo · Esforço: baixo**
O follow-up tem data, mas o "o que fazer" fica no título. Um campo curto "próxima
ação" (ligar, enviar contrato, cobrar) exibido no card do Kanban transforma o
funil em lista de tarefas clara.

### 39. Indicador de evento "neste fim de semana" no dashboard
**Impacto: médio · Esforço: baixo**
"Próximos eventos (30 dias)" é amplo demais para a correria da semana. Um card
"Este fim de semana: N eventos" com horários e locais foca a operação no que é
iminente. Filtro de data simples sobre dados já carregados.

### 40. Checklist de documentos/contrato por evento (assinado? pago?)
**Impacto: médio · Esforço: baixo**
Faltam flags simples de governança: contrato assinado, entrada recebida, cardápio
fechado. Três booleanos no evento (ou um pequeno checklist) dão um "status de
prontidão" antes do dia — evita chegar no evento sem contrato assinado.

---

## 🔒 Segurança & Controle de acesso

### 41. 🔴 Validar quem pode alterar papéis e dados sensíveis no servidor
**Impacto: alto · Esforço: baixo**
Complementando o item de escalada de privilégio do `melhorias.md`: a action
`updateProfile` em `settings.ts` aceita `role` de qualquer chamador. Além de
checar admin, ela deveria **impedir o usuário de alterar o próprio papel** e
**recusar papéis fora do enum** (hoje faz `as UserRole` sem validar). Defesa em
profundidade junto da RLS.

### 42. Esconder ações destrutivas de quem não é admin na UI
**Impacto: médio · Esforço: baixo**
Mesmo antes da RLS por papel, botões de **excluir** (empresa, evento, cliente em
massa) aparecem para todos. Ocultá-los/desabilitá-los conforme
`getCurrentProfile().role` reduz erro humano imediatamente, com uma checagem que
já está disponível no servidor.

### 43. Diálogo de confirmação em todas as exclusões
**Impacto: alto · Esforço: baixo**
`deleteEvent`, `deleteClientRecord`, `deleteCompany` e as exclusões em massa
disparam sem "tem certeza?" consistente. Um `AlertDialog` padrão ("Excluir
permanentemente? Esta ação não tem volta") em todos os pontos evita perda
acidental — crítico sem backup no plano free.

### 44. Tornar o `activity_logs` à prova de adulteração
**Impacto: médio · Esforço: baixo**
Quando a auditoria for ativada (no `melhorias.md`), a política atual permite
`delete` no log pelo próprio usuário. Remover a policy de delete/update em
`activity_logs` (append-only) garante que o rastro não seja apagado por quem
errou de propósito.

### 45. Confirmar o e-mail antes de liberar o acesso
**Impacto: médio · Esforço: baixo**
O cadastro cria a conta e o trigger gera o perfil; se a confirmação de e-mail
estiver desativada no Supabase, qualquer e-mail da lista de permitidos entra sem
provar posse. Ativar "confirm email" (gratuito) garante que só o dono do e-mail
acessa.

### 46. Política de senha forte e feedback de força
**Impacto: baixo · Esforço: baixo**
O cadastro exige "mínimo 6 caracteres" (placeholder). Subir o mínimo, bloquear
senhas óbvias e mostrar um medidor de força protege contas que veem dados
financeiros. Validação no client + config do Supabase Auth.

### 47. Sanitizar entradas de busca usadas em `.or(... ilike ...)`
**Impacto: médio · Esforço: baixo**
As buscas montam `nome.ilike.%${s}%,...` removendo só `%` e `,`. Outros
caracteres do PostgREST (parênteses, vírgulas internas, aspas) podem distorcer o
filtro `or`. Centralizar um `escapeIlike()` robusto evita resultados estranhos e
fecha a porta para abuso do parser de filtros.

### 48. Cabeçalhos de segurança (CSP, X-Frame-Options, etc.)
**Impacto: médio · Esforço: baixo**
Não há `headers()` no `next.config`. Adicionar Content-Security-Policy,
`X-Frame-Options: DENY` (anti-clickjacking), `Referrer-Policy` e
`X-Content-Type-Options: nosniff` endurece o app contra ataques comuns — config,
sem custo, no Vercel.

### 49. Não enviar `redirectTo` para domínios externos (reforço)
**Impacto: baixo · Esforço: baixo**
Além do open redirect já citado no `melhorias.md`, validar `redirectTo` também no
**middleware** (que o injeta) garante que nenhuma rota de erro o repasse cru.
Uma allowlist de prefixos internos é a forma mais segura.

### 50. Tela de "sessão expirada" amigável em vez de erro
**Impacto: baixo · Esforço: baixo**
Quando o token expira no meio de uma ação, a action falha com mensagem técnica do
Supabase. Detectar erro de auth e redirecionar para o login com aviso "Sua sessão
expirou, entre novamente" evita confusão e cliques perdidos.

### 51. Registrar logins bem-sucedidos (e de onde)
**Impacto: baixo · Esforço: baixo**
Já existe `login_attempts` para falhas (rate limit). Registrar também os
**sucessos** (e-mail, IP, data) dá um histórico de acesso para a conta admin
notar logins estranhos — base barata de detecção.

### 52. Expirar/limpar tokens de "lembrar empresa" e cookies antigos
**Impacto: baixo · Esforço: baixo**
O cookie de empresa ativa não tem política de expiração nem é limpo ao trocar de
usuário. Definir `maxAge`, `httpOnly` (onde aplicável) e limpar no logout evita
que a empresa de um usuário "vaze" para o próximo no mesmo dispositivo
compartilhado.

---

## 🧮 Integridade de dados & Modelo

### 53. CHECK constraints de dinheiro nas tabelas
**Impacto: alto · Esforço: baixo**
O schema não impede `valor_total < 0`, `valor_entrada > valor_total` nem
`valor_restante` incoerente. Adicionar `check (valor_total >= 0)`,
`check (valor_entrada <= valor_total)` e similares em `events`/
`payment_installments` barra dados impossíveis na origem — o banco vira a última
linha de defesa da contabilidade.

### 54. Garantir no banco que as parcelas somam o total do evento
**Impacto: alto · Esforço: médio**
Nada garante que a soma das `payment_installments` bata com `events.valor_total`.
Uma trigger de validação (ou um job de verificação) que recusa/aponta divergência
evita o clássico "as parcelas somam diferente do contrato". Reaproveita a lógica
de `recalcEventFromInstallments`.

### 55. Trigger no banco para recalcular totais ao mudar parcelas
**Impacto: alto · Esforço: médio**
`recalcEventFromInstallments` só roda quando a ação do app é chamada. Se alguém
marcar `pago = true` via API direta (a chave anon é pública!), os totais do evento
**não atualizam**. Uma trigger `after insert/update/delete` em
`payment_installments` recalculando `valor_entrada/restante/status_pagamento`
torna a regra inquebrável, venha de onde vier.

### 56. `CHECK` de coerência de datas e horários
**Impacto: médio · Esforço: baixo**
Eventos aceitam `horario_fim < horario_inicio` e nada impede `data_evento` no
passado distante por digitação. `check (horario_fim is null or horario_fim >
horario_inicio)` e validação de data no form evitam fichas operacionais
impossíveis para a equipe.

### 57. Unicidade inteligente de cliente (telefone/e-mail normalizado)
**Impacto: médio · Esforço: médio**
`clients` não tem unicidade — o mesmo cliente vira várias linhas (cada lead
fechado pode criar um cliente novo, como em `closeLeadAsEvent`). Índice único
parcial sobre telefone normalizado (ou e-mail) + lógica de "encontrar ou criar"
mantém o Banco de Clientes limpo e os totais por cliente corretos.

### 58. Deduplicar clientes existentes (tela de mesclagem)
**Impacto: médio · Esforço: médio**
Decorrência do item acima: já devem existir duplicados. Uma tela que sugere
prováveis duplicados (mesmo telefone/e-mail) e permite **mesclar** (reapontando
leads/eventos para um único cliente) recupera o histórico fragmentado. Roda uma
vez e fica disponível.

### 59. Normalizar telefone para E.164 ao salvar
**Impacto: alto · Esforço: baixo**
O telefone é salvo como digitado. Guardar também uma forma normalizada
(`55DDNNNNNNNNN`) sustenta o WhatsApp deep link (`wa.me/55...`), a unicidade de
cliente (#57) e buscas confiáveis. Função pura de normalização + coluna derivada.

### 60. `forma_pagamento` (texto livre) vs. `payment_method` (enum) — unificar
**Impacto: baixo · Esforço: baixo**
`events` tem **os dois**: `forma_pagamento` (texto) e `payment_method` (enum). O
texto livre é redundante e gera inconsistência ("Pix", "PIX", "pix"). Migrar o
que importa para o enum e aposentar a coluna de texto simplifica o modelo e os
relatórios.

### 61. Padronizar dinheiro em centavos (inteiro) ou documentar `numeric`
**Impacto: médio · Esforço: alto**
Os valores trafegam como `number | string` e passam por vários `Number(v) || 0`
no JS, sujeitos a arredondamento de ponto flutuante em somas grandes. Padronizar
em centavos inteiros (ou ao menos centralizar a leitura de `numeric` com
arredondamento consistente) elimina divergências de centavos nos totais. Já há
`round2`, mas não é aplicado de ponta a ponta.

### 62. Snapshot do nome do cliente vs. vínculo (evitar nomes dessincronizados)
**Impacto: baixo · Esforço: baixo**
`leads.nome_cliente` e `events.nome_cliente` são cópias de texto; renomear o
cliente no Banco de Clientes **não** atualiza eventos/leads antigos. Definir a
regra (snapshot histórico **ou** sempre exibir o nome do cliente vinculado quando
houver `client_id`) e aplicá-la na exibição evita o "mesmo cliente, dois nomes".

### 63. Constraint para `motivo_perda` obrigatório quando `status = perdido`
**Impacto: baixo · Esforço: baixo**
O Kanban exige motivo ao arrastar para Perdido, mas a edição pelo form e a API
direta não. Um `check (status <> 'perdido' or motivo_perda is not null)` garante
que todo perdido tenha causa — alimentando o relatório de motivos de perda de
forma confiável.

### 64. Validar faixa de `quantidade_pessoas` e `numero` de parcela
**Impacto: baixo · Esforço: baixo**
Aceita-se 0 ou números absurdos de convidados e `numero` de parcela arbitrário.
`check (quantidade_pessoas is null or quantidade_pessoas > 0)` e validação do
sequencial de parcelas evitam dados que quebram cálculos de "preço por pessoa"
(#31).

### 65. Coluna gerada para "mês de competência" do evento
**Impacto: médio · Esforço: médio**
O Financeiro agrupa por mês fatiando datas no JS. Uma coluna gerada
(`date_trunc('month', data_evento)`) indexada permite agregar **no banco** com
`GROUP BY`, alinhando com a paginação do `melhorias.md` e acelerando os
relatórios. Prepara o terreno para somas corretas em escala.

### 66. `ON DELETE` revisado para preservar histórico financeiro
**Impacto: médio · Esforço: baixo**
`events.lead_id` usa `set null` (ok), mas convém revisar todas as FKs para que
excluir um lead/cliente **nunca** apague receita já registrada. Documentar e
testar cada `on delete` evita perda silenciosa de dados financeiros por uma
exclusão "inofensiva".

---

## ⚙️ Qualidade técnica & Performance

### 67. 🔴 Tratar datas "date-only" sem cair no fuso horário
**Impacto: alto · Esforço: baixo**
Vários pontos fazem `new Date(ev.data_evento).getMonth()` /
`parseISO(d).getMonth()` (em `finance.ts`, `reports.ts`, `installments.ts`). Para
uma string `"2026-01-31"`, dependendo do fuso do servidor (Vercel roda em UTC), a
data pode "voltar" um dia e jogar o evento para **dezembro** — faturamento no mês
errado, sem erro visível. Padronizar a leitura de datas date-only (fatiar a
string `yyyy-MM` ou usar `parseISO` com tratamento de timezone) é correção de
**corretude financeira**, não de estilo.

### 68. Índices compostos para os filtros reais das telas
**Impacto: médio · Esforço: baixo**
Há índices de coluna única, mas as telas filtram por **combinações**: eventos por
`(company_id, data_evento)`, leads por `(company_id, status)`, parcelas por
`(pago, data_vencimento)`. Índices compostos cobrindo esses pares deixam
Financeiro/Kanban/Recebimentos rápidos quando os dados crescerem.

### 69. Memorizar o cliente Supabase / contexto por requisição
**Impacto: baixo · Esforço: baixo**
Quase toda query chama `createClient()` de novo e busca o perfil/empresa
repetidamente numa mesma requisição. Envolver `getCurrentProfile` e o contexto de
empresa em `cache()` do React (como o `melhorias.md` sugere para empresas) corta
roundtrips em todas as páginas autenticadas.

### 70. Selecionar só as colunas necessárias (evitar `select('*')`)
**Impacto: médio · Esforço: baixo**
Muitas queries usam `select('*')` (leads, eventos, clientes com embeds). Em
listas grandes isso infla o payload e a serialização. Selecionar campos
explícitos por tela reduz tráfego e prepara o caminho para tipos gerados
estritos.

### 71. Centralizar o "feature flag" das migrações em um único probe
**Impacto: baixo · Esforço: baixo**
`paymentFeatureAvailable` e `relinkFeatureAvailable` fazem um SELECT extra **por
chamada** para descobrir se a migração existe. Cachear o resultado por
requisição/processo (ou, melhor, rodar as migrações e remover os probes como o
`melhorias.md` sugere) elimina dezenas de roundtrips. Aqui o foco é cachear
enquanto os probes existirem.

### 72. Suspense/streaming nos blocos pesados do dashboard
**Impacto: médio · Esforço: médio**
`getDashboardData` dispara ~10 queries em paralelo e a página só renderiza quando
**todas** voltam. Quebrar em componentes com `<Suspense>` (cards primeiro,
listas depois) faz a tela aparecer progressivamente. Next App Router suporta
nativamente.

### 73. Constantes mágicas centralizadas (janelas, limites, prazos)
**Impacto: baixo · Esforço: baixo**
Números como "+2 dias de follow-up", "5 dias antes do evento", "30 dias de
próximos eventos", "180ms de delay do touch" estão espalhados. Um
`lib/constants.ts` único facilita ajustar regra de negócio sem caçar no código.

### 74. Padronizar revalidação (mapa de rotas por entidade)
**Impacto: baixo · Esforço: baixo**
Cada action lista manualmente os `revalidatePath` — fácil esquecer um (ex.: mexer
em evento sem revalidar `/recebimentos`). Um helper `revalidateForEntity('event')`
com o conjunto correto evita telas exibindo dado velho por revalidação faltante.

### 75. Tipar os `Database` gerados e remover `as unknown as`
**Impacto: médio · Esforço: baixo**
Quase toda query faz `as unknown as LeadWithRelations`, anulando o type-check do
retorno (o `melhorias.md` cita gerar tipos; aqui o foco é **consumir** esses
tipos eliminando os casts duplos). Com isso, mudar uma coluna quebra o build, não
a produção.

### 76. Tratar erros de query que hoje são silenciosamente ignorados
**Impacto: médio · Esforço: baixo**
Várias queries fazem `const { data } = await ...` **sem checar `error`**
(`getClients`, `getLeadById`, partes do dashboard). Um erro de banco vira "lista
vazia" silenciosa — o usuário acha que não há dados. Checar e propagar o erro (com
o error boundary do `melhorias.md`) evita o pior tipo de bug: o invisível.

### 77. Extrair a lógica de "agrupar leads em colunas" para teste
**Impacto: baixo · Esforço: baixo**
`groupLeads`/`STATUS_TO_COLUMN` definem o coração do Kanban e são funções puras —
candidatas ideais a teste unitário (junto com a sugestão de Vitest do
`melhorias.md`, mas em outro módulo). Protege contra status novo cair na coluna
errada.

### 78. ESLint mais rígido + Prettier no CI
**Impacto: baixo · Esforço: baixo**
Há `eslint` mas sem regras de import order, exhaustive-deps reforçado ou
Prettier no pipeline. Um workflow de CI rodando `lint`, `tsc --noEmit` e
`prettier --check` a cada push pega regressões antes do deploy (Vercel Hobby +
GitHub Actions, grátis).

### 79. `next/image` para a logo e ativos
**Impacto: baixo · Esforço: baixo**
A logo/hero do login usa `<img>`/SVG inline sem otimização. `next/image` gera
tamanhos responsivos e lazy-load — ganho de performance trivial e gratuito no
Vercel.

### 80. Padronizar `errMsg` único (versões divergentes em 6 arquivos)
**Impacto: baixo · Esforço: baixo**
`errMsg` aparece em `events.ts`, `leads.ts`, `followups.ts`, `clients.ts`,
`settings.ts` — algumas mostram o erro real do banco, outras escondem. (O
`melhorias.md` cita unificar Server Actions; aqui o recorte é só o `errMsg`,
fácil e isolado.) Um único helper com mapeamento de códigos comuns (23505, 23503)
dá mensagens consistentes em PT-BR.

### 81. Remover `console`/dead code e padronizar logging
**Impacto: baixo · Esforço: baixo**
Comentários "pode ser ignorado", catches vazios e logs ad-hoc dificultam
diagnóstico. Um `lib/logger.ts` simples (no-op em produção, verboso em dev) e a
limpeza de catches silenciosos melhoram a observabilidade junto com o Sentry do
`melhorias.md`.

### 82. Testes de fuso/borda nas funções de data
**Impacto: médio · Esforço: baixo**
`lib/date.ts` é puro e crítico (mês de competência, "vencido", "hoje"). Testes
cobrindo viradas de mês/ano e fuso (relacionado ao #67) blindam o cálculo que
sustenta Financeiro e follow-ups.

### 83. Garantir uma única instância do client no browser
**Impacto: baixo · Esforço: baixo**
`lib/supabase/client.ts` é chamado em componentes client; criar o client a cada
render pode multiplicar conexões/listeners. Memorizar (singleton por aba) evita
vazamento sutil de recursos no navegador.

### 84. Tipar `ActionResult` com união discriminada estrita
**Impacto: baixo · Esforço: baixo**
Os componentes fazem `"data" in res && res.data` para acessar o payload. Uma união
discriminada (`{ ok: true, data } | { ok: false, error }`) deixa o TypeScript
estreitar automaticamente e remove checagens manuais frágeis.

### 85. Evitar recomputar o board inteiro a cada re-sync no Kanban
**Impacto: baixo · Esforço: médio**
`kanban-board.tsx` reconstrói `groupLeads(leads)` sempre que a chave muda,
descartando estado otimista. Reconciliar incrementalmente (ou memoizar por id)
reduz "saltos" visuais e re-render com muitos cards. Combina com a quebra do
componente sugerida no `melhorias.md`.

---

## 🛡️ Confiabilidade & Operação

### 86. Seed/restore de ambiente de teste a partir do schema
**Impacto: médio · Esforço: baixo**
Há `schema.sql` e seeds de empresa, mas nenhum dado de exemplo para testar telas
cheias. Um script de seed (leads/eventos/parcelas fictícios) permite validar
Financeiro/Relatórios sem digitar dados — e dá um ambiente de demonstração.

### 87. Healthcheck e página de status simples
**Impacto: baixo · Esforço: baixo**
Não há endpoint de saúde. Uma rota `/api/health` que pinga o Supabase permite
monitorar (UptimeRobot grátis) e saber rapidamente se "o app caiu" é o banco ou o
Vercel.

### 88. Tratar indisponibilidade do Supabase com retry/backoff
**Impacto: médio · Esforço: médio**
Qualquer instabilidade do Supabase derruba a página. Um wrapper de query com
retry leve (1-2 tentativas com backoff) para erros transitórios de rede aumenta a
resiliência percebida sem mascarar erros reais.

### 89. Limpeza programada de `login_attempts` antigos
**Impacto: baixo · Esforço: baixo**
A tabela de tentativas cresce indefinidamente. Um job (GitHub Actions cron, como o
backup do `melhorias.md`) apagando registros com +30 dias mantém a tabela enxuta e
o rate limit rápido.

### 90. Documentar e versionar a ordem de aplicação das migrações
**Impacto: baixo · Esforço: baixo**
As migrações 002–005 são aplicadas à mão e o código tem fallbacks para "ainda não
aplicada". Um `MIGRATIONS.md` com ordem, propósito e status (aplicada em prod?)
evita rodar fora de ordem e orienta quando remover os fallbacks.

### 91. Variáveis de ambiente validadas no boot
**Impacto: baixo · Esforço: baixo**
O código usa `process.env.NEXT_PUBLIC_SUPABASE_URL!` com `!` — se faltar, o erro é
obscuro em runtime. Validar as envs no início (um `lib/env.ts` com checagem)
falha cedo e claro no deploy, em vez de quebrar uma página aleatória.

### 92. Política de retenção/expurgo de dados (LGPD)
**Impacto: médio · Esforço: médio**
Dados pessoais de clientes (telefone, e-mail) ficam para sempre. Uma rotina e uma
ação "esquecer cliente" (anonimizar) preparam o sistema para pedidos de remoção,
relevante mesmo num negócio pequeno. Combina com soft-delete (#35).

### 93. Exportar/baixar todos os dados de um cliente (portabilidade)
**Impacto: baixo · Esforço: baixo**
Complemento de governança: um botão que gera o JSON/CSV com tudo de um cliente
(leads, eventos, parcelas) atende portabilidade e facilita "passar o histórico"
quando preciso. Reaproveita o CSV do `melhorias.md`.

### 94. Aviso de "dados não salvos" ao sair de formulários
**Impacto: baixo · Esforço: baixo**
Sair de um form de lead/evento preenchido pela metade perde tudo sem aviso. Um
guard de navegação (`beforeunload` + intercept de rota) "Descartar alterações?"
evita retrabalho — atrito comum no mobile onde se troca de tela sem querer.

---

## 🎨 Interface, design system & acessibilidade

### 95. Tokens de status do badge consistentes (texto colorido vs. fundo)
**Impacto: baixo · Esforço: baixo**
O tom `warning` do `Badge` colore o texto escuro, enquanto `success`/`destructive`
colorem o texto com a cor viva — inconsistência que já exigiu gambiarra
(`text-warning` manual na coluna Potencial). Alinhar os tons do
`badge.tsx`/`globals.css` para todos seguirem o mesmo padrão remove o caso
especial e padroniza o visual.

### 96. Estados de foco visíveis (acessibilidade de teclado)
**Impacto: médio · Esforço: baixo**
Vários elementos clicáveis (cards, linhas, ícones) não têm `focus-visible` claro.
Anéis de foco consistentes (Tailwind `focus-visible:ring`) tornam o app navegável
por teclado — base de acessibilidade que também ajuda o item de DnD por teclado
do `melhorias.md`.

### 97. Contraste de cores AA nos textos suaves
**Impacto: baixo · Esforço: baixo**
`text-muted-foreground/70` e similares podem ficar abaixo do contraste mínimo,
sobretudo no mobile sob sol. Revisar os tokens para garantir AA melhora
legibilidade para todos.

### 98. `aria-label` e roles nas ações só com ícone
**Impacto: baixo · Esforço: baixo**
Botões de ícone (copiar, excluir, mover) sem rótulo acessível são opacos para
leitor de tela. Adicionar `aria-label` em PT-BR padroniza acessibilidade junto
com os anúncios do Kanban citados no `melhorias.md`.

### 99. Tipografia responsiva e tamanhos de toque ≥44px
**Impacto: baixo · Esforço: baixo**
Alguns textos e alvos de toque são pequenos no mobile (relacionado, mas distinto
do safe-area do `melhorias.md`). Escala tipográfica responsiva e área de toque
mínima reduzem erro de toque em todas as listas.

### 100. Modo de densidade (compacto/confortável) nas tabelas
**Impacto: baixo · Esforço: baixo**
Telas como Recebimentos e Eventos têm muitas linhas; um toggle "compacto" (menos
padding) cabe mais dados na tela para quem prefere visão densa no desktop. Pura
classe condicional.

### 101. Padronizar formatação de moeda/percentual em um só lugar
**Impacto: baixo · Esforço: baixo**
`formatCurrency`/`formatNumber` existem, mas percentuais (taxa de conversão,
margem futura) são formatados ad-hoc. Um `formatPercent` central evita "33.3%" vs.
"33,3 %" inconsistentes entre Relatórios e dashboard.

### 102. Ícones e cores semânticas consistentes por entidade
**Impacto: baixo · Esforço: baixo**
Lead, Evento, Cliente, Parcela aparecem com ícones variados conforme a tela.
Fixar um ícone/cor por entidade (no `nav-config` e reutilizado) cria uma
linguagem visual que acelera o reconhecimento.

### 103. Empty states com ação primária clara em todas as telas
**Impacto: baixo · Esforço: baixo**
Alguns `EmptyState` têm botão (criar), outros não (ex.: pagamentos pendentes).
Garantir uma ação primária ou um próximo passo em cada vazio orienta o usuário em
vez de deixá-lo numa tela "morta".

### 104. Tooltip explicativo nos indicadores do dashboard
**Impacto: baixo · Esforço: baixo**
"Leads Quentes", "Falta assinar" são claros para quem fez o sistema, menos para
um familiar novo. Tooltips curtos ("Leads ativos no funil, exceto fechados e
perdidos") reduzem dúvida sem poluir a tela.

---

## 🔔 Comunicação & Engajamento (grátis)

### 105. Resumo diário por e-mail (follow-ups + cobranças do dia)
**Impacto: alto · Esforço: médio**
Sem push, a família depende de abrir o app. Um e-mail matinal (GitHub Actions cron
+ SMTP gratuito do próprio provedor, ou função que usa o e-mail transacional do
Supabase) com "hoje: 3 follow-ups, 2 parcelas a cobrar, 1 evento" traz a pessoa
para a ação certa. Zero serviço pago.

### 106. Aviso de aniversário do evento/cliente para recompra
**Impacto: médio · Esforço: baixo**
Complementa o radar de recompra do `melhorias.md` no canal: gerar o lembrete e o
texto de WhatsApp prontos no dia certo (1 ano do evento, aniversário) transforma a
oportunidade em mensagem de 1 clique. Reusa os deep links.

### 107. Confirmação de evento D-3 com o cliente (mensagem pronta)
**Impacto: médio · Esforço: baixo**
Buffet sofre com no-show/mudança de última hora. Um lembrete interno "confirmar
evento de sábado" 3 dias antes, com mensagem de confirmação pré-preenchida,
reduz surpresas. Lista derivada de `data_evento` + template.

### 108. "Pedir indicação" pós-evento (NPS simples)
**Impacto: baixo · Esforço: baixo**
Após um evento finalizado, um lembrete para pedir avaliação/indicação (mensagem
pronta com link) aproveita o momento de satisfação. Cresce o boca a boca, principal
canal do negócio. Só gatilho + template.

### 109. Compartilhar resumo do evento/proposta por link
**Impacto: médio · Esforço: médio**
A proposta imprimível do `melhorias.md` poderia ter um **link público somente
leitura** (token aleatório) para enviar no WhatsApp sem PDF anexo. Página pública
mínima, sem login, escopada por token. Grátis no Vercel.

### 110. Caixa de "novidades do sistema" (changelog interno)
**Impacto: baixo · Esforço: baixo**
Conforme o app evolui, a família não sabe o que mudou. Um pequeno "O que há de
novo" (markdown estático versionado) avisa sobre recursos novos sem treinamento
formal.

---

## 🧭 Produtividade & Workflows

### 111. Ações em massa no Kanban/leads (mudar status, atribuir)
**Impacto: médio · Esforço: médio**
Já há seleção em massa para **excluir** (perdidos, eventos, clientes), mas não
para **mover/atribuir** vários leads. Selecionar e "mover para Acompanhamento" ou
"atribuir a fulano" acelera a higienização semanal do funil. Reusa o
`bulk-delete-bar` como base.

### 112. Filtros salvos / visões favoritas
**Impacto: baixo · Esforço: baixo**
Combinações úteis ("meus leads em negociação", "eventos não pagos deste mês")
são remontadas toda vez. Salvar filtros nomeados (querystring guardada) dá acesso
de 1 clique às visões do dia a dia.

### 113. Ordenação por colunas nas tabelas
**Impacto: baixo · Esforço: baixo**
As listas vêm sempre na ordem da query (updated_at/nome). Permitir clicar no
cabeçalho para ordenar por valor, data ou status ajuda a achar "o maior evento do
mês" ou "a parcela mais atrasada" sem exportar.

### 114. Paginação e contagem total nas listas longas
**Impacto: médio · Esforço: médio**
Além do bug de 1.000 linhas citado no `melhorias.md`, falta UX de paginação
(página atual, total, "carregar mais"). Implementar paginação real com contagem
melhora navegação e performance percebida nas telas que vão crescer (eventos,
recebimentos).

### 115. Visão "linha do tempo" do lead (interações + status + follow-ups)
**Impacto: médio · Esforço: médio**
A página do lead tem dados espalhados; uma timeline unificada (criado → orçamento
enviado → follow-up → mudou de status → fechado) conta a história do
relacionamento de relance. Junta `lead_interactions`, mudanças de status (com a
auditoria do `melhorias.md`) e follow-ups.

### 116. Duplicar plano de pagamento entre eventos parecidos
**Impacto: baixo · Esforço: baixo**
Eventos recorrentes do mesmo cliente costumam repetir a forma de pagamento.
Reaplicar um plano (50/50, parcelado N×) a partir de um evento anterior poupa
recriar parcelas na mão. Reusa `generateInstallments`.

### 117. Busca por período rápido (chips: hoje, semana, mês, ano)
**Impacto: baixo · Esforço: baixo**
Os filtros de data exigem escolher datas manualmente. Chips de atalho ("este mês",
"próximos 30 dias", "este ano") cobrem 90% dos casos com um toque, especialmente
no mobile.

### 118. Comparar mês atual vs. anterior com seta de tendência
**Impacto: baixo · Esforço: baixo**
`faturamentoMes` e `faturamentoMesAnterior` já são calculados, mas o dashboard não
mostra a **variação** (▲ +12% vs. mês passado). Exibir a seta/percentual dá
leitura instantânea de "estamos melhor ou pior". Dados prontos, só apresentação.

### 119. Atalho "criar evento a partir de cliente existente"
**Impacto: baixo · Esforço: baixo**
Na página do cliente, um botão "Novo evento para este cliente" pré-preenche
empresa/contato e já vincula `client_id` — caminho natural para recompra que hoje
passa por recriar lead. Complementa o radar de recompra.

### 120. Painel "minha semana" consolidado (foco pessoal)
**Impacto: médio · Esforço: médio**
Cada tela mostra um pedaço; falta uma visão pessoal "minha semana": meus
follow-ups, meus eventos, minhas cobranças, ordenados por dia. Para um time de 4,
abrir o app e ver **o que é meu hoje/amanhã** é o maior ganho de produtividade.
Agrega dados já existentes filtrando por responsável (depende do #17).

---

## 🗺️ Roadmap sugerido (parte 2)

### Fase 1 — Corretude e segurança barata (alguns dias)
Itens **67** (timezone das datas), **1** (input decimal), **2/53** (CHECK de
dinheiro), **6** (idempotência no fechamento), **43** (confirmar exclusão), **41**
(papel no servidor), **42** (esconder ações destrutivas), **76** (erros de query),
**80** (errMsg único), **9** (loading por rota).

### Fase 2 — Fundações de dados e operação (1-2 semanas)
Itens **55** (trigger de parcelas), **54** (parcelas somam o total), **57/59**
(cliente único + telefone E.164), **68** (índices compostos), **35** (lixeira/
soft-delete), **16/17** (reexpor campos + responsável), **20** (cobrança da
semana), **48** (headers de segurança), **74** (revalidação padronizada).

### Fase 3 — Inteligência de negócio e engajamento (1-2 meses)
Itens **18** (funil de conversão), **19** (tempo no funil), **33** (previsão de
caixa), **32** (sazonalidade), **24** (desconto/margem), **105** (resumo diário
por e-mail), **109** (proposta por link), **115** (timeline do lead), **111**
(ações em massa), **120** (minha semana), **26** (tags de cliente), **58**
(deduplicar clientes).

---

*Documento gerado em 06/2026 a partir de uma segunda auditoria do código,
complementar ao `melhorias.md` (sem sobreposição de itens). Ao implementar um
item, risque-o daqui ou mova para um CHANGELOG.*
