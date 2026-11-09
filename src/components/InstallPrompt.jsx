/**
 * The install card, and the only honest version of it on each platform.
 *
 * On Android, Windows, macOS Chrome/Edge and Chromebooks there is a real button: the browser handed
 * us an install event and pressing it installs the app.
 *
 * On iPhone and iPad there is no such button and there never has been — Safari does not implement
 * `beforeinstallprompt`, so no web page can install itself. A button there would do nothing, so the
 * card shows the three taps that do work instead. Students are told to install the app so it opens
 * without a signal, and sending them to a dead button would quietly cost them that.
 */
import { useEffect, useState } from 'react';
import { Download, Share, Plus, X } from 'lucide-react';
import AppLogo from './AppLogo';
import { promptInstall, snoozeInstall, subscribeInstall } from '../offline/install';

export default function InstallPrompt() {
  const [s, setS] = useState({ installed: false, mode: 'none', snoozed: true });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => subscribeInstall(setS), []);
  if (dismissed || s.installed || s.snoozed || s.mode === 'none') return null;

  const later = () => { snoozeInstall(); setDismissed(true); };

  return (
    <div role="region" aria-label="Install this app"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-xl border border-forest-100 bg-surface p-4 shadow-lg sm:left-auto sm:right-4 sm:mx-0">
      <div className="flex items-start gap-3">
        <AppLogo size={36} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">Install Work Immersion App</h2>
          <p className="mt-1 text-xs text-forest-700">
            Install this application for faster access and offline attendance support.
          </p>

          {s.mode === 'manual' ? (
            <ol className="mt-3 space-y-1.5 text-xs">
              <li className="flex items-center gap-2"><Share size={14} aria-hidden="true" className="shrink-0" />1. Tap the Share button at the bottom of Safari</li>
              <li className="flex items-center gap-2"><Plus size={14} aria-hidden="true" className="shrink-0" />2. Choose <strong>Add to Home Screen</strong></li>
              <li className="flex items-center gap-2"><Download size={14} aria-hidden="true" className="shrink-0" />3. Tap <strong>Add</strong></li>
            </ol>
          ) : null}

          <div className="mt-4 flex gap-2">
            {s.mode === 'prompt' && (
              <button onClick={() => promptInstall().then(() => setDismissed(true))}
                className="flex-1 rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-forest-900 hover:bg-amber-600">
                Install
              </button>)}
            <button onClick={later} className="flex-1 rounded border border-forest-800 px-4 py-2 text-sm font-semibold">
              {s.mode === 'manual' ? 'Got it' : 'Later'}
            </button>
          </div>
        </div>
        <button onClick={later} aria-label="Close" className="shrink-0 text-forest-700 hover:text-ink"><X size={16} aria-hidden="true" /></button>
      </div>
    </div>
  );
}
