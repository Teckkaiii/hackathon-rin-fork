import clientsData from './data/clients.json';
import driversData from './data/drivers.json';
import type { Client, Driver, Approach, CoachCheck, LedgerEntry } from './types';
import { DEFAULT_FILTERS, type Filters } from './lib/filters';

export const CLIENTS = clientsData as Record<string, Client>;
export const DRIVERS = driversData as Record<string, Driver>;
export const CLIENT_LIST = Object.values(CLIENTS);

// RIN is a per-RM working surface: every view (Queue, Clients, Blocked,
// Outreach, News, Past Week) is scoped to the signed-in RM's own book.
export const CURRENT_RM = 'Aisha Rahman';
export const MY_CLIENTS = CLIENT_LIST.filter(c => c.rm === CURRENT_RM);
export const MY_CLIENT_IDS = new Set(MY_CLIENTS.map(c => c.id));

export type Tab = 'queue' | 'clients' | 'blocked' | 'outreach' | 'news' | 'pastweek';

export interface AppState {
  tab: Tab;
  selectedClientId: string | null;
  filters: Filters;
  parked: Set<string>;
  parkDates: Record<string, string>;
  dismissed: Record<string, string>;
  ledger: LedgerEntry[];
  draftByClient: Record<string, string>;
  draftResultByClient: Record<string, CoachCheck[] | undefined>;
  outreachClientId: string;
  outreachApproach: Approach | null;
}

const SEED_DRAFT_CHEN =
  "Hi Mr Chen,\n\nJust a heads up that your SGD 500,000 fixed deposit is coming due soon. Rates are looking great right now so I'd recommend locking in a new structured deposit today — don't miss this window!\n\nBest,\nAisha";

export function initialState(): AppState {
  return {
    tab: 'queue',
    selectedClientId: null,
    filters: { ...DEFAULT_FILTERS },
    parked: new Set(),
    parkDates: {},
    dismissed: {},
    ledger: [],
    draftByClient: { chen: SEED_DRAFT_CHEN },
    draftResultByClient: {},
    outreachClientId: 'chen',
    outreachApproach: null,
  };
}

export type Action =
  | { type: 'SET_TAB'; tab: Tab }
  | { type: 'OPEN_CLIENT'; id: string }
  | { type: 'BACK_CLIENTS' }
  | { type: 'SET_FILTER'; key: keyof Filters; value: string | number }
  | { type: 'PARK'; id: string; resurface: string }
  | { type: 'DISMISS'; id: string; reason: string }
  | { type: 'DRAFT_SET_TEXT'; clientId: string; text: string }
  | { type: 'DRAFT_REVIEW'; clientId: string; checks: CoachCheck[] }
  | { type: 'DRAFT_CLEAR'; clientId: string }
  | { type: 'DRAFT_ACCEPT'; clientId: string; text: string; checks: CoachCheck[] }
  | { type: 'DRAFT_REJECT'; clientId: string }
  | { type: 'SET_OUTREACH_CLIENT'; id: string }
  | { type: 'SET_APPROACH'; approach: Approach }
  | { type: 'OUTREACH_SEND'; entry: LedgerEntry }
  | { type: 'OUTREACH_NOSEND'; entry: LedgerEntry };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, tab: action.tab, selectedClientId: action.tab === 'clients' ? state.selectedClientId : null };
    case 'OPEN_CLIENT':
      return { ...state, tab: 'clients', selectedClientId: action.id };
    case 'BACK_CLIENTS':
      return { ...state, selectedClientId: null };
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } };
    case 'PARK': {
      const parked = new Set(state.parked);
      parked.add(action.id);
      return { ...state, parked, parkDates: { ...state.parkDates, [action.id]: action.resurface } };
    }
    case 'DISMISS':
      return { ...state, dismissed: { ...state.dismissed, [action.id]: action.reason } };
    case 'DRAFT_SET_TEXT':
      return { ...state, draftByClient: { ...state.draftByClient, [action.clientId]: action.text } };
    case 'DRAFT_REVIEW':
      return { ...state, draftResultByClient: { ...state.draftResultByClient, [action.clientId]: action.checks } };
    case 'DRAFT_CLEAR': {
      const draftResultByClient = { ...state.draftResultByClient };
      delete draftResultByClient[action.clientId];
      return { ...state, draftByClient: { ...state.draftByClient, [action.clientId]: '' }, draftResultByClient };
    }
    case 'DRAFT_ACCEPT':
      return {
        ...state,
        draftByClient: { ...state.draftByClient, [action.clientId]: action.text },
        draftResultByClient: { ...state.draftResultByClient, [action.clientId]: action.checks },
      };
    case 'DRAFT_REJECT': {
      const draftResultByClient = { ...state.draftResultByClient };
      delete draftResultByClient[action.clientId];
      return { ...state, draftResultByClient };
    }
    case 'SET_OUTREACH_CLIENT':
      return { ...state, outreachClientId: action.id, outreachApproach: null };
    case 'SET_APPROACH':
      return { ...state, outreachApproach: action.approach };
    case 'OUTREACH_SEND':
    case 'OUTREACH_NOSEND':
      return { ...state, ledger: [...state.ledger, action.entry] };
    default:
      return state;
  }
}
