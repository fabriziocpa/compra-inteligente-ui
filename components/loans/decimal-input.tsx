"use client";

// Inputs de porcentaje SIN flechas de spinner (type="text" + inputMode
// decimal). Solo el campo del seguro conserva el input numérico con flechas.
import { useId } from "react";
import { Input } from "@/components/ui/input";

const DECIMAL_RE = /^\d*\.?\d*$/;

/** Input decimal sin flechas: solo dígitos y un punto ("20", "17.5"). */
export function DecimalInput({
  value,
  onChange,
  placeholder,
  list,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type" | "onChange" | "value"> & {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      list={list}
      placeholder={placeholder}
      onChange={(e) => {
        const next = e.target.value;
        if (DECIMAL_RE.test(next)) onChange(next);
      }}
      {...props}
    />
  );
}

const PCT_STEPS = Array.from({ length: 19 }, (_, i) => String((i + 1) * 5)); // 5…95

/** Porcentaje con sugerencias de 5 en 5 (5, 10, …, 95) vía datalist: al hacer
 * clic aparece el desplegable y se puede seguir tipeando libremente
 * (incluidos decimales con "."). */
export function PercentInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const listId = useId();
  return (
    <>
      <DecimalInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        list={listId}
      />
      <datalist id={listId}>
        {PCT_STEPS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </>
  );
}
