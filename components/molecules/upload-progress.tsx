import { clamp01, cn } from "@/lib/utils";
import { NMark } from "@/components/atoms/n-mark";
import { FocusText } from "@/components/atoms/focus-text";

/* --- 7 · Subida con progreso --------------------------------------------- */
export function UploadProgress({
  progress,
  filename,
  className,
}: {
  progress: number;
  filename: string;
  className?: string;
}) {
  const done = progress >= 1;
  return (
    <div
      className={cn("flex w-full items-center gap-3.5", className)}
      role="status"
      aria-live="polite"
    >
      <NMark size={40} state={done ? "done" : "prog"} progress={progress} />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-sm font-medium text-foreground">
          {filename}
        </b>
        <FocusText
          text={done ? "Subido correctamente" : "Subiendo…"}
          className="text-xs text-muted-foreground"
        />
      </div>
      <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
        {Math.round(clamp01(progress) * 100)} %
      </span>
    </div>
  );
}
