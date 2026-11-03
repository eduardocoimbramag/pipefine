import { Courier_Prime } from "next/font/google";
import { differenceInHours, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date";
import { QUOTE_SEGMENT_LABELS, type QuoteWithCompany } from "@/types";

// Fonte de impressora térmica — só para as comandas.
const ticketFont = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

/** Inclinações leves e fixas por número, para as comandas não ficarem "certinhas". */
const TILTS = [-1.1, 0.7, -0.4, 1, -0.7, 0.3];

/** Horas na fila a partir das quais a comanda fica em destaque. */
const WAIT_WARNING_HOURS = 24;
const WAIT_URGENT_HOURS = 48;

/** Nº 0042 */
export function formatQuoteNumber(numero: number): string {
  return String(numero).padStart(4, "0");
}

/**
 * Link do WhatsApp a partir do telefone digitado no site. Números com 10/11
 * dígitos (DDD + número) ganham o código do Brasil (55).
 */
export function whatsappUrl(telefone: string | null): string | null {
  const digits = (telefone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}`;
}

function Rule() {
  return <hr className="my-3 border-0 border-t border-dashed border-ticket-rule" />;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="pt-px text-[11px] uppercase tracking-wider text-ticket-muted">
        {label}
      </dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

/**
 * Comanda de restaurante com todos os dados que a pessoa preencheu no site.
 * `actions` é renderizado no rodapé (dentro do papel).
 */
export function QuoteTicket({
  quote,
  actions,
}: {
  quote: QuoteWithCompany;
  actions?: React.ReactNode;
}) {
  const enviado = quote.status === "enviado";
  const horasNaFila = differenceInHours(new Date(), new Date(quote.created_at));
  const tilt = TILTS[quote.numero % TILTS.length];
  const whatsapp = whatsappUrl(quote.telefone);

  return (
    <div
      className="comanda"
      style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}
    >
      <span className="comanda-clip" aria-hidden />
      <article
        className={cn(
          ticketFont.className,
          "comanda-paper px-5 pt-6 text-[13px] leading-relaxed",
        )}
      >
        {/* Cabeçalho */}
        <header className="text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ticket-muted">
            {quote.company?.name ?? "—"}
          </p>
          <p className="mt-1 text-base font-bold uppercase tracking-[0.25em]">
            Comanda
          </p>
          <p className="text-2xl font-bold leading-tight">
            Nº {formatQuoteNumber(quote.numero)}
          </p>
          <p className="mt-1 text-[11px] text-ticket-muted">
            Recebida em {formatDateTime(quote.created_at)}
          </p>
        </header>

        <Rule />

        {/* Contato */}
        <dl className="grid grid-cols-[5.25rem_1fr] gap-x-2 gap-y-1">
          <Field label="Cliente">
            <span className="font-bold">{quote.nome}</span>
          </Field>
          <Field label="Telefone">
            {quote.telefone ? (
              whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
                >
                  {quote.telefone}
                </a>
              ) : (
                quote.telefone
              )
            ) : (
              "—"
            )}
          </Field>
          <Field label="E-mail">
            {quote.email ? (
              <a
                href={`mailto:${quote.email}`}
                className="break-all underline decoration-dotted underline-offset-2 hover:decoration-solid"
              >
                {quote.email}
              </a>
            ) : (
              "—"
            )}
          </Field>
        </dl>

        <Rule />

        {/* Evento */}
        <dl className="grid grid-cols-[5.25rem_1fr] gap-x-2 gap-y-1">
          <Field label="Segmento">
            <span className="inline-block border border-ticket-ink px-1.5 text-[11px] font-bold uppercase leading-5 tracking-wider">
              {QUOTE_SEGMENT_LABELS[quote.segmento] ?? quote.segmento}
            </span>
          </Field>
          {quote.segmento === "corporativo" && (
            <Field label="Empresa">{quote.nome_empresa ?? "—"}</Field>
          )}
          <Field label="Evento">{quote.tipo_evento ?? "—"}</Field>
          <Field label="Qtd.">{quote.quantitativo ?? "—"}</Field>
        </dl>

        <Rule />

        {/* Descrição */}
        <section>
          <p className="text-[11px] uppercase tracking-wider text-ticket-muted">
            Obs.
          </p>
          <p className="mt-0.5 whitespace-pre-wrap break-words">
            {quote.descricao ?? "— sem descrição —"}
          </p>
        </section>

        <Rule />

        {/* Rodapé */}
        <footer className="space-y-1 text-center text-[11px] uppercase tracking-wider">
          {enviado ? (
            <p>Enviado em {formatDateTime(quote.enviado_em)}</p>
          ) : (
            <p
              className={cn(
                horasNaFila >= WAIT_WARNING_HOURS && "font-bold",
                horasNaFila >= WAIT_URGENT_HOURS && "text-ticket-stamp",
              )}
            >
              {horasNaFila >= WAIT_URGENT_HOURS && "!! "}
              Na fila há{" "}
              {formatDistanceToNowStrict(new Date(quote.created_at), {
                locale: ptBR,
              })}
            </p>
          )}
          <p className="text-ticket-muted">
            {quote.consentimento
              ? "✓ Autorizou contato comercial"
              : "✗ Sem autorização de contato"}
          </p>
        </footer>

        {actions && <div className="mt-4">{actions}</div>}
      </article>

      {enviado && (
        <div className={cn(ticketFont.className, "comanda-stamp")} aria-hidden>
          <p className="text-xl font-bold uppercase tracking-[0.2em]">
            Enviado
          </p>
          {quote.enviado_em && (
            <p className="text-[10px] font-bold">
              {formatDateTime(quote.enviado_em)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
