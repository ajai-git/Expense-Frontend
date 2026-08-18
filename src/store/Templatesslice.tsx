/**
 * Templates slice — feature-level store for the Expense Templates page.
 *
 * Same Context + useReducer pattern as `categoriesSlice` / `expenseNamesSlice`.
 */
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { ExpenseTemplate } from '../types';
import {
  templatesApi,
  CreateTemplatePayload,
  UpdateTemplatePayload,
} from '../lib/templatesApi';
import { useApp } from './AppContext';
import { EMPTY_TEMPLATE_FORM, TemplateForm } from './Templatesslice.constants';


interface TemplatesState {
  items: ExpenseTemplate[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  previewTemplate: ExpenseTemplate | null;
  addModalOpen: boolean;
  form: TemplateForm;
}

type TemplatesAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: ExpenseTemplate[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'OPEN_PREVIEW'; payload: ExpenseTemplate }
  | { type: 'CLOSE_PREVIEW' }
  | { type: 'OPEN_ADD_MODAL' }
  | { type: 'CLOSE_ADD_MODAL' }
  | { type: 'SET_FORM'; payload: Partial<TemplateForm> }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_END' }
  | { type: 'UPSERT_ITEM'; payload: ExpenseTemplate };

const initialState: TemplatesState = {
  items: [],
  loading: true,
  saving: false,
  error: null,
  previewTemplate: null,
  addModalOpen: false,
  form: EMPTY_TEMPLATE_FORM,
};

function reducer(state: TemplatesState, action: TemplatesAction): TemplatesState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, items: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'OPEN_PREVIEW':
      return { ...state, previewTemplate: action.payload };
    case 'CLOSE_PREVIEW':
      return { ...state, previewTemplate: null };
    case 'OPEN_ADD_MODAL':
      return { ...state, addModalOpen: true, form: EMPTY_TEMPLATE_FORM };
    case 'CLOSE_ADD_MODAL':
      return { ...state, addModalOpen: false };
    case 'SET_FORM':
      return { ...state, form: { ...state.form, ...action.payload } };
    case 'SAVE_START':
      return { ...state, saving: true };
    case 'SAVE_END':
      return { ...state, saving: false };
    case 'UPSERT_ITEM': {
      const exists = state.items.some(i => i.id === action.payload.id);
      const items = exists
        ? state.items.map(i => (i.id === action.payload.id ? action.payload : i))
        : [...state.items, action.payload];
      return { ...state, items };
    }
    default:
      return state;
  }
}

interface TemplatesContextValue {
  state: TemplatesState;
  openPreview: (t: ExpenseTemplate) => void;
  closePreview: () => void;
  openAddModal: () => void;
  closeAddModal: () => void;
  setForm: (patch: Partial<TemplateForm>) => void;
  refresh: () => Promise<void>;
  save: () => Promise<boolean>;
  toggleActive: (t: ExpenseTemplate) => Promise<void>;
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null);

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { notify } = useApp();

  const refresh = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const data = await templatesApi.list(false);
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load templates';
      dispatch({ type: 'FETCH_ERROR', payload: message });
      notify(message, 'error');
    }
  }, [notify]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPreview = (t: ExpenseTemplate) => dispatch({ type: 'OPEN_PREVIEW', payload: t });
  const closePreview = () => dispatch({ type: 'CLOSE_PREVIEW' });
  const openAddModal = () => dispatch({ type: 'OPEN_ADD_MODAL' });
  const closeAddModal = () => dispatch({ type: 'CLOSE_ADD_MODAL' });

  const setForm = (patch: Partial<TemplateForm>) =>
    dispatch({ type: 'SET_FORM', payload: patch });

  const save = useCallback(async (): Promise<boolean> => {
    const { form } = state;
    if (!form.template_code.trim() || !form.template_name.trim()) {
      notify('Code and name required', 'error');
      return false;
    }

    dispatch({ type: 'SAVE_START' });
    try {
      const payload: CreateTemplatePayload = {
        template_code: form.template_code.toUpperCase().trim(),
        template_name: form.template_name.trim(),
        active: true,
      };
      const created = await templatesApi.create(payload);
      dispatch({ type: 'UPSERT_ITEM', payload: created });
      notify('Template created');
      dispatch({ type: 'CLOSE_ADD_MODAL' });
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Save failed';
      notify(message, 'error');
      return false;
    } finally {
      dispatch({ type: 'SAVE_END' });
    }
  }, [state, notify]);

  const toggleActive = useCallback(
    async (t: ExpenseTemplate) => {
      try {
        const updated = await templatesApi.update(t.id, {
          active: !t.active,
        } as UpdateTemplatePayload);
        dispatch({ type: 'UPSERT_ITEM', payload: updated });
        notify(`Template ${!t.active ? 'activated' : 'deactivated'}`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Update failed';
        notify(message, 'error');
      }
    },
    [notify]
  );

  const value: TemplatesContextValue = {
    state,
    openPreview,
    closePreview,
    openAddModal,
    closeAddModal,
    setForm,
    refresh,
    save,
    toggleActive,
  };

  return <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>;
}

export function useTemplates() {
  const ctx = useContext(TemplatesContext);
  if (!ctx) throw new Error('useTemplates must be used inside TemplatesProvider');
  return ctx;
}