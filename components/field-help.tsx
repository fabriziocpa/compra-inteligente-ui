"use client";

// Ayuda por campo exigida por el enunciado SI642 (sección 6.b): un ícono «i»
// junto al label muestra una indicación breve sobre cómo llenar el campo.
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function FieldHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        tabIndex={-1}
        aria-label={text}
        className="text-muted-foreground hover:text-foreground inline-flex cursor-help items-center"
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
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
  help?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{children}</Label>
      {help ? <FieldHelp text={help} /> : null}
    </div>
  );
}
