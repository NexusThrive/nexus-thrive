/**
 * Puertos: inversión de dependencias entre dominios.
 *
 * Un dominio que necesita algo de otro, pero que por las reglas de capas no puede importarlo (Business no importa
 * Finance), declara un **puerto**: un contrato con los tipos que él mismo define. Quien sí puede importar a los dos
 * (la raíz de composición, `lib/runtime/ports.ts`) conecta la implementación una vez al arrancar el servidor.
 *
 * Es deliberadamente mínimo: sin eventos asíncronos, sin colas, sin plugins. La llamada ocurre en el mismo proceso y,
 * cuando el contrato recibe una transacción, dentro de ella: lo que Finance escribe se confirma o se deshace junto con
 * lo que escribió Business (ADR-0006: el dinero va «todo o nada»).
 *
 * Falla cerrado: usar un puerto que nadie conectó lanza `PortNotProvidedError` en lugar de omitir la operación en
 * silencio. Para un asiento contable, un error visible es preferible a un asiento perdido.
 *
 * El registro vive en `globalThis` porque Next.js puede evaluar los módulos en capas distintas (instrumentación, acciones,
 * rutas); un registro por módulo no se compartiría entre ellas.
 */

export class PortNotProvidedError extends Error {
  constructor(readonly port: string) {
    super(
      `El puerto «${port}» no está conectado. Debe conectarlo la raíz de composición (lib/runtime/ports.ts) al arrancar el ` +
        "servidor (instrumentation.ts) o en la preparación de las pruebas (vitest.setup.ts).",
    );
    this.name = "PortNotProvidedError";
  }
}

export type Port<T> = {
  readonly name: string;
  /** Conecta la implementación. Volver a llamarla reemplaza la anterior (idempotente al arrancar). */
  provide(implementation: T): void;
  /** La implementación conectada, o `PortNotProvidedError` si nadie la conectó. */
  use(): T;
  isProvided(): boolean;
};

type Registry = { provided: Map<string, unknown>; declared: Set<string> };
const KEY = Symbol.for("nexus.ports");

function registry(): Registry {
  const holder = globalThis as unknown as { [KEY]?: Registry };
  return (holder[KEY] ??= { provided: new Map(), declared: new Set() });
}

/** Declara un puerto por nombre. El nombre debe ser único y es el que aparece en los errores y en el arranque. */
export function definePort<T>(name: string): Port<T> {
  registry().declared.add(name);
  return {
    name,
    provide(implementation) {
      registry().provided.set(name, implementation);
    },
    use() {
      if (!registry().provided.has(name)) throw new PortNotProvidedError(name);
      return registry().provided.get(name) as T;
    },
    isProvided: () => registry().provided.has(name),
  };
}

/** Nombres de los puertos con implementación conectada (para el registro de arranque y las pruebas). */
export const providedPorts = (): string[] => [...registry().provided.keys()].sort();

/** Nombres de los puertos declarados en los módulos ya cargados. */
export const declaredPorts = (): string[] => [...registry().declared].sort();
