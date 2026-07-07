// Esquemas Zod de los formularios (react-hook-form). Los campos numéricos se
// mantienen como strings (su representación natural en HTML) y los mappers del
// final los convierten — así se evitan los desfases de tipos de z.coerce con RHF.
// Los porcentajes se ingresan como porcentaje (20) y los mappers los convierten
// al decimal del API (0.20).
import { z } from "zod";
import { percentToDecimalString } from "@/lib/format";
import type {
  AdditionalCharge,
  ClientCreate,
  GraceCode,
  LoanCreate,
  RateSegment,
  VehicleCreate,
} from "@/lib/api/types";

const required = "Este campo es obligatorio";

interface NumOpts {
  int?: boolean;
  min?: number;
  max?: number;
  gt?: number;
  lt?: number;
}

/** Campo numérico obligatorio representado como string con validación numérica. */
function numStr(opts: NumOpts = {}) {
  return z.string().superRefine((val, ctx) => {
    if (val.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: required });
      return;
    }
    const n = Number(val);
    if (Number.isNaN(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresa un número válido" });
      return;
    }
    if (opts.int && !Number.isInteger(n))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe ser un número entero" });
    if (opts.min !== undefined && n < opts.min)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Mínimo ${opts.min}` });
    if (opts.max !== undefined && n > opts.max)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Máximo ${opts.max}` });
    if (opts.gt !== undefined && n <= opts.gt)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Debe ser mayor que ${opts.gt}` });
    if (opts.lt !== undefined && n >= opts.lt)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Debe ser menor que ${opts.lt}` });
  });
}

// ---- Auth ----

export const loginSchema = z.object({
  email: z.string().min(1, required).email("Correo electrónico inválido"),
  password: z.string().min(1, required),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  full_name: z.string().min(1, required).max(255),
  email: z.string().min(1, required).email("Correo electrónico inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128, "Máximo 128 caracteres"),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

// ---- Clientes ----

export const clientSchema = z.object({
  full_name: z.string().min(1, required).max(255),
  document_id: z.string().min(1, required).max(50),
  email: z.string().min(1, required).email("Correo electrónico inválido"),
  phone: z.string().max(50, "Máximo 50 caracteres").optional().or(z.literal("")),
});
export type ClientFormValues = z.infer<typeof clientSchema>;

export const clientUpdateSchema = z.object({
  full_name: z.string().min(1, required).max(255),
  document_id: z.string().min(1, required).max(50),
  email: z.string().min(1, required).email("Correo electrónico inválido"),
  phone: z.string().max(50).optional().or(z.literal("")),
});
export type ClientUpdateFormValues = z.infer<typeof clientUpdateSchema>;

// ---- Vehículos ----

export const vehicleSchema = z.object({
  brand: z.string().min(1, required).max(100),
  model: z.string().min(1, required).max(100),
  year: numStr({ int: true, min: 1900, max: 2100 }),
  list_price: numStr({ gt: 0 }),
  currency: z.enum(["PEN", "USD"]),
});
export type VehicleFormValues = z.infer<typeof vehicleSchema>;


// ---- Préstamos ----

export const rateSegmentSchema = z
  .object({
    from_period: numStr({ int: true, min: 1 }),
    to_period: numStr({ int: true, min: 1 }),
    rate_kind: z.enum(["TEA", "TNA"]),
    rate_value: numStr({ min: 0 }), // en porcentaje
    capitalizations_per_year: z.string(), // "" cuando es TEA
  })
  .superRefine((s, ctx) => {
    if (Number(s.to_period) < Number(s.from_period)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El período final debe ser ≥ al inicial",
        path: ["to_period"],
      });
    }
    if (s.rate_kind === "TNA") {
      const cap = Number(s.capitalizations_per_year);
      if (s.capitalizations_per_year.trim() === "" || Number.isNaN(cap) || cap <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Indica las capitalizaciones por año",
          path: ["capitalizations_per_year"],
        });
      }
    }
  });
export type RateSegmentFormValues = z.infer<typeof rateSegmentSchema>;

