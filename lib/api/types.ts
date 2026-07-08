// Refleja el contrato del backend Compra Inteligente (ver API.md).
// Montos y tasas viajan como strings para no perder precisión decimal.
// Fracciones en 0..1: "0.20" = 20 %.

export type Currency = "PEN" | "USD";
export type RateKind = "TEA" | "TNA";
// S = sin gracia (normal), P = parcial (solo interés), T = total (capitaliza)
export type GraceCode = "S" | "P" | "T";
export type ChargeKind = "seguro" | "comision" | "portes" | "otro";
export type ChargeBasis =
  | "fixed"
  | "balance_pct"
  | "payment_pct"
  | "vehicle_pct_annual";
export type LoanStatus = "draft" | "scheduled" | "active" | "cancelled";

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Client {
  id: string;
  owner_id: string;
  full_name: string;
  document_id: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface ClientCreate {
  full_name: string;
  document_id: string;
  email: string;
  phone?: string;
}

export interface ClientUpdate {
  full_name?: string;
  document_id?: string;
  email?: string;
  phone?: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  brand: string;
  model: string;
  year: number;
  list_price: string;
  currency: Currency;
  created_at: string;
}

export interface VehicleCreate {
  brand: string;
  model: string;
  year: number;
  list_price: string;
  currency: Currency;
}

export interface VehicleUpdate {
  brand?: string;
  model?: string;
  year?: number;
  list_price?: string;
  currency?: Currency;
}

export interface RateSegment {
  from_period: number;
  to_period: number;
  rate_kind: RateKind;
  rate_value: string;
  capitalizations_per_year: number | null;
}

export interface AdditionalCharge {
  name: string;
  kind: ChargeKind;
  basis: ChargeBasis;
  value: string;
  applies_from_period: number;
  applies_to_period: number | null;
}

/** Costo/gasto inicial (una sola vez): notariales, registrales, tasación…
 * `financed: true` se suma al préstamo; `false` («al contado») es
 * informativo y no entra a los flujos. */
export interface InitialCost {
  name: string;
  amount: string;
  financed: boolean;
}

export interface Loan {
  id: string;
  client_id: string;
  vehicle_id: string;
  currency: Currency;
  vehicle_price: string;
  initial_payment_pct: string;
  balloon_pct: string;
  term_periods: number;
  frequency_days: number;
  // Costes iniciales financiados (notariales, registrales…): se suman al
  // monto del préstamo. Modelo Interbank. Derivado del desglose
  // `initial_costs` cuando este existe.
  financed_costs: string;
  initial_costs: InitialCost[];
  // % MENSUAL del seguro de desgravamen sobre el saldo (va dentro de la cuota).
  desgravamen_monthly_pct: string;
  rate_segments: RateSegment[];
  grace_periods: GraceCode[];
  additional_charges: AdditionalCharge[];
  status: LoanStatus;
  created_at: string;
}

export interface LoanCreate {
  client_id: string;
  vehicle_id: string;
  currency: Currency;
  vehicle_price: string;
  initial_payment_pct: string;
  balloon_pct: string;
  term_periods: number;
  frequency_days: number;
  // Con desglose, el API deriva financed_costs = Σ ítems financiados.
  financed_costs: string;
  initial_costs: InitialCost[];
  desgravamen_monthly_pct: string;
  rate_segments: RateSegment[];
  grace_periods: GraceCode[];
  additional_charges: AdditionalCharge[];
}

export type LoanUpdate = Partial<
  Pick<
    LoanCreate,
    | "currency"
    | "vehicle_price"
    | "initial_payment_pct"
    | "balloon_pct"
    | "term_periods"
    | "frequency_days"
    | "financed_costs"
    | "initial_costs"
    | "desgravamen_monthly_pct"
    | "rate_segments"
    | "grace_periods"
    | "additional_charges"
  >
>;

/** Cargo evaluado en un período del cronograma (monto negativo: egreso). */
export interface ChargeAmount {
  name: string;
  kind: ChargeKind;
  amount: string;
}

export interface ScheduleRow {
  period: number;
  grace_type: GraceCode;
  initial_balance: string;
  interest: string;
  payment: string;
  amortization: string;
  final_balance: string;
  // Seguro de desgravamen del período (negativo). En períodos S ya está
  // DENTRO de `payment`; en gracia T/P se paga aparte (ver total_payment).
  insurance: string;
  // Sub-cronograma del cuotón (columnas SICF/ICF/SegDesCF/ACF/SFCF de la
  // hoja Interbank). Todos "0" cuando el plan no tiene cuota balón.
  balloon_initial: string;
  balloon_interest: string;
  balloon_insurance: string;
  balloon_amortization: string;
  balloon_final: string;
  charges: ChargeAmount[];
  charges_total: string;
  total_payment: string;
}

/** Cargo con su importe (positivo): por período o total según contexto. */
export interface ChargeSummaryItem {
  name: string;
  kind: ChargeKind;
  amount: string;
}

/** Suma CON SIGNO de cada columna monetaria (fila «Totales» de la tabla). */
export interface ColumnTotals {
  interest: string;
  payment: string;
  amortization: string;
  insurance: string;
  balloon_amortization: string;
  charges: string;
  total_payment: string;
}

/** Bloque «Resultados» calculado íntegramente por el API (la UI solo
 * renderiza; ningún cálculo financiero en el cliente). */
export interface ScheduleSummary {
  // … del financiamiento
  tea: string;
  tep: string;
  payments_per_year: number;
  total_payments: number;
  initial_payment: string;
  balloon: string;
  // Costos iniciales: financiados (dentro del préstamo) y al contado
  // (informativo: se pagan aparte en el desembolso).
  financed_costs: string;
  cash_costs: string;
  loan_principal: string;
  regular_principal: string;
  balloon_present_value: string;
  regular_payment: string;
  balloon_payment: string;
  has_balloon: boolean;
  // … de los costes/gastos periódicos
  desgravamen_pct_per_period: string;
  periodic_charges: ChargeSummaryItem[];
  // … totales por concepto (positivos)
  total_interest: string;
  total_amortization: string;
  total_insurance: string;
  total_charges: ChargeSummaryItem[];
  // pie de tabla (con signo)
  column_totals: ColumnTotals;
}

export interface Schedule {
  loan_id: string;
  rows: ScheduleRow[];
  summary: ScheduleSummary | null;
}

export interface Indicators {
  loan_id: string;
  tir_per_period: string;
  tcea: string;
  van_at_period_rate: string | null;
  // COKi usado para el VAN (eco de la conversión anual→período del servidor).
  discount_rate_per_period: string | null;
  cashflows: string[];
}

export interface Operation {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
}
