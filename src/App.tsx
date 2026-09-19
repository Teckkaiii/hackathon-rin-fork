import { useReducer } from 'react';
import { reducer, initialState } from './state';
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
      <div className="h-[3px] bg-red" />
      <header className="bg-card border-b border-hairline sticky top-0 z-40">
        <div className="max-w-[1160px] mx-auto px-5 flex items-center gap-4 py-3.5 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red to-red-deep text-white flex items-center justify-center font-bold text-[15px] tracking-wide flex-none shadow-glow-sm">
            RIN
          </div>
          <div>
            <div className="font-sans font-extrabold text-[20px] leading-none tracking-tight text-ink">RIN</div>
            <div className="t-meta">Revenue Intelligence Network · daily decision layer</div>
          </div>
          <Nav tab={state.tab} onChange={tab => dispatch({ type: 'SET_TAB', tab })} />
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
        {state.tab === 'news' && <NewsView onOpenClient={id => dispatch({ type: 'OPEN_CLIENT', id })} />}
        {state.tab === 'pastweek' && <PastWeekView />}
      </main>

      <div className="max-w-[1160px] mx-auto px-5 py-4 border-t border-hairline-2 text-center t-meta">
        Synthetic data throughout. RIN surfaces and explains; it does not price, advise, or send without RM approval.
      </div>
    </>
  );
}
