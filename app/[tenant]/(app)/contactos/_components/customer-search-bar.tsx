"use client";

import { useCallback } from "react";
import AdvancedSearch, { type FavoriteItem } from "@/components/organisms/advanced-search/advanced-search";
import type { SearchAlias, SearchSchema, SearchState } from "@/lib/foundation/list-search";
import { deleteSearchAction, renameSearchAction, saveSearchAction, setDefaultSearchAction } from "../../_actions/saved-searches";
import { customerFilterCountsAction } from "../search-actions";
import { useVerticalTerms } from "../../vertical-terms-context";

const SECTION = "customers";
/** Los enlaces de antes (`?status=archived`) siguen funcionando: equivalen al filtro «Archivados». */
const ALIAS: SearchAlias = { param: "status", map: { archived: "archivados", active: "activos" } };

/** El buscador avanzado de Clientes: el componente compartido con las acciones y el vocabulario de esta sección. */
export default function CustomerSearchBar({
  tenantSlug,
  schema,
  favorites,
  className,
}: {
  tenantSlug: string;
  schema: SearchSchema;
  favorites: FavoriteItem[];
  className?: string;
}) {
  const terms = useVerticalTerms();
  const counts = useCallback((state: SearchState) => customerFilterCountsAction(tenantSlug, state), [tenantSlug]);
  return (
    <AdvancedSearch
      className={className}
      etiqueta={`Buscar ${terms.customers.toLowerCase()}`}
      esquema={schema}
      favoritos={favorites}
      conteos={counts}
      alias={ALIAS}
      nombreBase={`${terms.customers} guardados`}
      acciones={{
        guardar: (input) => saveSearchAction(tenantSlug, SECTION, input),
        renombrar: (id, name) => renameSearchAction(tenantSlug, SECTION, id, name),
        eliminar: (id) => deleteSearchAction(tenantSlug, SECTION, id),
        fijar: (id, value) => setDefaultSearchAction(tenantSlug, SECTION, id, value),
      }}
    />
  );
}
