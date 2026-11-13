"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMinWidth } from "@/lib/experience/hooks/use-min-width";
import { setIntroSignal } from "@/lib/experience/assistant/intro-signal";
import { ArrowUp, CalendarDays, LifeBuoy, MessageCircle, RotateCcw, Sparkles, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { EyeTracker } from "@/components/atoms/eye-tracker";
import { useAuriGreeting } from "@/components/molecules/use-auri-greeting";
import { useCurrentUserName } from "@/components/providers/current-user";
import { AuriHomeIntroCard } from "@/components/organisms/auri-home-intro";
import { homeIntroSteps, introSeen, isHomePath, markIntroSeen } from "@/lib/experience/assistant/home-intro";
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

const SUGGESTIONS: { text: string; icon: LucideIcon }[] = [
  { text: "¿Cómo van las ventas de hoy?", icon: TrendingUp },
  { text: "Clientes con saldo por cobrar", icon: Wallet },
  { text: "Citas de mañana", icon: CalendarDays },
  { text: "Responder un mensaje de WhatsApp", icon: MessageCircle },
];

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
  const hello = useAuriGreeting();
  const pathname = usePathname();
  const name = useCurrentUserName();
  const steps = useMemo(() => homeIntroSteps(name), [name]);
  // Recorrido de la primera visita al Inicio: AURI crece en su esquina y explica el panel (una vez por navegador y negocio).
  const atHome = isHomePath(pathname ?? "", tenantSlug);
  // Venir del onboarding (`?bienvenida=1`): AURI llega volando desde la pantalla de creación (View Transition `nx-auri`) y empieza el
  // recorrido de una vez, sin esperar ni pasar por la intro de la N.
  const welcome = useSearchParams()?.get("bienvenida") === "1";
  const [intro, setIntro] = useState<number | null>(() => (welcome && atHome ? 0 : null));
  useEffect(() => {
    if (!welcome) return;
    // La marca se quita de la dirección (para que recargar o volver no repita la bienvenida); si ya vio el recorrido, no se repite.
    const url = new URL(window.location.href);
    url.searchParams.delete("bienvenida");
    window.history.replaceState(window.history.state, "", url);
    if (!introSeen(window.localStorage, tenantSlug)) return;
    const id = window.setTimeout(() => setIntro(null), 0);
    return () => window.clearTimeout(id);
  }, [welcome, tenantSlug]);
  useEffect(() => {
    if (welcome || !atHome || introSeen(window.localStorage, tenantSlug)) return;
    // Deja pasar la intro de la N y las entradas del Inicio antes de presentarse.
    const id = window.setTimeout(() => setIntro(0), 3200);
    return () => window.clearTimeout(id);
  }, [atHome, welcome, tenantSlug]);
  // En escritorio, la AURI que explica es la grande del Inicio (la de la esquina se oculta); en celular, la de la esquina. El recorrido le
  // pasa su cara a la grande por `intro-signal`, y la tarjeta con el texto se pega a ella.
  const desktop = useMinWidth(820);
  const onHeroStage = atHome && desktop;
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (intro === null || !onHeroStage) {
      const id = window.setTimeout(() => setAnchor(null), 0);
      return () => window.clearTimeout(id);
    }
    const place = () => {
      const hero = document.querySelector<HTMLElement>("[data-auri-hero]");
      if (!hero) return;
      const r = hero.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 32);
      setAnchor({ top: Math.round(r.bottom + 8), left: Math.max(16, Math.round(r.right - width)) });
    };
    const id = window.setTimeout(place, 0);
    window.addEventListener("resize", place);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", place);
    };
  }, [intro, onHeroStage]);
  const endIntro = () => {
    markIntroSeen(window.localStorage, tenantSlug);
    setIntro(null);
  };
  // Si se va del Inicio a mitad del recorrido, termina (no se queda hablando en otra pantalla).
  useEffect(() => {
    if (!atHome && intro !== null) {
      markIntroSeen(window.localStorage, tenantSlug);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- al salir del Inicio el recorrido termina
      setIntro(null);
    }
  }, [atHome, intro, tenantSlug]);
  const introStep = intro !== null ? steps[intro] : undefined;
  // Habla mientras se escribe la frase (unos 26 ms por letra): la cara late y se mece.
  const [introSpeaking, setIntroSpeaking] = useState(false);
  useEffect(() => {
    if (!introStep) return;
    const on = window.setTimeout(() => setIntroSpeaking(true), 0);
    const off = window.setTimeout(() => setIntroSpeaking(false), introStep.text.length * 26 + 250);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [introStep]);
  // La cara del recorrido para la AURI grande del Inicio (escritorio).
  useEffect(() => {
    if (intro === null || !onHeroStage) {
      setIntroSignal(null);
      return;
    }
    setIntroSignal({ mood: introStep?.mood ?? "joy", gaze: introStep?.gaze ?? null, speaking: introSpeaking });
    return () => setIntroSignal(null);
  }, [intro, onHeroStage, introStep, introSpeaking]);
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
      <div className="flex items-end gap-2 rounded-3xl border border-border/60 bg-surface-muted/60 p-1.5 transition-colors focus-within:border-accent focus-within:bg-card">
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
          className="field-sizing-content max-h-32 min-h-11 w-full resize-none rounded-2xl bg-transparent px-4 py-2.5 text-ui text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!draft.trim() || thinking}
          aria-label="Enviar mensaje"
          data-press=""
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground outline-none transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45"
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
        onOpenChange={(next) => {
          if (next && intro !== null) endIntro();
          setOpen(next);
        }}
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
            {...hello.bind}
            className={cn("fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-(--z-sticky) grid select-none place-items-center rounded-full shadow-(--shadow-popover) outline-none transition-[transform,width,height] duration-500 ease-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none md:bottom-6 md:right-6", intro !== null ? "size-24" : "size-14 pointer-coarse:size-16", atHome && "min-[820px]:hidden")}
          >
              <div className="grid size-full place-items-center">
                <EyeTracker
                  fit
                  decorative
                  poke={false}
                  size={intro !== null ? 92 : 56}
                  shape="Ball"
                  eyeScale={1.2}
                  joy={hello.joy}
                  mood={introStep?.mood ?? (thinking ? "think" : "neutral")}
                  gaze={introStep?.gaze ?? null}
                  speaking={introSpeaking}
                  say={intro !== null ? null : hello.say}
                  sayAt="tl"
                />
              </div>
            {/* punto de «en línea»: la asistente está disponible */}
            <span aria-hidden="true" className="absolute right-0.5 top-0.5 size-3 rounded-full border-2 border-background bg-success" />
          </button>
        }
      >
        <div role="log" aria-live="polite" aria-label="Conversación con AURI AI" className="grid min-h-[40dvh] content-start gap-3">
          <p className="flex items-start gap-2.5 rounded-2xl bg-accent-subtle/60 px-4 py-3 text-xs text-foreground">
            <Sparkles aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
            <span>
              <b className="font-semibold">Vista previa.</b> AURI AI todavía no está conectada a los datos de tu negocio ni a WhatsApp.
            </span>
          </p>

          <Bubble from="auri">
            Hola, soy AURI, la asistente de {businessName}. Pronto podré contarte cómo van tus ventas, buscar clientes, revisar tus citas y atender tu WhatsApp. Por ahora puedes probar la conversación.
          </Bubble>

          {messages.map((message) => (
            <Bubble key={message.id} from={message.from}>
              {message.text}
            </Bubble>
          ))}

          {thinking ? (
            <div className="flex items-center gap-1 justify-self-start rounded-3xl rounded-tl-lg bg-surface-muted/60 px-5 py-3.5" role="status" aria-label="AURI AI está escribiendo">
              {[0, 1, 2].map((dot) => (
                <span key={dot} aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: `${dot * 160}ms` }} />
              ))}
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="grid gap-2.5 pt-1">
              <p className="text-xs font-medium text-muted-foreground">Prueba con</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map(({ text, icon: Icon }) => (
                  <li key={text}>
                    <button type="button" onClick={() => void send(text)} className="flex h-full w-full items-center gap-3 rounded-2xl bg-surface-muted/60 p-3 text-left text-ui font-medium text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring">
                      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-accent-text">
                        <Icon className="size-4" strokeWidth={1.8} />
                      </span>
                      {text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setHelpOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border/60 px-4 text-ui font-medium text-foreground outline-none transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <LifeBuoy aria-hidden="true" className="size-4 text-accent-text" /> Centro de ayuda
            </button>
            {atHome ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setIntro(0);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border/60 px-4 text-ui font-medium text-foreground outline-none transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <RotateCcw aria-hidden="true" className="size-4 text-accent-text" /> Ver otra vez el recorrido
              </button>
            ) : null}
          </div>
          <div ref={endRef} />
        </div>
      </ResponsiveSheet>

      {intro !== null && !open ? (
        <AuriHomeIntroCard anchor={onHeroStage ? anchor : null} steps={steps} index={intro} onNext={() => setIntro((i) => (i === null ? i : Math.min(steps.length - 1, i + 1)))} onSkip={endIntro} />
      ) : null}

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
        "max-w-[88%] whitespace-pre-wrap break-words rounded-3xl px-5 py-3 text-ui leading-relaxed",
        from === "auri" ? "justify-self-start rounded-tl-lg bg-surface-muted/60 text-foreground" : "justify-self-end rounded-tr-lg bg-accent font-medium text-accent-foreground",
      )}
    >
      {children}
    </div>
  );
}
