"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Filter, Layers, MoreVertical, Search, Star, X } from "lucide-react";
import { GroupIcon } from "@/components/atoms/group-icon";
import { Switch } from "@/components/atoms/switch";
import { NLoader } from "@/components/atoms/n-loader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/molecules/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/molecules/popover";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import {
  RULE_OPS,
  groupingLabel,
  parseSearchState,
  sameSearch,
  searchTerms,
  snapshotOf,
  stateOfSnapshot,
  suggestSearchName,
  writeSearchState,
  type SearchAlias,
  type SearchRule,
  type SearchSchema,
  type SearchSnapshot,
  type SearchState,
} from "@/lib/foundation/list-search";
import { cn } from "@/lib/utils";
import { RenameFavoriteDialog, RuleDialog } from "./search-dialogs";

/**
 * Buscador avanzado de las listas: barra con chips y panel «Buscar en · Filtros · Agrupar por · Favoritos». Es el mismo
 * para todas las secciones; cada una le pasa su esquema (filtros, agrupaciones, campos y reglas), sus favoritos y las
 * acciones que los guardan. El estado vive en la URL (`q`, `en`, `filtros`, `grupo`, `regla`), así que se comparte,
 * se recarga y funciona con «atrás». Idea del buscador de Odoo; nada de su código ni de su aspecto.
 */
export type FavoriteItem = { id: string; name: string; isDefault: boolean; params: SearchSnapshot };
export type FavoriteResult = { ok: true } | { ok: false; message: string };

export type AdvancedSearchProps = {
  /** Nombre accesible del campo («Buscar clientes»). */
  etiqueta: string;
  esquema: SearchSchema;
  favoritos: FavoriteItem[];
  /** Cuántos registros quedarían al activar cada filtro; se pide al abrir el panel. */
  conteos?: (state: SearchState) => Promise<Record<string, number>>;
  acciones: {
    guardar: (input: { name: string; params: SearchSnapshot; isDefault: boolean }) => Promise<FavoriteResult>;
    renombrar: (id: string, name: string) => Promise<FavoriteResult>;
    eliminar: (id: string) => Promise<FavoriteResult>;
    fijar: (id: string, value: boolean) => Promise<FavoriteResult>;
  };
  alias?: SearchAlias;
  /** Nombre de lo que se guarda si no hay nada activo que lo describa. */
  nombreBase?: string;
  className?: string;
};

const DEBOUNCE_MS = 250;
const itemBase =
  "flex min-h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-foreground/85 outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11";
const sep = <div role="separator" className="mx-1 my-1.5 h-px bg-border" />;

function PanelTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 px-2.5 pb-2.5 text-sm font-semibold text-foreground">
      <span className="text-accent-text" aria-hidden="true">{icon}</span>
      {children}
    </h3>
  );
}

/** Opción con ✓ reservado (el texto no se mueve), conteo a la derecha. */
function Option({ active, count, onClick, children, ...rest }: { active: boolean; count?: number; onClick: () => void; children: React.ReactNode } & Omit<React.ComponentProps<"button">, "onClick">) {
  return (
    <button type="button" data-sp-item="" aria-pressed={active} onClick={onClick} className={cn(itemBase, active && "bg-surface-muted text-foreground")} {...rest}>
      <span className="flex w-3.5 shrink-0 text-accent-text" aria-hidden="true">{active ? <Check className="size-3.5" strokeWidth={2.6} /> : null}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined ? <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span> : null}
    </button>
  );
}

