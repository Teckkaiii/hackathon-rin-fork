import { useReducer } from 'react';
import { reducer, initialState, CURRENT_RM } from './state';
import { Nav } from './components/Nav';
import { QueueView } from './components/QueueView';
import { ClientsView } from './components/ClientsView';
import { ClientDetail } from './components/ClientDetail';
import { BlockedView } from './components/BlockedView';
import { OutreachView } from './components/OutreachView';
import { NewsView } from './components/NewsView';
import { PastWeekView } from './components/PastWeekView';

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  return (
    <>
      <div className="h-1 bg-gradient-to-r from-[#EE3A2E] via-red to-red-deep" />
      <header className="bg-white/85 backdrop-blur-glass border-b border-hairline sticky top-0 z-40">
        <div className="max-w-[1160px] mx-auto px-5 flex items-center gap-4 py-3.5 flex-wrap">
          <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#EE3A2E] via-red to-red-deep text-white flex items-center justify-center font-bold text-[15px] shadow-glass flex-none">
            RIN
          </div>
          <div>
            <div className="font-serif text-[19px] leading-none text-ink">Revenue Intelligence Network</div>
            <div className="t-meta">Premier &amp; Private Banking · daily decision layer</div>
          </div>
          <Nav tab={state.tab} onChange={tab => dispatch({ type: 'SET_TAB', tab })} />
          <span className="t-meta font-semibold flex-none">
            RM: {CURRENT_RM}
          </span>
          <span className="text-[11.5px] font-semibold text-red-deep bg-red-wash px-2.5 py-1 rounded-full flex-none">
            Synthetic prototype
          </span>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-5 py-8 pb-20">
        {state.tab === 'queue' && <QueueView state={state} dispatch={dispatch} />}
        {state.tab === 'clients' && (
          state.selectedClientId
            ? <ClientDetail
                clientId={state.selectedClientId}
                onBack={() => dispatch({ type: 'BACK_CLIENTS' })}
                backLabel={state.clientOrigin === 'queue' ? 'Back to queue' : 'All clients'}
              />
            : <ClientsView onOpenClient={id => dispatch({ type: 'OPEN_CLIENT', id })} />
        )}
        {state.tab === 'blocked' && <BlockedView />}
        {state.tab === 'outreach' && <OutreachView state={state} dispatch={dispatch} />}
        {state.tab === 'news' && <NewsView />}
        {state.tab === 'pastweek' && <PastWeekView />}
      </main>

      <div className="max-w-[1160px] mx-auto px-5 py-4 border-t border-hairline-2 text-center t-meta">
        Synthetic data throughout. RIN surfaces and explains; it does not price, advise, or send without RM approval.
      </div>
    </>
  );
}
