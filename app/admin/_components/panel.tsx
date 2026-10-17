/** Tarjeta con título del Operations Center (ficha 360°, CRM, Soporte). */
export default function Panel({ title, hint, action, children, className }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg border border-border bg-surface ${className ?? ""}`}>
      <header className="flex items-start gap-3 border-b border-border px-[18px] py-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[15px] font-semibold">{title}</h2>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
