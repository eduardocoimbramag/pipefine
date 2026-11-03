import { ConciergeBell, DatabaseZap, Send } from "lucide-react";
import { getQuoteBoard, SENT_QUOTES_LIMIT } from "@/lib/queries/quotes";
import { getActiveCompanyContext } from "@/lib/active-company";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuoteTicket } from "./quote-ticket";
import { QuoteTicketActions } from "./quote-ticket-actions";
import { SentQuotes } from "./sent-quotes";
import { AutoRefresh } from "./auto-refresh";

export const metadata = { title: "Orçamentos — Pipefine" };
export const dynamic = "force-dynamic";

export default async function OrcamentosPage() {
  const { activeCompanyId, activeCompany } = await getActiveCompanyContext();
  const board = await getQuoteBoard(activeCompanyId ?? undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        description={
          activeCompany
            ? `${activeCompany.name} · pedidos de orçamento recebidos pelo site`
            : "Pedidos de orçamento recebidos pelos sites."
        }
      />

      {!board.available ? (
        <EmptyState
          icon={DatabaseZap}
          title="Recurso ainda não ativado no banco"
          description="Rode lib/sql/migrations/006_quote_requests.sql no SQL Editor do Supabase. O passo a passo está em docs/integracaosites.md."
        />
      ) : (
        <Tabs defaultValue="pendentes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pendentes">
              Pendentes ({board.pendentes.length})
            </TabsTrigger>
            <TabsTrigger value="enviados">
              Enviados ({board.enviados.length}
              {board.enviados.length >= SENT_QUOTES_LIMIT && "+"})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="space-y-3">
            {board.pendentes.length === 0 ? (
              <EmptyState
                icon={ConciergeBell}
                title="Nenhuma comanda na fila"
                description="Os pedidos de orçamento dos sites aparecem aqui assim que chegam."
              />
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Mais antigas primeiro · a fila atualiza sozinha a cada minuto.
                </p>
                <div className="grid gap-x-6 gap-y-8 pt-2 sm:grid-cols-2 xl:grid-cols-3">
                  {board.pendentes.map((q) => (
                    <QuoteTicket
                      key={q.id}
                      quote={q}
                      actions={
                        <QuoteTicketActions
                          id={q.id}
                          numero={q.numero}
                          status={q.status}
                          telefone={q.telefone}
                        />
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="enviados" className="space-y-3">
            {board.enviados.length === 0 ? (
              <EmptyState
                icon={Send}
                title="Nenhum orçamento enviado ainda"
                description="Quando você marcar uma comanda como enviada, ela aparece aqui."
              />
            ) : (
              <>
                {board.enviados.length >= SENT_QUOTES_LIMIT && (
                  <p className="text-xs text-muted-foreground">
                    Mostrando os {SENT_QUOTES_LIMIT} envios mais recentes.
                  </p>
                )}
                <SentQuotes quotes={board.enviados} />
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      <AutoRefresh />
    </div>
  );
}
