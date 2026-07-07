"use client";

// Per-field help affordance required by SI642 req 6b ("ayuda en cada campo").
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FieldHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            tabIndex={-1}
            aria-label="Ayuda del campo"
            className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors"
          >
            <Info className="size-3.5" />
          </button>
        }
      />
      <TooltipContent className="max-w-xs text-pretty leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function LabelWithHelp({
  htmlFor,
  children,
  help,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  help: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{children}</Label>
      <FieldHelp text={help} />
    </div>
  );
}
