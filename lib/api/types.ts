// Refleja el contrato del backend Compra Inteligente (ver API.md).
// Montos y tasas viajan como strings para no perder precisión decimal.
// Fracciones en 0..1: "0.20" = 20 %.

export type Currency = "PEN" | "USD";
export type RateKind = "TEA" | "TNA";
// S = sin gracia (normal), P = parcial (solo interés), T = total (capitaliza)
export type GraceCode = "S" | "P" | "T";
export type ChargeKind = "seguro" | "comision" | "portes" | "otro";
export type ChargeBasis = "fixed" | "balance_pct" | "payment_pct";
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
  charges: ChargeAmount[];
  charges_total: string;
  total_payment: string;
}

export interface Schedule {
  loan_id: string;
  rows: ScheduleRow[];
}

export interface Indicators {
  loan_id: string;
  tir_per_period: string;
  tcea: string;
  van_at_period_rate: string | null;
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
