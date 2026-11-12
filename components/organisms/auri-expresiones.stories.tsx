import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EyeTracker, type EyeMood } from "@/components/atoms/eye-tracker";

/**
 * AURI AI y sus caras. Todas salen del mismo componente (`EyeTracker` con forma de bola) y se piden con `mood`, `gaze`,
 * `speaking` y `say`; así cualquier pantalla puede hacerla reaccionar sin dibujar nada nuevo.
 */
const FACES: { mood: EyeMood; name: string; when: string }[] = [
  { mood: "neutral", name: "Neutral", when: "En reposo: mira al frente y parpadea." },
  { mood: "joy", name: "Alegría", when: "Saludo, una venta registrada, algo salió bien." },
  { mood: "wink", name: "Guiño", when: "Despedida o un consejo cómplice («Aquí estaré»)." },
  { mood: "surprise", name: "Sorpresa", when: "Mostrar algo nuevo o un número que llama la atención." },
  { mood: "think", name: "Pensando", when: "Mientras busca, calcula o espera una respuesta." },
  { mood: "curious", name: "Curiosa", when: "Cuando pregunta o señala algo para que lo mires." },
  { mood: "sad", name: "Triste", when: "Un error o algo que no pudo hacer." },
];

const meta = {
  title: "Organismos/AURI/Expresiones",
  id: "organismos-auri-·-expresiones",
  component: EyeTracker,
  parameters: { layout: "fullscreen", docs: { description: { component: "Las caras de AURI AI: neutral, alegría, guiño, sorpresa, pensando, curiosa y triste; además puede hablar (los ojos laten y se mece) y mirar hacia una parte de la pantalla. Una demostración las recorre todas y un panel permite probarlas." } } },
  args: { mood: "neutral", speaking: false, size: 140, shape: "Ball", eyeScale: 1.2, front: true, poke: false, fit: true },
  argTypes: {
    mood: { control: "select", options: FACES.map((f) => f.mood), description: "La expresión." },
    speaking: { control: "boolean", description: "Está hablando: los ojos laten y la cara se mece." },
    size: { control: { type: "range", min: 48, max: 180, step: 4 } },
    say: { control: "text", description: "Lo que dice en su burbuja (se escribe letra a letra)." },
  },
} satisfies Meta<typeof EyeTracker>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Todas las caras, con cuándo usar cada una. */
export const TodasLasCaras: Story = {
  render: () => (
    <div className="grid gap-8 p-8 sm:grid-cols-2 lg:grid-cols-4">
      {FACES.map((f) => (
        <figure key={f.mood} className="grid justify-items-center gap-3 rounded-xl border border-border bg-surface p-5 text-center">
          <EyeTracker fit decorative front poke={false} size={104} shape="Ball" eyeScale={1.2} mood={f.mood} />
          <figcaption className="grid gap-1">
            <b className="text-sm">{f.name}</b>
            <span className="text-ui text-muted-foreground">{f.when}</span>
          </figcaption>
        </figure>
      ))}
      <figure className="grid justify-items-center gap-3 rounded-xl border border-border bg-surface p-5 text-center">
        <EyeTracker fit decorative front poke={false} size={104} shape="Ball" eyeScale={1.2} speaking />
        <figcaption className="grid gap-1">
          <b className="text-sm">Hablando</b>
          <span className="text-ui text-muted-foreground">Mientras escribe lo que dice: los ojos laten y se mece.</span>
        </figcaption>
      </figure>
      {(
        [
          ["Mira arriba a la izquierda", { x: -0.6, y: -0.6 }],
          ["Mira a la izquierda", { x: -0.75, y: 0 }],
          ["Mira abajo", { x: 0, y: 0.6 }],
        ] as const
      ).map(([name, gaze]) => (
        <figure key={name} className="grid justify-items-center gap-3 rounded-xl border border-border bg-surface p-5 text-center">
          <EyeTracker fit decorative front poke={false} size={104} shape="Ball" eyeScale={1.2} gaze={gaze} />
          <figcaption className="grid gap-1">
            <b className="text-sm">{name}</b>
            <span className="text-ui text-muted-foreground">Señala una parte de la pantalla.</span>
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};

const SCRIPT: { mood: EyeMood; say: string; gaze?: { x: number; y: number } }[] = [
  { mood: "joy", say: "¡Hola! Soy AURI." },
  { mood: "curious", say: "¿Qué quieres hacer hoy?", gaze: { x: -0.5, y: -0.4 } },
  { mood: "think", say: "Déjame buscarlo…" },
  { mood: "surprise", say: "¡Vendiste el doble que ayer!" },
  { mood: "sad", say: "Esto no lo pude hacer." },
  { mood: "wink", say: "Aquí estaré." },
];

function Demo() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % SCRIPT.length), 2800);
    return () => window.clearInterval(id);
  }, []);
  const step = SCRIPT[i]!;
  return (
    <div className="grid min-h-[420px] place-items-center p-8">
      <div className="grid justify-items-center gap-6">
        <EyeTracker fit decorative front poke={false} size={150} shape="Ball" eyeScale={1.2} mood={step.mood} gaze={step.gaze ?? null} say={step.say} sayAt="br" />
        <p className="text-ui text-muted-foreground">{FACES.find((f) => f.mood === step.mood)?.name}</p>
      </div>
    </div>
  );
}

