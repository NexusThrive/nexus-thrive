/**
 * Declaración mínima de `Temporal.Instant` — el runtime es el built-in de
 * Node 26 (global `Temporal`); aquí solo se declara lo que el proyecto usa.
 * Prisma 8 codea las fechas con `pg/timestamp-temporal@1` y exige enviar
 * `Temporal.Instant` (strings ISO se rechazan en runtime).
 */
declare namespace Temporal {
  class Instant {
    static fromEpochMilliseconds(epochMilliseconds: number): Instant;
    static from(isoLike: string): Instant;
    toEpochMilliseconds(): number;
    toString(): string;
    readonly epochMilliseconds: number;
  }
}