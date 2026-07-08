// Esquemas Zod de los formularios (react-hook-form). Los campos numéricos se
// mantienen como strings (su representación natural en HTML) y los mappers del
// final los convierten — así se evitan los desfases de tipos de z.coerce con RHF.
// Los porcentajes se ingresan como porcentaje (20) y los mappers los convierten
// al decimal del API (0.20).
import { z } from "zod";
import { percentToDecimalString } from "@/lib/format";
import { INITIAL_COST_CONCEPTS, initialCostConceptLabel } from "@/lib/loan-domain";
import type {
  AdditionalCharge,
  ClientCreate,
  GraceCode,
  InitialCost,
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
  basis: z.enum(["fixed", "balance_pct", "payment_pct", "vehicle_pct_annual"]),
  value: numStr({ min: 0 }),
  applies_from_period: numStr({ int: true, min: 1 }),
  applies_to_period: z.string(), // "" = hasta el final
});
export type AdditionalChargeFormValues = z.infer<typeof additionalChargeSchema>;

// Costo/gasto inicial (una sola vez): concepto de catálogo, monto y forma de
// pago. "otro" exige nombre libre; el resto usa la etiqueta del catálogo.
export const initialCostSchema = z
  .object({
    concept: z.enum(["notariales", "registrales", "tasacion", "estudio", "activacion", "otro"]),
    name: z.string(),
    amount: numStr({ min: 0 }),
    payment: z.enum(["financiado", "contado"]),
  })
  .superRefine((c, ctx) => {
    if (c.concept === "otro" && c.name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: required,
        path: ["name"],
      });
    }
  });
export type InitialCostFormValues = z.infer<typeof initialCostSchema>;

export const loanSchema = z
  .object({
    client_id: z.string().min(1, "Selecciona un cliente"),
    vehicle_id: z.string().min(1, "Selecciona un vehículo"),
    currency: z.enum(["PEN", "USD"]),
    vehicle_price: numStr({ gt: 0 }),
    // Obligatorias, en porcentaje y sin negativos (Compra Inteligente
    // siempre tiene cuota inicial y cuota final).
    initial_payment_pct: numStr({ gt: 0, lt: 100 }), // en porcentaje
    balloon_pct: numStr({ gt: 0, lt: 100 }), // en porcentaje
    term_periods: numStr({ int: true, gt: 0 }),
    frequency_days: numStr({ int: true, gt: 0 }),
    // Costos/gastos iniciales (una sola vez). El API deriva financed_costs
    // como la suma de los marcados «financiado».
    initial_costs: z.array(initialCostSchema),
    // Seguro de desgravamen OBLIGATORIO: % mensual del saldo o monto fijo
    // por mes (el monto fijo viaja al API como cargo adicional "seguro").
    seguro_tipo: z.enum(["porcentaje", "fijo"]),
    seguro_valor: numStr({ min: 0 }),
    rate_segments: z.array(rateSegmentSchema).min(1, "Agrega al menos un tramo de tasa"),
    grace_periods: z.array(z.enum(["S", "P", "T"])),
    additional_charges: z.array(additionalChargeSchema),
  })
  .superRefine((v, ctx) => {
    // El seguro en % mensual debe ser menor que 100 %.
    if (v.seguro_tipo === "porcentaje" && Number(v.seguro_valor) >= 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe ser menor que 100",
        path: ["seguro_valor"],
      });
    }

    // (4.6) La cuota inicial y el balón no pueden sumar el precio completo.
    const ci = Number(v.initial_payment_pct) || 0;
    const cf = Number(v.balloon_pct) || 0;
    if (ci + cf >= 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cuota inicial + cuota balón debe ser menor que 100%.",
        path: ["balloon_pct"],
      });
    }

    const n = Number(v.term_periods);
    if (!Number.isInteger(n) || n <= 0) return; // el error del plazo ya se reportó

    // (4.18) Con cuota balón, el último período debe amortizar (gracia "S").
    if (cf > 0 && v.grace_periods.length === n && v.grace_periods[n - 1] !== "S") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Con cuota balón, el último período no puede tener gracia (debe ser Normal).",
        path: ["grace_periods"],
      });
    }

    // (4.21/4.22) Los rangos de los cargos deben caer dentro del plazo.
    v.additional_charges.forEach((c, i) => {
      const from = Number(c.applies_from_period);
      const to = c.applies_to_period.trim() === "" ? null : Number(c.applies_to_period);
      if (Number.isInteger(from) && from > n) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Debe ser ≤ ${n} (el plazo).`,
          path: ["additional_charges", i, "applies_from_period"],
        });
      }
      if (to !== null && Number.isInteger(to)) {
        if (to < from) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe ser ≥ al período inicial.",
            path: ["additional_charges", i, "applies_to_period"],
          });
        } else if (to > n) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Debe ser ≤ ${n} (el plazo).`,
            path: ["additional_charges", i, "applies_to_period"],
          });
        }
      }
    });

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

