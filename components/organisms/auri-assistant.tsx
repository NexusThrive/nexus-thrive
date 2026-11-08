"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, LifeBuoy } from "lucide-react";
import { EyeTracker } from "@/components/atoms/eye-tracker";
import { Alert } from "@/components/molecules/alert";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { HelpCenter } from "@/components/organisms/help-center";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { AURI_ASK_EVENT } from "@/lib/experience/assistant/ask-auri";
import { cn } from "@/lib/utils";

/**
 * AURI AI: la asistente del negocio, en la esquina donde antes estaba el «?». El botón es su cara (EyeTracker): sigue el
 * cursor y parpadea. Abre una ventana flotante de chat. HOY ES SOLO LA INTERFAZ: no hay modelo detrás, así que no inventa
 * respuestas; avisa que aún no está conectada. Cuando se conecte, se cambia `reply()` por la llamada real (con el contexto del
 * negocio y el canal de WhatsApp) y el resto de la pantalla queda igual. El Centro de ayuda sigue disponible desde el chat.
 */
type Message = { id: number; from: "user" | "auri"; text: string };

const SUGGESTIONS = ["¿Cómo van las ventas de hoy?", "Clientes con saldo por cobrar", "Citas de mañana", "Responder un mensaje de WhatsApp"];

/** Respuesta provisional: honesta sobre lo que todavía no puede hacer. Aquí entrará el modelo. */
async function reply(): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return "Todavía no estoy conectada a los datos de tu negocio, así que no puedo responder esto. Cuando me conecten podré consultar tus ventas, clientes y citas, y atender tu WhatsApp.";
}

export function AuriAssistant({
  tenantSlug,
  businessName,
  activeModules,
  showFunctions = true,
}: {
  tenantSlug: string;
  businessName: string;
  activeModules: readonly string[];
  showFunctions?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  // Siempre a la vista el último mensaje (o el indicador de que escribe).
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, thinking]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || thinking) return;
    setMessages((list) => [...list, { id: nextId.current++, from: "user", text: clean }]);
    setDraft("");
    setThinking(true);
    const answer = await reply();
    if (!alive.current) return;
    setMessages((list) => [...list, { id: nextId.current++, from: "auri", text: answer }]);
    setThinking(false);
  }

  useEffect(() => {
    sendRef.current = send;
  });
  // Otras partes de la app le pasan preguntas (p. ej. la búsqueda cuando no encuentra nada): se abre el chat y se envía.
  useEffect(() => {
    const onAsk = (event: Event) => {
      const text = (event as CustomEvent<{ text: string }>).detail?.text;
      setOpen(true);
      if (text) void sendRef.current(text);
    };
    window.addEventListener(AURI_ASK_EVENT, onAsk);
    return () => window.removeEventListener(AURI_ASK_EVENT, onAsk);
  }, []);

  const footer = (
    <form
      className="grid w-full gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void send(draft);
      }}
    >
      <div className="flex items-end gap-2">
        <textarea
          aria-label="Escribe tu mensaje a AURI AI"
          rows={1}
          value={draft}
          maxLength={1000}
          placeholder="Escríbele a AURI…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter envía; Mayús+Enter baja de línea.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(draft);
            }
          }}
          className="field-sizing-content max-h-32 min-h-11 w-full resize-none rounded-lg border border-border-input bg-background px-3 py-2.5 text-ui text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:border-border-input-hover focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring/30"
        />
        <button
          type="submit"
          disabled={!draft.trim() || thinking}
          aria-label="Enviar mensaje"
          data-press=""
          className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground outline-none transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ArrowUp aria-hidden="true" className="size-5" strokeWidth={2.2} />
        </button>
      </div>
      <p className="text-center text-xs text-muted-foreground">Enter envía · Mayús + Enter baja de línea</p>
    </form>
  );

  return (
    <>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        drawer
        floating
        unsavedGuard={false}
        initialFocus="panel"
        title={
          <span className="flex items-center gap-2.5">
            <EyeTracker fit decorative poke={false} size={34} shape="Ball" eyeScale={1.15} />
            AURI AI
          </span>
        }
        description={`Asistente de ${businessName} · vista previa`}
        footer={footer}
        trigger={
          <button
            type="button"
            data-tour="help"
            aria-label="Abrir el chat con AURI AI"
            data-press=""
            className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-(--z-sticky) grid size-14 place-items-center rounded-full shadow-(--shadow-popover) outline-none transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:size-16 md:bottom-6 md:right-6"
          >
            <EyeTracker fit decorative poke={false} size={56} shape="Ball" eyeScale={1.2} />
            {/* punto de «en línea»: la asistente está disponible */}
            <span aria-hidden="true" className="absolute right-0.5 top-0.5 size-3 rounded-full border-2 border-background bg-success" />
          </button>
        }
      >
        <div role="log" aria-live="polite" aria-label="Conversación con AURI AI" className="grid min-h-[40dvh] content-start gap-3">
          <Alert tone="info">Vista previa: AURI AI todavía no está conectada a los datos de tu negocio ni a WhatsApp.</Alert>

          <Bubble from="auri">
            Hola, soy AURI, la asistente de {businessName}. Pronto podré contarte cómo van tus ventas, buscar clientes, revisar tus citas y atender tu WhatsApp. Por ahora puedes probar la conversación.
          </Bubble>

          {messages.map((message) => (
            <Bubble key={message.id} from={message.from}>
              {message.text}
            </Bubble>
          ))}

          {thinking ? (
            <div className="flex items-center gap-1 justify-self-start rounded-2xl rounded-tl-md bg-surface-muted px-4 py-3" role="status" aria-label="AURI AI está escribiendo">
              {[0, 1, 2].map((dot) => (
                <span key={dot} aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: `${dot * 160}ms` }} />
              ))}
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="grid gap-2 pt-1">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Prueba con</p>
              <ChipRow className="flex-wrap">
                {SUGGESTIONS.map((suggestion) => (
                  <Chip key={suggestion} onClick={() => void send(suggestion)} className="h-auto min-h-8 whitespace-normal py-1.5 text-left">
                    {suggestion}
                  </Chip>
                ))}
              </ChipRow>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setHelpOpen(true);
            }}
            className="mt-2 inline-flex items-center gap-1.5 justify-self-start text-ui font-medium text-accent-text underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <LifeBuoy aria-hidden="true" className="size-4" /> ¿Necesitas ayuda de soporte? Abre el Centro de ayuda
          </button>
          <div ref={endRef} />
        </div>
      </ResponsiveSheet>

      {/* El Centro de ayuda ya no tiene botón propio: se abre desde el chat. */}
      <HelpCenter
        tenantSlug={tenantSlug}
        businessName={businessName}
        activeModules={activeModules}
        showFunctions={showFunctions}
        open={helpOpen}
        onOpenChange={setHelpOpen}
        hideTrigger
      />
    </>
  );
}

/** Un mensaje: el de AURI a la izquierda, el de la persona a la derecha con el acento de la marca. */
function Bubble({ from, children }: { from: "user" | "auri"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-ui leading-relaxed",
        from === "auri" ? "justify-self-start rounded-tl-md bg-surface-muted text-foreground" : "justify-self-end rounded-tr-md bg-accent text-accent-foreground",
      )}
    >
      {children}
    </div>
  );
}