export const additionalChargeSchema = z.object({
  name: z.string().min(1, required),
  kind: z.enum(["seguro", "comision", "portes", "otro"]),
  basis: z.enum(["fixed", "balance_pct", "payment_pct"]),
  value: numStr({ min: 0 }),
  applies_from_period: numStr({ int: true, min: 1 }),
  applies_to_period: z.string(), // "" = hasta el final
});
export type AdditionalChargeFormValues = z.infer<typeof additionalChargeSchema>;

export const loanSchema = z
  .object({
    client_id: z.string().min(1, "Selecciona un cliente"),
    vehicle_id: z.string().min(1, "Selecciona un vehículo"),
    currency: z.enum(["PEN", "USD"]),
    vehicle_price: numStr({ gt: 0 }),
    initial_payment_pct: numStr({ min: 0, lt: 100 }), // en porcentaje
    balloon_pct: numStr({ min: 0, lt: 100 }), // en porcentaje
    term_periods: numStr({ int: true, gt: 0 }),
    frequency_days: numStr({ int: true, gt: 0 }),
    rate_segments: z.array(rateSegmentSchema).min(1, "Agrega al menos un tramo de tasa"),
    grace_periods: z.array(z.enum(["S", "P", "T"])),
    additional_charges: z.array(additionalChargeSchema),
  })
  .superRefine((v, ctx) => {
    const n = Number(v.term_periods);
    if (!Number.isInteger(n) || n <= 0) return; // el error del plazo ya se reportó

    if (v.grace_periods.length !== n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Debe haber exactamente ${n} períodos de gracia (hay ${v.grace_periods.length}).`,
        path: ["grace_periods"],
      });
    }

    const segs = [...v.rate_segments]
      .map((s) => ({ from: Number(s.from_period), to: Number(s.to_period) }))
      .sort((a, b) => a.from - b.from);
    let expected = 1;
    for (const s of segs) {
      if (s.from !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Los tramos de tasa deben ser contiguos: se esperaba un tramo que inicie en el período ${expected}.`,
          path: ["rate_segments"],
        });
        return;
      }
      expected = s.to + 1;
    }
    if (expected !== n + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Los tramos de tasa deben cubrir todos los períodos (1 a ${n}).`,
        path: ["rate_segments"],
      });
    }
  });
export type LoanFormValues = z.infer<typeof loanSchema>;

// ---- Mappers: valores del formulario -> payloads del API ----

export function toClientCreate(v: ClientFormValues): ClientCreate {
  return {
    full_name: v.full_name,
    document_id: v.document_id,
    email: v.email,
    ...(v.phone ? { phone: v.phone } : {}),
  };
}

export function toVehicleCreate(v: VehicleFormValues): VehicleCreate {
  return {
    brand: v.brand,
    model: v.model,
    year: Number(v.year),
    list_price: String(Number(v.list_price)),
    currency: v.currency,
  };
}

function toRateSegment(s: RateSegmentFormValues): RateSegment {
  return {
    from_period: Number(s.from_period),
    to_period: Number(s.to_period),
    rate_kind: s.rate_kind,
    rate_value: percentToDecimalString(Number(s.rate_value)),
    capitalizations_per_year:
      s.rate_kind === "TNA" ? Number(s.capitalizations_per_year) : null,
  };
}

function toCharge(c: AdditionalChargeFormValues): AdditionalCharge {
  const value =
    c.basis === "fixed"
      ? String(Number(c.value))
      : percentToDecimalString(Number(c.value));
  return {
    name: c.name,
    kind: c.kind,
    basis: c.basis,
    value,
    applies_from_period: Number(c.applies_from_period),
    applies_to_period:
      c.applies_to_period.trim() === "" ? null : Number(c.applies_to_period),
  };
}

export function toLoanCreate(v: LoanFormValues): LoanCreate {
  return {
    client_id: v.client_id,
    vehicle_id: v.vehicle_id,
    currency: v.currency,
    vehicle_price: String(Number(v.vehicle_price)),
    initial_payment_pct: percentToDecimalString(Number(v.initial_payment_pct)),
    balloon_pct: percentToDecimalString(Number(v.balloon_pct)),
    term_periods: Number(v.term_periods),
    frequency_days: Number(v.frequency_days),
    rate_segments: v.rate_segments.map(toRateSegment),
    grace_periods: v.grace_periods as GraceCode[],
    additional_charges: v.additional_charges.map(toCharge),
  };
}
