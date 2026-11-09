"use client";

import { useCallback } from "react";
import AdvancedSearch, { type FavoriteItem } from "@/components/organisms/advanced-search/advanced-search";
import type { SearchAlias, SearchSchema, SearchState } from "@/lib/foundation/list-search";
import { deleteSearchAction, renameSearchAction, saveSearchAction, setDefaultSearchAction } from "@/app/[tenant]/(app)/_actions/saved-searches";
import { crmFilterCountsAction } from "@/app/[tenant]/(app)/crm/search-actions";

const SECTION = "crm";
/** Los enlaces de antes (`?mios=0`, «Todas») siguen funcionando. */
const ALIAS: SearchAlias = { param: "mios", map: { "0": "todas" } };

/** El buscador avanzado del pipeline: el componente compartido con las acciones de esta sección. */
export default function CrmSearchBar({ slug, schema, favorites, className }: { slug: string; schema: SearchSchema; favorites: FavoriteItem[]; className?: string }) {
  const counts = useCallback((state: SearchState) => crmFilterCountsAction(slug, state), [slug]);
  return (
    <AdvancedSearch
      className={className}
      etiqueta="Buscar oportunidades"
      esquema={schema}
      favoritos={favorites}
      conteos={counts}
      alias={ALIAS}
      nombreBase="Oportunidades guardadas"
      acciones={{
        guardar: (input) => saveSearchAction(slug, SECTION, input),
        renombrar: (id, name) => renameSearchAction(slug, SECTION, id, name),
        eliminar: (id) => deleteSearchAction(slug, SECTION, id),
        fijar: (id, value) => setDefaultSearchAction(slug, SECTION, id, value),
      }}
    />
  );
}
