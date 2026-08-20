import React, { createContext, useContext, useReducer,useCallback, useEffect, ReactNode } from 'react';
import { AppUser, AppTheme, UserRole } from '../types';
import { generateBrandShades, isValidHex } from '../lib/colorUtils';

const THEME_STORAGE_KEY = 'yenerp_theme';
const VALID_COLORS: AppTheme['color'][] = ['blue', 'teal', 'emerald', 'rose', 'slate', 'custom'];
const BRAND_VARS = ['--brand-50', '--brand-100', '--brand-500', '--brand-600', '--brand-700', '--brand-900'] as const;

function loadStoredTheme(): AppTheme {
  const fallback: AppTheme = { mode: 'light', color: 'blue', sidebarCompact: false };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const color = VALID_COLORS.includes(parsed.color) ? parsed.color : 'blue';
    const customColor = typeof parsed.customColor === 'string' && isValidHex(parsed.customColor)
      ? parsed.customColor
      : undefined;
    return {
      mode: parsed.mode === 'dark' ? 'dark' : 'light',
      color,
      customColor,
      sidebarCompact: Boolean(parsed.sidebarCompact),
    };
  } catch {
    return fallback;
  }
}

interface AppState {
  user: AppUser;
  theme: AppTheme;
  sidebarOpen: boolean;
  aiAgentOpen: boolean;
  currentPage: string;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
}

type Action =
  | { type: 'SET_USER'; payload: AppUser }
  | { type: 'SET_PAGE'; payload: string }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_AI_AGENT' }
  | { type: 'SET_THEME'; payload: Partial<AppTheme> }
  | { type: 'SHOW_NOTIFICATION'; payload: { message: string; type: 'success' | 'error' | 'info' } }
  | { type: 'CLEAR_NOTIFICATION' };

const defaultUser: AppUser = {
  id: '',
  name: '',
  role: 'admin',
};

const initialState: AppState = {
  user: defaultUser,
  theme: loadStoredTheme(),
  sidebarOpen: true,
  aiAgentOpen: false,
  currentPage: 'dashboard',
  notification: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER': return { ...state, user: action.payload };
    case 'SET_PAGE': return { ...state, currentPage: action.payload };
    case 'TOGGLE_SIDEBAR': return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'TOGGLE_AI_AGENT': return { ...state, aiAgentOpen: !state.aiAgentOpen };
    case 'SET_THEME': return { ...state, theme: { ...state.theme, ...action.payload } };
    case 'SHOW_NOTIFICATION': return { ...state, notification: action.payload };
    case 'CLEAR_NOTIFICATION': return { ...state, notification: null };
    default: return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  navigate: (page: string) => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const root = document.documentElement;

    // === DARK MODE ===
    // Sets data-theme="dark" on <html>, which is the selector every
    // dark-mode rule in index.css is keyed on.
    root.setAttribute('data-theme', state.theme.mode);

    // === SIDEBAR ===
    root.setAttribute('data-sidebar-compact', String(state.theme.sidebarCompact));

    // === BRAND COLOR ===
    if (state.theme.color === 'custom' && state.theme.customColor) {
      const shades = generateBrandShades(state.theme.customColor);
      root.setAttribute('data-theme-color', 'custom');
      root.style.setProperty('--brand-50', shades[50]);
      root.style.setProperty('--brand-100', shades[100]);
      root.style.setProperty('--brand-500', shades[500]);
      root.style.setProperty('--brand-600', shades[600]);
      root.style.setProperty('--brand-700', shades[700]);
      root.style.setProperty('--brand-900', shades[900]);
    } else {
      root.setAttribute('data-theme-color', state.theme.color);
      BRAND_VARS.forEach(v => root.style.removeProperty(v));
    }

    // === PERSIST ===
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state.theme));
    } catch {
      // localStorage unavailable (SSR, privacy mode, etc.)
    }
  }, [state.theme]);

  const navigate = useCallback((page: string) => {
  dispatch({ type: 'SET_PAGE', payload: page });
}, []);

const notify = useCallback(
  (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    dispatch({
      type: 'SHOW_NOTIFICATION',
      payload: { message, type },
    });

    setTimeout(() => {
      dispatch({ type: 'CLEAR_NOTIFICATION' });
    }, 3500);
  },
  []
);

  return (
    <AppContext.Provider value={{ state, dispatch, navigate, notify }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export type { AppUser, UserRole };