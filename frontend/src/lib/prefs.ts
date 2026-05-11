// 用户偏好:dark mode + locale。用 React 的 useSyncExternalStore 配合模块级订阅器,
// 这样多个组件调用 useTheme/useLocale 都共享同一个状态(之前用 useState 会各开一份,
// 切换 toggle 时只有那一个组件的副本变化,其他组件感知不到 → 语言切换看似失效)。

import { useSyncExternalStore } from 'react';

const THEME_KEY = 'swm:theme';
const LOCALE_KEY = 'swm:locale';

export type Theme = 'light' | 'dark';
export type Locale = 'zh' | 'en';

function detectTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(THEME_KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
  if (saved === 'zh' || saved === 'en') return saved;
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// ── 模块级状态 + 订阅器 ──────────────────────────────────
type Listener = () => void;

function makeStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set: (next: T) => {
      if (Object.is(value, next)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

const themeStore = makeStore<Theme>(detectTheme());
const localeStore = makeStore<Locale>(detectLocale());

// ── React hooks ────────────────────────────────────────
export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.get);
  const set = (t: Theme) => {
    localStorage.setItem(THEME_KEY, t);
    themeStore.set(t);
    applyTheme(t);
  };
  return [theme, set];
}

export function useLocale(): [Locale, (l: Locale) => void] {
  const locale = useSyncExternalStore(localeStore.subscribe, localeStore.get, localeStore.get);
  const set = (l: Locale) => {
    localStorage.setItem(LOCALE_KEY, l);
    localeStore.set(l);
  };
  return [locale, set];
}

// 启动时立刻应用 theme(避免初次加载白底闪)
export function bootstrapPrefs() {
  applyTheme(themeStore.get());
}
