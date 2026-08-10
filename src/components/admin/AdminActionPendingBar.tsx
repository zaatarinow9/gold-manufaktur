import { LoaderCircle } from "lucide-react";

type AdminActionPendingBarProps = {
  active: boolean;
  label: string;
};

export function AdminActionPendingBar({ active, label }: AdminActionPendingBarProps) {
  return (
    <div className="sticky top-3 z-20 h-0" aria-live="polite" aria-atomic="true">
      <div
        className={`overflow-hidden rounded-xl border border-gold/20 bg-surface/95 shadow-lg backdrop-blur transition-all duration-150 ${
          active
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        aria-hidden={!active}
      >
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin text-gold" />
          <span>{label}</span>
        </div>
        <div className="h-0.5 overflow-hidden bg-gold/15">
          <div className="h-full w-2/5 animate-pulse bg-gold" />
        </div>
      </div>
    </div>
  );
}
