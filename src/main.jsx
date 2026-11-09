import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import { useAuthStore } from './store/authStore';
import { initTheme } from './store/uiStore';
import { initServiceWorker } from './offline/sw';
import { CACHED_QUERIES, hydrateQueryCache, putDashboard } from './offline/cache';
import './index.css';

initTheme(); // keeps <html> in step with the theme choice, before anything renders
initServiceWorker();

// Any expired session, from any query or mutation, sends the user back to login.
// A network failure is not an expiry: offline, the session stays and the app keeps working.
const expire = (e) => {
  if (e?.code === 'UNAUTHORIZED') useAuthStore.setState({ token: null, user: null, stats: null, status: 'unauthenticated' });
};
const client = new QueryClient({
  queryCache: new QueryCache({ onError: expire }),
  mutationCache: new MutationCache({ onError: expire }),
  defaultOptions: { queries: { staleTime: 30000, refetchOnWindowFocus: false, retry: (n, e) => n < 1 && e?.code === 'NETWORK' } }
});

/**
 * Every fresh answer to one of the small student queries is written to the device, so the next
 * launch has something real to show before the network replies — or instead of it, at a site with
 * no signal. Only the queries named in CACHED_QUERIES are kept: reports, analytics and student
 * lists are left alone on purpose.
 */
const sameKey = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
client.getQueryCache().subscribe((event) => {
  if (event?.type !== 'updated' || event.action?.type !== 'success') return;
  const name = Object.keys(CACHED_QUERIES).find((n) => sameKey(CACHED_QUERIES[n], event.query.queryKey));
  const token = useAuthStore.getState().token;
  if (name && token) putDashboard(token, name, event.query.state.data);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
const render = () => root.render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter><App /></BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

// Paint the last known figures first, then let React Query refresh them. Capped at a quarter of a
// second: if the device's storage is slow or wedged, the app still starts, just without the cache.
const cutoff = new Promise((r) => setTimeout(r, 250));
Promise.race([hydrateQueryCache(client, useAuthStore.getState().token).catch(() => {}), cutoff]).then(render);