/** Nombre reservado del cargo que representa el seguro de monto fijo mensual
 * (permite reconstruir el campo «Seguro» al editar la simulación). */
export const SEGURO_FIJO_NAME = "Seguro desgravamen (fijo mensual)";

function toInitialCost(c: InitialCostFormValues): InitialCost {
  return {
    name: c.concept === "otro" ? c.name.trim() : initialCostConceptLabel(c.concept),
    amount: String(Number(c.amount)),
    financed: c.payment === "financiado",
  };
}

/** API → formulario: recupera el concepto del catálogo por su etiqueta; lo
 * que no calce vuelve como "otro" con el nombre guardado. */
export function initialCostToForm(c: InitialCost): InitialCostFormValues {
  const concept = INITIAL_COST_CONCEPTS.find(
    (k) => k.value !== "otro" && k.label === c.name,
  )?.value as InitialCostFormValues["concept"] | undefined;
  return {
    concept: concept ?? "otro",
    name: concept ? "" : c.name,
    amount: String(Number(c.amount)),
    payment: c.financed ? "financiado" : "contado",
  };
}

/** Préstamos guardados ANTES del desglose: solo traen el total financiado;
 * se reconstruye como una única fila «Otro (financiado)». */
export function legacyFinancedCostsToForm(financedCosts: string): InitialCostFormValues[] {
  const total = Number(financedCosts) || 0;
  if (total <= 0) return [];
  return [
    {
      concept: "otro",
      name: "Costes financiados (sin desglose)",
      amount: String(total),
      payment: "financiado",
    },
  ];
}

export function toLoanCreate(v: LoanFormValues): LoanCreate {
  // Seguro fijo mensual: viaja como cargo adicional; el porcentaje viaja
  // como desgravamen dentro de la cuota (modelo Interbank).
  const charges = v.additional_charges.map(toCharge);
  if (v.seguro_tipo === "fijo" && Number(v.seguro_valor) > 0) {
    charges.push({
      name: SEGURO_FIJO_NAME,
      kind: "seguro",
      basis: "fixed",
      value: String(Number(v.seguro_valor)),
      applies_from_period: 1,
      applies_to_period: null,
    });
  }
  return {
    client_id: v.client_id,
    vehicle_id: v.vehicle_id,
    currency: v.currency,
    vehicle_price: String(Number(v.vehicle_price)),
    initial_payment_pct: percentToDecimalString(Number(v.initial_payment_pct)),
    balloon_pct: percentToDecimalString(Number(v.balloon_pct)),
    term_periods: Number(v.term_periods),
    frequency_days: Number(v.frequency_days),
    // El API deriva financed_costs del desglose; este "0" solo aplica si la
    // lista llega vacía (sin costos iniciales).
    financed_costs: "0",
    initial_costs: v.initial_costs.map(toInitialCost),
    desgravamen_monthly_pct:
      v.seguro_tipo === "porcentaje"
        ? percentToDecimalString(Number(v.seguro_valor))
        : "0",
    rate_segments: v.rate_segments.map(toRateSegment),
    grace_periods: v.grace_periods as GraceCode[],
    additional_charges: charges,
  };
}
