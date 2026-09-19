import clientsData from './data/clients.json';
import driversData from './data/drivers.json';
import type { Client, Driver, LedgerEntry } from './types';
import type { RouteId, RoutedMap } from './lib/routing';
import type { ChatMessage, DraftSpec } from './lib/assistant';

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
  clientOrigin: Tab;
  dismissed: Record<string, string>;
  routed: RoutedMap;
  ledger: LedgerEntry[];
  draftByClient: Record<string, string>;
  outreachClientId: string;
  chatByClient: Record<string, ChatMessage[]>;
  specByClient: Record<string, DraftSpec>;
}

const SEED_DRAFT_CHEN =
  "Hi Mr Chen,\n\nJust a heads up that your SGD 500,000 fixed deposit is coming due soon. Rates are looking great right now so I'd recommend locking in a new structured deposit today — don't miss this window!\n\nBest,\nAisha";

export function initialState(): AppState {
  return {
    tab: 'queue',
    selectedClientId: null,
    clientOrigin: 'clients',
    dismissed: {},
    routed: {},
    ledger: [],
    draftByClient: { chen: SEED_DRAFT_CHEN },
    outreachClientId: 'chen',
    chatByClient: {},
    specByClient: {},
  };
}

export type Action =
  | { type: 'SET_TAB'; tab: Tab }
  | { type: 'OPEN_CLIENT'; id: string }
  | { type: 'BACK_CLIENTS' }
  | { type: 'DISMISS'; id: string; reason: string }
  | { type: 'ROUTE_OPPORTUNITY'; id: string; route: RouteId; note: string }
  | { type: 'DRAFT_SET_TEXT'; clientId: string; text: string }
  | { type: 'SET_OUTREACH_CLIENT'; id: string }
  | { type: 'CHAT_APPEND'; clientId: string; message: ChatMessage }
  | { type: 'SET_DRAFT_SPEC'; clientId: string; spec: DraftSpec }
  | { type: 'OUTREACH_SEND'; entry: LedgerEntry }
  | { type: 'OUTREACH_NOSEND'; entry: LedgerEntry };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, tab: action.tab, selectedClientId: action.tab === 'clients' ? state.selectedClientId : null };
    case 'OPEN_CLIENT':
      return { ...state, tab: 'clients', selectedClientId: action.id, clientOrigin: state.tab };
    case 'BACK_CLIENTS':
      return { ...state, tab: state.clientOrigin, selectedClientId: null };
    case 'DISMISS':
      return { ...state, dismissed: { ...state.dismissed, [action.id]: action.reason } };
    case 'ROUTE_OPPORTUNITY':
      return { ...state, routed: { ...state.routed, [action.id]: { route: action.route, note: action.note } } };
    case 'DRAFT_SET_TEXT':
      return { ...state, draftByClient: { ...state.draftByClient, [action.clientId]: action.text } };
    case 'SET_OUTREACH_CLIENT':
      return { ...state, outreachClientId: action.id };
    case 'OUTREACH_SEND':
    case 'OUTREACH_NOSEND':
      return { ...state, ledger: [...state.ledger, action.entry] };
    case 'CHAT_APPEND':
      return {
        ...state,
        chatByClient: {
          ...state.chatByClient,
          [action.clientId]: [...(state.chatByClient[action.clientId] ?? []), action.message],
        },
      };
    case 'SET_DRAFT_SPEC':
      return { ...state, specByClient: { ...state.specByClient, [action.clientId]: action.spec } };
    default:
      return state;
  }
}