/** Demostración: recorre todas las caras hablando, una cada 2,8 s. */
export const Demostracion: Story = {
  args: {
    size: 96
  },

  render: () => <Demo />
};

/** Pruébala: cambia la cara, el tamaño, si habla y lo que dice desde los controles. */
export const Probar: Story = {
  args: { say: "Hola, soy AURI." },
  decorators: [(Story) => <div className="grid min-h-[420px] place-items-center p-8"><Story /></div>],
};

/** Gorro de Navidad dibujado en SVG (rojo con borde y pompón blancos). Decorativo. */
function GorroDeNavidad({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 100" className={className}>
      {/* cuerpo del gorro, con su pliegue caído hacia el pompón */}
      <path d="M10 80 C22 40 52 14 88 20 C97 22 103 27 105 34 C99 48 106 64 111 80 Z" fill="#d32f2f" />
      <path d="M52 80 C54 52 70 30 88 22 C97 24 102 28 105 34 C99 48 106 64 111 80 Z" fill="#b71c1c" opacity="0.55" />
      {/* borde de piel */}
      <rect x="3" y="72" width="114" height="22" rx="11" fill="#fafafa" />
      <rect x="3" y="84" width="114" height="10" rx="5" fill="#e0e0e0" opacity="0.6" />
      {/* pompón */}
      <circle cx="105" cy="30" r="11" fill="#fafafa" />
      <circle cx="108" cy="33" r="6" fill="#e0e0e0" opacity="0.55" />
    </svg>
  );
}

/**
 * AURI con un gorro de Navidad que sigue el borde redondeado de arriba (lado izquierdo), mirando al frente y guiñando: el ojo
 * izquierdo bien abierto y el derecho cerrado. El gorro se apoya sobre la curva de la cabeza: su borde queda tangente al círculo.
 */
export const ConGorroDeNavidad: Story = {
  args: {
    mood: "surprise",
    speaking: false,
    size: 180,
    say: ""
  },

  render: () => (
    <div className="grid min-h-[480px] place-items-center p-8">
      <div className="relative inline-block">
        <EyeTracker fit decorative front poke={false} size={180} shape="Ball" eyeScale={1.2} mood="wink" />
        {/* El centro del borde del gorro cae sobre el círculo a 130° (arriba a la izquierda), 46 % del radio hacia afuera, y se inclina 40° para ir con la curva. */}
        <GorroDeNavidad className="pointer-events-none absolute -left-[5.6%] -top-[22%] w-[52%] -rotate-[40deg] origin-[50%_85%]" />
      </div>
    </div>
  )
};
