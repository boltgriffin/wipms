/**
 * Find a place by typing its address.
 *
 * There is no search-as-you-type here, and that is on purpose rather than for want of effort.
 * OpenStreetMap's free search allows one request a second for an entire application, and an
 * autocomplete turns a single address into eight or ten of them. A school that shipped one would
 * have its searches throttled within a week. So the search runs when someone presses Enter or the
 * button, and the results stay on screen until they pick one.
 *
 * Nothing here is required. Philippine coverage in OpenStreetMap is good for roads and towns and
 * patchy for puroks and newer barangays, so a search that finds nothing is an ordinary outcome, not
 * a fault — the map underneath is always there to drop a pin on by hand.
 */
import { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { searchAddress } from '../services/nominatim';
import { inputCls } from './ui';

export default function AddressSearch({ onPick, placeholder = 'Search an address, barangay or landmark', label = 'Search for a place' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const abort = useRef(null);

  useEffect(() => () => abort.current?.abort(), []);

  const run = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setError(''); setResults(null);
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setBusy(true);
    try {
      const found = await searchAddress(q, { signal: ctl.signal });
      setResults(found);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      if (abort.current === ctl) setBusy(false);
    }
  };

  const choose = (r) => { setResults(null); setQ(r.label); onPick(r); };

  return (
    <div>
      {/* a plain div, not a form: this sits inside the institution form and must not submit it */}
      <label className="block text-sm font-medium" htmlFor="addr-q">{label}</label>
      <div className="mt-1 flex gap-2">
        <input id="addr-q" className={inputCls} value={q} placeholder={placeholder}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } }} />
        <button type="button" onClick={run} disabled={busy || q.trim().length < 3}
          className="inline-flex shrink-0 items-center gap-1.5 rounded border border-forest-800 px-3 py-2 text-sm font-semibold disabled:opacity-50">
          <Search size={15} aria-hidden="true" />{busy ? 'Searching...' : 'Search'}
        </button>
      </div>
      <p className="mt-1 text-xs text-forest-700">Press Search when you have typed the address. You can also just tap the map below.</p>

      {error && <p role="alert" className="mt-2 rounded bg-amber-50 p-2.5 text-sm">{error}</p>}

      {results && results.length === 0 && (
        <p role="status" className="mt-2 rounded bg-amber-50 p-2.5 text-sm">
          Nothing was found for that. Many puroks and newer barangays are not in OpenStreetMap — try the
          barangay and municipality on their own, or tap the spot on the map.
        </p>)}

      {results && results.length > 0 && (
        <ul className="mt-2 max-h-56 divide-y divide-forest-100 overflow-y-auto rounded border border-forest-100">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => choose(r)}
                className="flex w-full items-start gap-2 p-2.5 text-left text-sm hover:bg-forest-100/50">
                <MapPin size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-forest-700" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.label.split(',')[0]}</span>
                  <span className="block text-xs text-forest-700">{r.label}</span>
                </span>
              </button>
            </li>))}
        </ul>)}
    </div>
  );
}
