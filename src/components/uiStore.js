import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Whether the device itself is set to dark. Guarded so it is safe before the browser exists. */
export const prefersDark = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

/**
 * Sidebar and theme choices, kept per browser. "system" follows the device setting, so the device's
 * own preference is tracked here as state rather than being re-read during a render: components need
 * to re-render when it changes, and reading the <html> class instead gives a stale answer, because a
 * render always happens before the effect that writes that class.
 */
export const useUiStore = create(persist((set, get) => ({
  collapsed: false,
  theme: 'system', // system | light | dark
  systemDark: prefersDark(),
  toggleSidebar: () => set({ collapsed: !get().collapsed }),
  setTheme: (theme) => set({ theme }),
  setSystemDark: (systemDark) => set({ systemDark })
  // systemDark is left out of partialize on purpose: it is read from the device on every load.
}), { name: 'wipms-ui', partialize: (s) => ({ collapsed: s.collapsed, theme: s.theme }) }));

/** The theme actually on screen, which is what a toggle must flip. */
export const resolveTheme = (theme, systemDark) =>
  (theme === 'dark' || (theme === 'system' && systemDark) ? 'dark' : 'light');

/** Subscribes, so the icon in the header changes with the theme instead of lagging a click behind. */
export const useIsDark = () => useUiStore((s) => resolveTheme(s.theme, s.systemDark) === 'dark');

/**
 * Writes the theme onto <html>. Three things, not one: the `dark` class drives Tailwind's dark:
 * variants, `data-theme` lets the stylesheet state the chosen theme positively (light is then a rule
 * that wins on specificity, rather than merely the absence of a class), and colorScheme fixes the
 * native form controls and scrollbars.
 */
export function applyTheme(theme, systemDark) {
  const mode = resolveTheme(theme, systemDark === undefined ? prefersDark() : systemDark);
  const el = document.documentElement;
  el.classList.toggle('dark', mode === 'dark');
  el.dataset.theme = mode;
  el.style.colorScheme = mode;
  return mode === 'dark';
}

/**
 * Keeps <html> in step with the store from outside React. Subscribing here rather than from an effect
 * in a component means the theme is applied even on screens that do not mount the shell, and cannot be
 * missed because nothing happened to re-render. Call once, from main.jsx, before the first render.
 */
export function initTheme() {
  const write = (s) => applyTheme(s.theme, s.systemDark);
  write(useUiStore.getState());
  useUiStore.subscribe(write);
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = (e) => useUiStore.getState().setSystemDark(e.matches);
    mq.addEventListener('change', on);
    useUiStore.getState().setSystemDark(mq.matches); // the rehydrated value can be from another device
  }
}