export default function AdvancedSearch({ etiqueta, esquema, favoritos, conteos, acciones, alias, nombreBase = "Mi búsqueda", className }: AdvancedSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirm, confirmDialog] = useConfirm();
  const panelId = useId();

  const state = useMemo(() => parseSearchState(searchParams, esquema, alias), [searchParams, esquema, alias]);
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const escaped = useRef(false);

  const apply = useCallback(
    (next: SearchState) => {
      startTransition(() => {
        router.replace(`${pathname}?${writeSearchState(new URLSearchParams(searchParams.toString()), next, alias).toString()}`, { scroll: false });
      });
    },
    [alias, pathname, router, searchParams],
  );

  // ---- Texto: términos confirmados con Enter + lo que se escribe ahora (en vivo, con debounce).
  const [terms, setTerms] = useState(() => searchTerms(state.q));
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setTerms(searchTerms(state.q));
      setDraft("");
    }
  }, [state.q]);
  const desiredQ = [...terms, draft.trim()].filter(Boolean).join("|");
  useEffect(() => {
    if (desiredQ === state.q) return;
    const timer = setTimeout(() => apply({ ...state, q: desiredQ }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredQ]);

  // ---- Conteos de cada filtro: al abrir y cuando cambia la búsqueda.
  const [counts, setCounts] = useState<Record<string, number>>({});
  const stateKey = JSON.stringify(snapshotOf(state));
  useEffect(() => {
    if (!open || !conteos) return;
    let alive = true;
    conteos(state).then((next) => alive && setCounts(next)).catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stateKey, conteos]);

  // ---- Cambios de estado
  const filterOption = (id: string) => esquema.filterGroups.flatMap((g) => g.options).find((o) => o.id === id);
  const toggleFilter = (groupId: string, optionId: string) => {
    const group = esquema.filterGroups.find((g) => g.id === groupId)!;
    const selected = state.filters.includes(optionId);
    const others = state.filters.filter((id) => !group.options.some((o) => o.id === id));
    if (group.exclusive) {
      apply({ ...state, filters: selected ? others : [...others, optionId] });
    } else {
      apply({ ...state, filters: selected ? state.filters.filter((id) => id !== optionId) : [...state.filters, optionId] });
    }
  };
  const toggleGroup = (id: string) =>
    apply({ ...state, groups: state.groups.includes(id) ? state.groups.filter((g) => g !== id) : [...state.groups, id] });
  const defaultFields = esquema.fields.filter((f) => f.defaultOn).map((f) => f.id);
  const activeFields = state.fields ?? defaultFields;
  const toggleField = (id: string) => {
    const next = activeFields.includes(id) ? activeFields.filter((f) => f !== id) : esquema.fields.map((f) => f.id).filter((f) => f === id || activeFields.includes(f));
    if (next.length === 0) return; // siempre queda al menos un campo donde buscar
    const sameAsDefault = next.length === defaultFields.length && next.every((f) => defaultFields.includes(f));
    apply({ ...state, fields: sameAsDefault ? null : next });
  };
  const addRule = (rule: SearchRule) => apply({ ...state, rules: [...state.rules, rule] });

  // ---- Cierre del panel
  const close = () => setOpen(false);
  const moveFocus = (event: React.KeyboardEvent, from: HTMLElement | null) => {
    const items = [...(contentRef.current?.querySelectorAll<HTMLElement>("[data-sp-item]:not(:disabled)") ?? [])];
    if (items.length === 0) return;
    const index = from ? items.indexOf(from) : -1;
    const next = event.key === "ArrowDown" ? items[Math.min(items.length - 1, index + 1)] : items[Math.max(0, index - 1)];
    event.preventDefault();
    next?.focus();
  };

  // ---- Favoritos
  const [dialog, setDialog] = useState<null | { kind: "rule" } | { kind: "rename"; favorite: FavoriteItem }>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const suggested = useMemo(() => suggestSearchName(state, esquema, nombreBase), [state, esquema, nombreBase]);
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? suggested;
  const [asDefault, setAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = favoritos.find((f) => sameSearch(stateOfSnapshot(f.params, esquema), state));

  const run = async (job: () => Promise<FavoriteResult>, done: string) => {
    const result = await job().catch(() => ({ ok: false as const, message: "No se pudo completar. Inténtalo de nuevo." }));
    if (result.ok) {
      toast(done, "success");
      router.refresh();
    } else {
      toast(result.message, "error");
    }
    return result.ok;
  };
  const save = async () => {
    setSaving(true);
    const ok = await run(() => acciones.guardar({ name, params: snapshotOf(state), isDefault: asDefault }), "Búsqueda guardada.");
    setSaving(false);
    if (ok) {
      setSaveOpen(false);
      setAsDefault(false);
      setName(null);
    }
  };
  const removeFavorite = async (favorite: FavoriteItem) => {
    const yes = await confirm({ title: "Eliminar favorito", description: `«${favorite.name}» dejará de aparecer en tus favoritos. No cambia ningún dato.`, confirmLabel: "Eliminar", tone: "danger" });
    if (yes) await run(() => acciones.eliminar(favorite.id), "Favorito eliminado.");
  };

  // ---- Chips de la barra
  const impliedChips = esquema.filterGroups.flatMap((g) =>
    g.defaultOption && !g.options.some((o) => state.filters.includes(o.id)) ? [g.defaultOption] : [],
  );
  const chip = "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-surface-muted px-2 py-[3px] text-xs text-foreground";
  const removeButton = (label: string, onClick: () => void) => (
    <button type="button" aria-label={`Quitar ${label}`} onClick={onClick} className="grid size-4 place-items-center rounded text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
      <X aria-hidden="true" className="size-3" />
    </button>
  );
  const groupingIcon = state.groups.length ? esquema.groupings.find((g) => g.id === state.groups[0])?.icon : undefined;

  const quickGroupings = esquema.groupings.filter((g) => g.quick !== false);
  const extraGroupings = esquema.groupings.filter((g) => g.quick === false);
  const [extraOpen, setExtraOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverAnchor asChild>
          <div
            ref={barRef}
            className={cn(
              "flex h-[34px] items-center gap-2 rounded-lg border bg-card pl-3 pr-2 transition-colors",
              open ? "border-accent ring-2 ring-accent/25" : "border-border hover:border-foreground/20",
            )}
          >
            <Search aria-hidden="true" className="size-[15px] shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {impliedChips.map((id) => (
                <span key={id} className={chip}>{filterOption(id)?.label}</span>
              ))}
              {state.filters.map((id) => (
                <span key={id} className={chip}>
                  {filterOption(id)?.label}
                  {removeButton(filterOption(id)?.label ?? id, () => apply({ ...state, filters: state.filters.filter((f) => f !== id) }))}
                </span>
              ))}
              {state.rules.map((rule, index) => {
                const field = esquema.ruleFields.find((f) => f.id === rule.field);
                const op = RULE_OPS.find((o) => o.id === rule.op);
                const text = `${field?.label ?? rule.field} ${op?.label ?? ""}${op?.needsValue ? ` ${rule.value}` : ""}`;
                return (
                  <span key={`${rule.field}-${index}`} className={chip}>
                    {text}
                    {removeButton(text, () => apply({ ...state, rules: state.rules.filter((_, i) => i !== index) }))}
                  </span>
                );
              })}
              {state.groups.length > 0 ? (
                <span className={chip}>
                  <span className="text-accent-text"><GroupIcon name={groupingIcon} className="size-3" /></span>
                  {groupingLabel(esquema, state.groups)}
                  {removeButton("agrupación", () => apply({ ...state, groups: [] }))}
                </span>
              ) : null}
              {terms.map((term, index) => (
                <span key={`${term}-${index}`} className={chip}>
                  {term}
                  {removeButton(term, () => setTerms(terms.filter((_, i) => i !== index)))}
                </span>
              ))}
              <input
                ref={inputRef}
                type="text"
                role="searchbox"
                aria-label={etiqueta}
                aria-controls={open ? panelId : undefined}
                placeholder="Buscar…"
                value={draft}
                onClick={() => setOpen(true)}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && draft.trim()) {
                    event.preventDefault();
                    setTerms([...terms, draft.trim()]);
                    setDraft("");
                  } else if (event.key === "Backspace" && draft === "") {
                    if (terms.length) setTerms(terms.slice(0, -1));
                    else if (state.groups.length) apply({ ...state, groups: [] });
                    else if (state.rules.length) apply({ ...state, rules: state.rules.slice(0, -1) });
                    else if (state.filters.length) apply({ ...state, filters: state.filters.slice(0, -1) });
                  } else if (event.key === "ArrowDown" && open) {
                    moveFocus(event, null);
                  }
                }}
                className="h-full min-w-20 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            {isPending ? <NLoader size={14} className="shrink-0 text-current" /> : null}
            <button
              type="button"
              aria-label="Filtros, agrupar y favoritos"
              aria-expanded={open}
              aria-controls={open ? panelId : undefined}
              onClick={() => setOpen((value) => !value)}
              className="grid size-[26px] shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", open && "rotate-180")} strokeWidth={2.2} />
            </button>
          </div>
        </PopoverAnchor>

        <PopoverContent
          id={panelId}
          ref={contentRef}
          aria-label="Filtros, agrupar y favoritos"
          align="center"
          sideOffset={8}
          style={{ "--popover-w": "760px" } as React.CSSProperties}
          className="max-h-[70vh] overflow-y-auto overflow-x-hidden rounded-xl p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={() => {
            escaped.current = true;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (escaped.current) inputRef.current?.focus();
            escaped.current = false;
          }}
          onInteractOutside={(event) => {
            const target = event.target as Element | null;
            // Clics en la propia barra, en menús o diálogos abiertos desde el panel: no lo cierran.
            if (target?.closest?.('[role="menu"],[role="dialog"],[data-radix-popper-content-wrapper],[data-slot="select-content"]') || barRef.current?.contains(target as Node)) {
              event.preventDefault();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              const active = document.activeElement as HTMLElement | null;
              if (active?.matches("[data-sp-item]")) moveFocus(event, active);
            }
          }}
        >
          <div className={cn("grid grid-cols-1", esquema.groupings.length > 0 ? "md:grid-cols-[1.1fr_1fr_0.95fr]" : "md:grid-cols-[1.1fr_0.95fr]")}>
            {/* Buscar en */}
            <div className={cn("flex flex-wrap items-center gap-2 border-b border-border px-4 py-3", esquema.groupings.length > 0 ? "md:col-span-3" : "md:col-span-2")}>
              <span className="text-xs text-muted-foreground">Buscar en</span>
              {esquema.fields.map((field) => {
                const on = activeFields.includes(field.id);
                return (
                  <button
                    key={field.id}
                    type="button"
                    data-sp-item=""
                    aria-pressed={on}
                    onClick={() => toggleField(field.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-[3px] text-xs outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11",
                      on ? "border-accent bg-accent-subtle text-accent-text" : "border-border-input text-foreground/80 hover:border-border-input-hover",
                    )}
                  >
                    {field.label}
                  </button>
                );
              })}
            </div>

            {/* Filtros */}
            <section aria-label="Filtros" className="border-b border-border p-3.5 md:border-b-0 md:border-r">
              <PanelTitle icon={<Filter className="size-[15px] fill-current" />}>Filtros</PanelTitle>
              {esquema.filterGroups.map((group, index) => (
                <div key={group.id}>
                  {index > 0 ? sep : null}
                  {group.options.map((option) => {
                    const on = state.filters.includes(option.id) || (group.defaultOption === option.id && !group.options.some((o) => state.filters.includes(o.id)));
                    return (
                      <Option key={option.id} active={on} count={counts[option.id]} onClick={() => toggleFilter(group.id, option.id)}>
                        {option.label}
                      </Option>
                    );
                  })}
                </div>
              ))}
              {sep}
              <Option
                active={state.rules.length > 0}
                onClick={() => {
                  close();
                  setDialog({ kind: "rule" });
                }}
              >
                Filtro personalizado…
              </Option>
            </section>

            {/* Agrupar por */}
            {esquema.groupings.length > 0 ? (
            <section aria-label="Agrupar por" className="border-b border-border p-3.5 md:border-b-0 md:border-r">
              <PanelTitle icon={<Layers className="size-[15px]" />}>Agrupar por</PanelTitle>
              {quickGroupings.map((grouping) => (
                <Option key={grouping.id} active={state.groups.includes(grouping.id)} onClick={() => toggleGroup(grouping.id)}>
                  {grouping.label}
                </Option>
              ))}
              {extraGroupings.length > 0 ? (
                <>
                  {sep}
                  <button type="button" data-sp-item="" aria-expanded={extraOpen} onClick={() => setExtraOpen((v) => !v)} className={itemBase}>
                    <span className="w-3.5 shrink-0" aria-hidden="true" />
                    <span className="flex-1">Grupo personalizado</span>
                    <ChevronDown aria-hidden="true" className={cn("size-3 text-muted-foreground transition-transform", extraOpen && "rotate-180")} strokeWidth={2.6} />
                  </button>
                  {extraOpen
                    ? extraGroupings.map((grouping) => (
                        <Option key={grouping.id} active={state.groups.includes(grouping.id)} onClick={() => toggleGroup(grouping.id)}>
                          <span className="inline-flex items-center gap-2">
                            <span className="text-accent-text"><GroupIcon name={grouping.icon} className="size-3.5" /></span>
                            {grouping.label}
                          </span>
                        </Option>
                      ))
                    : null}
                </>
              ) : null}
            </section>
            ) : null}

            {/* Favoritos */}
            <section aria-label="Favoritos" className="p-3.5">
              <PanelTitle icon={<Star className="size-[15px] fill-current" />}>Favoritos</PanelTitle>
              {favoritos.length === 0 ? <p className="px-2.5 pb-1 text-xs text-muted-foreground">Aún no guardas búsquedas.</p> : null}
              {favoritos.map((favorite) => (
                <div key={favorite.id} className="flex items-center">
                  <div className="min-w-0 flex-1">
                    <Option active={current?.id === favorite.id} onClick={() => { apply(stateOfSnapshot(favorite.params, esquema)); close(); }}>
                      <span className="inline-flex max-w-full items-center gap-1.5">
                        <span className="truncate">{favorite.name}</span>
                        {favorite.isDefault ? <span className="shrink-0 rounded bg-surface-muted px-1 text-[10px] text-muted-foreground">Por defecto</span> : null}
                      </span>
                    </Option>
                  </div>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" data-sp-item="" aria-label={`Opciones de ${favorite.name}`} className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-11">
                        <MoreVertical aria-hidden="true" className="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onSelect={() => setDialog({ kind: "rename", favorite })}>Renombrar</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void run(() => acciones.fijar(favorite.id, !favorite.isDefault), favorite.isDefault ? "Ya no es el predeterminado." : "Se aplicará al entrar.")}>
                        {favorite.isDefault ? "Quitar como predeterminada" : "Fijar como predeterminada"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void removeFavorite(favorite)} className="text-danger">Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {sep}
              <button type="button" data-sp-item="" aria-expanded={saveOpen} onClick={() => setSaveOpen((v) => !v)} className={cn(itemBase, "text-foreground")}>
                <span className="flex-1">Guardar búsqueda actual</span>
                {saveOpen ? <ChevronUp aria-hidden="true" className="size-3 text-muted-foreground" strokeWidth={2.6} /> : <ChevronDown aria-hidden="true" className="size-3 text-muted-foreground" strokeWidth={2.6} />}
              </button>
              {saveOpen ? (
                <div className="grid gap-2.5 px-2.5 pt-1">
                  <input
                    type="text"
                    aria-label="Nombre de la búsqueda"
                    value={name}
                    maxLength={60}
                    onChange={(event) => setName(event.target.value)}
                    className="h-[34px] w-full rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground outline-none focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-ring"
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={asDefault} onCheckedChange={setAsDefault} aria-label="Usar como filtro por defecto" />
                    Usar como filtro por defecto
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving || !name.trim()}
                      onClick={() => void save()}
                      className="h-8 rounded-lg border border-accent bg-accent px-3.5 text-[13px] font-semibold text-accent-foreground outline-none hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 pointer-coarse:h-11"
                    >
                      {saving ? "Guardando…" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      disabled={!current}
                      onClick={() => current && setDialog({ kind: "rename", favorite: current })}
                      className="h-8 rounded-lg border border-border px-3.5 text-[13px] text-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40 pointer-coarse:h-11"
                    >
                      Editar
                    </button>
                  </div>
                  {!current ? <p className="text-[11px] text-muted-foreground">«Editar» abre el favorito que coincide con esta búsqueda.</p> : null}
                </div>
              ) : null}
            </section>
          </div>
        </PopoverContent>
      </Popover>

      <RuleDialog
        open={dialog?.kind === "rule"}
        onOpenChange={(next) => !next && setDialog(null)}
        fields={esquema.ruleFields}
        onAdd={addRule}
      />
      <RenameFavoriteDialog
        favorite={dialog?.kind === "rename" ? dialog.favorite : null}
        onOpenChange={(next) => !next && setDialog(null)}
        onRename={(id, value) => run(() => acciones.renombrar(id, value), "Nombre actualizado.")}
      />
      {confirmDialog}
    </div>
  );
}
