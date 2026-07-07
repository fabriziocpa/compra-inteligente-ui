import { PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm">
        <PiggyBank className="size-5" />
      </span>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">
            Compra Inteligente
          </span>
          <span className="text-muted-foreground text-xs">
            Crédito vehicular
          </span>
        </div>
      )}
    </div>
  );
}
