export type Segment = 'Premier' | 'Private';
export type Tier = 'Priority' | 'Signature';
export type Approach = 'Notify' | 'Contextualise' | 'Review';
export type GateId = 'eligibility' | 'suitability' | 'permission' | 'mnpi';
export type GateStatus = 'pass' | 'block';
export type SignalRecency = 'Today' | 'Yesterday' | 'Internal';

export interface Product {
  id: string;
  name: string;
  entity: string;
  family: string;
}

export interface Driver {
  id: string;
  label: string;
  detail: string;
  date: string;
  recency: SignalRecency;
}

export interface Holding {
  label: string;
  value: number;
  note: string;
  source: string;
}

export interface OpportunityNarrative {
  whatHappened: string;
  whyThisClient: string;
  whatItMeans: string;
  whatToDo: string;
}

export interface RiskProfile {
  rating: string;
  horizon: string;
  lossTolerance: string;
  lastAssessed: string;
  notes: string;
}

export interface ComplaintRecord {
  date: string;
  channel: string;
  summary: string;
  status: 'Open' | 'Closed';
}

export interface CrossBorderProfile {
  operatingCountries: string[];
  investmentLocations: string[];
  transactionCorridors: string[];
  treasuryExposures: string[];
  relationshipFootprint: string[];
}

export interface Client {
  id: string;
  name: string;
  segment: Segment;
  tier: Tier;
  rm: string;
  mandate: string;
  risk: string;
  kyc: { status: string; expiry: string };
  suitability: { lastReview: string };
  holdings: Holding[];
  concentration: { pct: number; threshold: number; name: string } | null;
  idleCash: { days: number; threshold: number; source: string } | null;
  incomeObjective: { target: number; actual: number; unit: string; source: string } | null;
  crossBorder: CrossBorderProfile | null;
  riskProfile: RiskProfile;
  complaints: ComplaintRecord[];
}

export interface GateOverride {
  gate: GateId;
  reason: string;
}

export interface Opportunity {
  id: string;
  clientId: string;
  approach: Approach;
  productId: string;
  driverId: string | null;
  signal: { recency: SignalRecency; headline: string };
  amountAtStake: number;
  daysToAct: number;
  whyClient: string;
  whyNow: string;
  whyInstrument: string;
  narrative: OpportunityNarrative;
  gateOverride: GateOverride | null;
}

export interface GateRow {
  gate: GateId;
  label: string;
  status: GateStatus;
  reason: string;
}

export interface GateResult {
  rows: GateRow[];
  blocked: boolean;
  blockingGate: GateId | null;
}

export type CheckStatus = 'pass' | 'flag' | 'fail';
export interface CoachCheck {
  rule: string;
  status: CheckStatus;
  detail: string;
}

export interface LedgerEntry {
  ts: string;
  clientId: string;
  kind: 'Sent' | 'Non-send';
  detail: string;
  ref: string | null;
}

export type ImpactSeverity = 'high' | 'medium' | 'low';
export type ImpactBasis = 'confirmed' | 'inferred';

export interface NewsImpact {
  clientId: string;
  severity: ImpactSeverity;
  basis: ImpactBasis;
  reason: string;
}

export type NewsFlag = 'priority' | 'elevated' | 'standard';

export interface NewsItem {
  id: string;
  headline: string;
  detail: string;
  date: string;
  recency: SignalRecency;
  impacts: NewsImpact[];
  flag: NewsFlag;
}

export type MomentumImpact = 'favorable' | 'adverse';
export type MomentumLevel = 'high' | 'low';

export interface MomentumDay {
  date: string;
  impact: MomentumImpact;
  note: string;
}

export interface MomentumTheme {
  id: string;
  label: string;
  detail: string;
  driverId: string | null;
  clientIds: string[];
  days: MomentumDay[];
}

